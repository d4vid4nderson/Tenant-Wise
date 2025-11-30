import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/invoices - Get all invoices for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query params for filtering
    const searchParams = request.nextUrl.searchParams;
    const contractorId = searchParams.get('contractor_id');
    const status = searchParams.get('status');
    const propertyId = searchParams.get('property_id');

    let query = supabase
      .from('invoices')
      .select(`
        *,
        contractor:contractors(id, name, company_name),
        property:properties(id, address_line1, city)
      `)
      .eq('user_id', user.id)
      .order('invoice_date', { ascending: false });

    if (contractorId) {
      query = query.eq('contractor_id', contractorId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching invoices:', error);
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in GET /api/invoices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/invoices - Create a new invoice
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      contractor_id,
      property_id,
      invoice_number,
      description,
      amount,
      status,
      invoice_date,
      due_date,
      paid_date,
      notes,
    } = body;

    if (!contractor_id || !description || !amount) {
      return NextResponse.json(
        { error: 'Contractor, description, and amount are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        user_id: user.id,
        contractor_id,
        property_id: property_id || null,
        invoice_number: invoice_number || null,
        description,
        amount,
        status: status || 'unpaid',
        invoice_date: invoice_date || new Date().toISOString().split('T')[0],
        due_date: due_date || null,
        paid_date: paid_date || null,
        notes: notes || null,
      })
      .select(`
        *,
        contractor:contractors(id, name, company_name),
        property:properties(id, address_line1, city)
      `)
      .single();

    if (error) {
      console.error('Error creating invoice:', error);
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in POST /api/invoices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
