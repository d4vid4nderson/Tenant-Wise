import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Profile, ProfileUpdate, TIER_LIMITS } from '@/types/database';
import type { ApiResponse } from '@/types/forms';

// GET /api/profile - Get current user's profile
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

    // Fetch profile
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<Profile>>({ success: true, data });
  } catch (error) {
    console.error('Error in GET /api/profile:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/profile - Update current user's profile
export async function PUT(request: NextRequest) {
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
    const { full_name } = body;

    // Build update object (only allow updating certain fields)
    const updateData: ProfileUpdate = {
      updated_at: new Date().toISOString(),
    };
    if (full_name !== undefined) updateData.full_name = full_name;

    // Update profile
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<Profile>>({ success: true, data });
  } catch (error) {
    console.error('Error in PUT /api/profile:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
