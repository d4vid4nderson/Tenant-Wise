import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Tenant, TenantUpdate, TenantWithProperty } from '@/types/database';
import type { ApiResponse } from '@/types/forms';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/tenants/[id] - Get a single tenant
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

    // Check if property data should be included
    const includeProperty = request.nextUrl.searchParams.get('includeProperty') === 'true';

    // Fetch tenant with optional property data
    const { data, error } = await supabase
      .from('tenants')
      .select(includeProperty ? '*, property:properties(*)' : '*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'Tenant not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching tenant:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Failed to fetch tenant' },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<Tenant | TenantWithProperty>>({ success: true, data: data as unknown as Tenant | TenantWithProperty });
  } catch (error) {
    console.error('Error in GET /api/tenants/[id]:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/tenants/[id] - Update a tenant
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
    const {
      property_id,
      first_name,
      last_name,
      email,
      phone,
      lease_start,
      lease_end,
      rent_amount,
      security_deposit,
      status,
      notes,
      // Screening fields
      date_of_birth,
      ssn_last_four,
      drivers_license,
      current_employer,
      employer_phone,
      annual_income,
      previous_address,
      previous_landlord_name,
      previous_landlord_phone,
      move_in_date,
      application_status,
      emergency_contact_name,
      emergency_contact_phone,
      number_of_occupants,
      // Pet fields
      has_pets,
      pets,
    } = body;

    // If property_id provided, verify it belongs to user
    if (property_id) {
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('id')
        .eq('id', property_id)
        .eq('user_id', user.id)
        .single();

      if (propertyError || !property) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'Property not found or not owned by user' },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updateData: TenantUpdate = {
      updated_at: new Date().toISOString(),
    };

    // Basic fields
    if (property_id !== undefined) updateData.property_id = property_id || null;
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (email !== undefined) updateData.email = email || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (lease_start !== undefined) updateData.lease_start = lease_start || null;
    if (lease_end !== undefined) updateData.lease_end = lease_end || null;
    if (rent_amount !== undefined) updateData.rent_amount = rent_amount;
    if (security_deposit !== undefined) updateData.security_deposit = security_deposit;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes || null;

    // Screening fields
    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth || null;
    if (ssn_last_four !== undefined) updateData.ssn_last_four = ssn_last_four || null;
    if (drivers_license !== undefined) updateData.drivers_license = drivers_license || null;
    if (current_employer !== undefined) updateData.current_employer = current_employer || null;
    if (employer_phone !== undefined) updateData.employer_phone = employer_phone || null;
    if (annual_income !== undefined) updateData.annual_income = annual_income;
    if (previous_address !== undefined) updateData.previous_address = previous_address || null;
    if (previous_landlord_name !== undefined) updateData.previous_landlord_name = previous_landlord_name || null;
    if (previous_landlord_phone !== undefined) updateData.previous_landlord_phone = previous_landlord_phone || null;
    if (move_in_date !== undefined) updateData.move_in_date = move_in_date || null;
    if (application_status !== undefined) updateData.application_status = application_status || null;
    if (emergency_contact_name !== undefined) updateData.emergency_contact_name = emergency_contact_name || null;
    if (emergency_contact_phone !== undefined) updateData.emergency_contact_phone = emergency_contact_phone || null;
    if (number_of_occupants !== undefined) updateData.number_of_occupants = number_of_occupants;

    // Pet fields
    if (has_pets !== undefined) updateData.has_pets = has_pets;
    if (pets !== undefined) updateData.pets = pets;

    // Update tenant
    const { data, error } = await supabase
      .from('tenants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'Tenant not found' },
          { status: 404 }
        );
      }
      console.error('Error updating tenant:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Failed to update tenant' },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<Tenant>>({ success: true, data });
  } catch (error) {
    console.error('Error in PUT /api/tenants/[id]:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/tenants/[id] - Delete a tenant
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

    // Delete tenant (documents will have tenant_id set to null due to ON DELETE SET NULL)
    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting tenant:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Failed to delete tenant' },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<{ deleted: boolean }>>(
      { success: true, data: { deleted: true } }
    );
  } catch (error) {
    console.error('Error in DELETE /api/tenants/[id]:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
