import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Property, PropertyInsert } from '@/types/database';
import type { PropertyFilters, ApiResponse, PaginatedResponse } from '@/types/forms';

// GET /api/properties - List properties with optional filtering
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
    const propertyType = searchParams.get('propertyType');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const search = searchParams.get('search');

    // Build query
    let query = supabase
      .from('properties')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (propertyType) {
      query = query.eq('property_type', propertyType);
    }
    if (city) {
      query = query.ilike('city', `%${city}%`);
    }
    if (state) {
      query = query.eq('state', state);
    }
    if (search) {
      query = query.or(`address_line1.ilike.%${search}%,city.ilike.%${search}%`);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching properties:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Failed to fetch properties' },
        { status: 500 }
      );
    }

    const response: PaginatedResponse<Property> = {
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };

    return NextResponse.json<ApiResponse<PaginatedResponse<Property>>>(
      { success: true, data: response }
    );
  } catch (error) {
    console.error('Error in GET /api/properties:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/properties - Create a new property
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
    const { address_line1, address_line2, city, state = 'TX', zip, unit_count, property_type, notes, latitude, longitude, monthly_rent, market_rent, image_url } = body;

    // Validate required fields
    if (!address_line1 || !city || !zip) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Missing required fields: address_line1, city, zip' },
        { status: 400 }
      );
    }

    // Create property
    const propertyData: PropertyInsert = {
      user_id: user.id,
      address_line1,
      address_line2: address_line2 || null,
      city,
      state,
      zip,
      unit_count: unit_count || 1,
      property_type: property_type || null,
      notes: notes || null,
      latitude: latitude || null,
      longitude: longitude || null,
      monthly_rent: monthly_rent || null,
      market_rent: market_rent || null,
      image_url: image_url || null,
    };

    const { data, error } = await supabase
      .from('properties')
      .insert(propertyData)
      .select()
      .single();

    if (error) {
      console.error('Error creating property:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Failed to create property' },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<Property>>(
      { success: true, data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/properties:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
