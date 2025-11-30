import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Tenant, TenantInsert, TenantWithProperty } from '@/types/database';
import type { TenantFilters, ApiResponse, PaginatedResponse } from '@/types/forms';

// GET /api/tenants - List tenants with optional filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const propertyId = searchParams.get('propertyId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const includeProperty = searchParams.get('includeProperty') === 'true';

    // Build query
    let query = supabase
      .from('tenants')
      .select(includeProperty ? '*, property:properties(*)' : '*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching tenants:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Failed to fetch tenants' },
        { status: 500 }
      );
    }

    const response: PaginatedResponse<Tenant | TenantWithProperty> = {
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };

    return NextResponse.json<ApiResponse<PaginatedResponse<Tenant | TenantWithProperty>>>(
      { success: true, data: response }
    );
  } catch (error) {
    console.error('Error in GET /api/tenants:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tenants - Create a new tenant
export async function POST(request: NextRequest) {
  try {
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
      status = 'active',
      notes,
    } = body;

    // Validate required fields
    if (!first_name || !last_name) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Missing required fields: first_name, last_name' },
        { status: 400 }
      );
    }

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

    // Create tenant
    const tenantData: TenantInsert = {
      user_id: user.id,
      property_id: property_id || null,
      first_name,
      last_name,
      email: email || null,
      phone: phone || null,
      lease_start: lease_start || null,
      lease_end: lease_end || null,
      rent_amount: rent_amount || null,
      security_deposit: security_deposit || null,
      status,
      notes: notes || null,
    };

    const { data, error } = await supabase
      .from('tenants')
      .insert(tenantData)
      .select()
      .single();

    if (error) {
      console.error('Error creating tenant:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Failed to create tenant' },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<Tenant>>(
      { success: true, data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/tenants:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
