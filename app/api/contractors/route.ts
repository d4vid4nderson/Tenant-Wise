import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface Contractor {
  id: string;
  user_id: string;
  name: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  specialty: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// GET /api/contractors - List all contractors for the user
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('contractors')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching contractors:', error);
      return NextResponse.json({ error: 'Failed to fetch contractors' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in GET /api/contractors:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/contractors - Create a new contractor
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, company_name, phone, email, specialty, notes } = body;

    if (!name || !specialty) {
      return NextResponse.json(
        { error: 'Name and specialty are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('contractors')
      .insert({
        user_id: user.id,
        name,
        company_name: company_name || null,
        phone: phone || null,
        email: email || null,
        specialty,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating contractor:', error);
      return NextResponse.json({ error: 'Failed to create contractor' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/contractors:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
