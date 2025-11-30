import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Property, PropertyUpdate } from '@/types/database';
import type { ApiResponse } from '@/types/forms';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/properties/[id] - Get a single property
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch property with tenant count
    const { data, error } = await supabase
      .from('properties')
      .select('*, tenants(count)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'Property not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching property:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Failed to fetch property' },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<Property>>({ success: true, data });
  } catch (error) {
    console.error('Error in GET /api/properties/[id]:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/properties/[id] - Update a property
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { address_line1, address_line2, city, state, zip, unit_count, property_type, status, notes, description, monthly_rent, market_rent, image_url, latitude, longitude, bedrooms, bathrooms, sqft, rent_due_day } = body;

    // Build update object
    const updateData: PropertyUpdate = {
      updated_at: new Date().toISOString(),
    };
    if (address_line1 !== undefined) updateData.address_line1 = address_line1;
    if (address_line2 !== undefined) updateData.address_line2 = address_line2;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (zip !== undefined) updateData.zip = zip;
    if (unit_count !== undefined) updateData.unit_count = unit_count;
    if (property_type !== undefined) updateData.property_type = property_type;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (description !== undefined) updateData.description = description;
    if (monthly_rent !== undefined) updateData.monthly_rent = monthly_rent;
    if (market_rent !== undefined) updateData.market_rent = market_rent;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    if (bedrooms !== undefined) updateData.bedrooms = bedrooms;
    if (bathrooms !== undefined) updateData.bathrooms = bathrooms;
    if (sqft !== undefined) updateData.sqft = sqft;
    if (rent_due_day !== undefined) updateData.rent_due_day = rent_due_day;

    // Update property
    const { data, error } = await supabase
      .from('properties')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'Property not found' },
          { status: 404 }
        );
      }
      console.error('Error updating property:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Failed to update property' },
        { status: 500 }
      );
    }

    // Save rent history snapshot if rent values were updated
    if (monthly_rent !== undefined && data.monthly_rent) {
      try {
        // Check if we already have a record for today
        const today = new Date().toISOString().split('T')[0];
        const { data: existingToday } = await supabase
          .from('rent_history')
          .select('id')
          .eq('property_id', id)
          .gte('recorded_at', today)
          .lt('recorded_at', new Date(new Date(today).getTime() + 86400000).toISOString().split('T')[0]);

        if (existingToday && existingToday.length > 0) {
          // Update today's record
          await supabase
            .from('rent_history')
            .update({
              monthly_rent: data.monthly_rent,
              market_rent: data.market_rent || null,
            })
            .eq('id', existingToday[0].id);
        } else {
          // Insert new rent history record
          await supabase
            .from('rent_history')
            .insert({
              property_id: id,
              monthly_rent: data.monthly_rent,
              market_rent: data.market_rent || null,
            });
        }
      } catch (historyError) {
        // Log but don't fail the main update
        console.error('Error saving rent history:', historyError);
      }
    }

    return NextResponse.json<ApiResponse<Property>>({ success: true, data });
  } catch (error) {
    console.error('Error in PUT /api/properties/[id]:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/properties/[id] - Delete a property
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete property (tenants will have property_id set to null due to ON DELETE SET NULL)
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting property:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Failed to delete property' },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<{ deleted: boolean }>>(
      { success: true, data: { deleted: true } }
    );
  } catch (error) {
    console.error('Error in DELETE /api/properties/[id]:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
