import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/invoices/[id] - Get a single invoice
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        contractor:contractors(id, name, company_name),
        property:properties(id, address_line1, city)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in GET /api/invoices/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/invoices/[id] - Update an invoice
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Auto-set paid_date when status changes to paid
    let finalPaidDate = paid_date;
    if (status === 'paid' && !paid_date) {
      finalPaidDate = new Date().toISOString().split('T')[0];
    } else if (status !== 'paid') {
      finalPaidDate = null;
    }

    const { data, error } = await supabase
      .from('invoices')
      .update({
        contractor_id,
        property_id: property_id || null,
        invoice_number: invoice_number || null,
        description,
        amount,
        status,
        invoice_date,
        due_date: due_date || null,
        paid_date: finalPaidDate,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`
        *,
        contractor:contractors(id, name, company_name),
        property:properties(id, address_line1, city)
      `)
      .single();

    if (error) {
      console.error('Error updating invoice:', error);
      return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in PUT /api/invoices/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/invoices/[id] - Delete an invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting invoice:', error);
      return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/invoices/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
