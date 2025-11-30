import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  stripe,
  createRentPaymentIntent,
  ACH_CONFIG,
} from '@/lib/stripe';

// POST - Create a rent payment
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check subscription tier
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, stripe_connected_account_id')
      .eq('id', user.id)
      .single();

    if (profile?.subscription_tier !== 'pro') {
      return NextResponse.json(
        { error: 'Rent collection requires Pro subscription' },
        { status: 403 }
      );
    }

    if (!profile?.stripe_connected_account_id) {
      return NextResponse.json(
        { error: 'Please complete payment account setup first' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      tenantId,
      propertyId,
      paymentMethodId,
      amount, // in dollars
      feePayer = 'landlord',
      rentPeriodStart,
      rentPeriodEnd,
      dueDate,
      description,
    } = body;

    // Validate required fields
    if (!tenantId || !paymentMethodId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, paymentMethodId, amount' },
        { status: 400 }
      );
    }

    // Get tenant and verify ownership
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .eq('user_id', user.id)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Get payment method and verify ownership
    const { data: paymentMethod, error: pmError } = await supabase
      .from('tenant_payment_methods')
      .select('*')
      .eq('id', paymentMethodId)
      .eq('landlord_id', user.id)
      .single();

    if (pmError || !paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method not found' },
        { status: 404 }
      );
    }

    // Calculate amounts in cents
    const amountCents = Math.round(amount * 100);
    const feeAmount = ACH_CONFIG.calculateFee(amountCents);

    let chargeAmount = amountCents;
    let netAmount = amountCents - feeAmount;

    // Adjust based on who pays the fee
    if (feePayer === 'tenant') {
      chargeAmount = amountCents + feeAmount;
      netAmount = amountCents;
    } else if (feePayer === 'split') {
      const halfFee = Math.round(feeAmount / 2);
      chargeAmount = amountCents + halfFee;
      netAmount = amountCents - halfFee;
    }

    // Create rent payment record first
    const { data: rentPayment, error: rpError } = await supabase
      .from('rent_payments')
      .insert({
        landlord_id: user.id,
        tenant_id: tenantId,
        property_id: propertyId || tenant.property_id,
        payment_method_id: paymentMethodId,
        amount: chargeAmount,
        fee_amount: feeAmount,
        net_amount: netAmount,
        fee_payer: feePayer,
        status: 'pending',
        rent_period_start: rentPeriodStart,
        rent_period_end: rentPeriodEnd,
        due_date: dueDate,
        description: description || `Rent payment for ${tenant.first_name} ${tenant.last_name}`,
      })
      .select()
      .single();

    if (rpError) {
      return NextResponse.json(
        { error: 'Failed to create payment record' },
        { status: 500 }
      );
    }

    try {
      // Create payment intent
      const paymentIntent = await createRentPaymentIntent(
        chargeAmount,
        paymentMethod.stripe_customer_id,
        paymentMethod.stripe_payment_method_id,
        {
          landlordId: user.id,
          tenantId,
          propertyId: propertyId || tenant.property_id || '',
          rentPeriod: `${rentPeriodStart || ''} to ${rentPeriodEnd || ''}`,
          description: description || 'Rent payment',
        }
      );

      // Update rent payment with Stripe payment intent ID
      await supabase
        .from('rent_payments')
        .update({
          stripe_payment_intent_id: paymentIntent.id,
          status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'processing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', rentPayment.id);

      return NextResponse.json({
        success: true,
        paymentId: rentPayment.id,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: chargeAmount / 100,
        fee: feeAmount / 100,
        netAmount: netAmount / 100,
      });
    } catch (stripeError: any) {
      // Update rent payment with failure
      await supabase
        .from('rent_payments')
        .update({
          status: 'failed',
          failure_reason: stripeError.message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rentPayment.id);

      return NextResponse.json(
        { error: stripeError.message || 'Payment failed' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Rent payment error:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}

// GET - List rent payments
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const propertyId = searchParams.get('propertyId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const offset = (page - 1) * pageSize;

    // Build query
    let query = supabase
      .from('rent_payments')
      .select('*, tenants(*), properties(*)', { count: 'exact' })
      .eq('landlord_id', user.id)
      .order('created_at', { ascending: false });

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query.range(offset, offset + pageSize - 1);

    const { data: payments, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch payments' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: payments,
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    });
  } catch (error) {
    console.error('List rent payments error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}
