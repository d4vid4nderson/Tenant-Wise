import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RentHistoryRecord {
  id: string;
  property_id: string;
  monthly_rent: number;
  market_rent: number | null;
  recorded_at: string;
}

// GET /api/rent-history?propertyId=xxx - Get rent history for a property
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const propertyId = searchParams.get('propertyId');

    if (!propertyId) {
      return NextResponse.json(
        { success: false, error: 'Property ID is required' },
        { status: 400 }
      );
    }

    // Verify the property belongs to the user
    const { data: property } = await supabase
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('user_id', user.id)
      .single();

    if (!property) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      );
    }

    // Fetch rent history
    const { data, error } = await supabase
      .from('rent_history')
      .select('*')
      .eq('property_id', propertyId)
      .order('recorded_at', { ascending: true });

    if (error) {
      console.error('Error fetching rent history:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch rent history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error('Error in GET /api/rent-history:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/rent-history - Add a rent history record
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { property_id, monthly_rent, market_rent } = body;

    if (!property_id || monthly_rent === undefined) {
      return NextResponse.json(
        { success: false, error: 'Property ID and monthly rent are required' },
        { status: 400 }
      );
    }

    // Verify the property belongs to the user
    const { data: property } = await supabase
      .from('properties')
      .select('id')
      .eq('id', property_id)
      .eq('user_id', user.id)
      .single();

    if (!property) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      );
    }

    // Check if we already have a record for today (avoid duplicates)
    const today = new Date().toISOString().split('T')[0];
    const { data: existingToday } = await supabase
      .from('rent_history')
      .select('id')
      .eq('property_id', property_id)
      .gte('recorded_at', today)
      .lt('recorded_at', new Date(new Date(today).getTime() + 86400000).toISOString().split('T')[0]);

    if (existingToday && existingToday.length > 0) {
      // Update today's record instead of creating a new one
      const { data, error } = await supabase
        .from('rent_history')
        .update({
          monthly_rent,
          market_rent: market_rent || null,
        })
        .eq('id', existingToday[0].id)
        .select()
        .single();

      if (error) {
        console.error('Error updating rent history:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to update rent history' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, data });
    }

    // Insert new rent history record
    const { data, error } = await supabase
      .from('rent_history')
      .insert({
        property_id,
        monthly_rent,
        market_rent: market_rent || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating rent history:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create rent history' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/rent-history:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
