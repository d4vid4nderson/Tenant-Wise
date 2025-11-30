import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  stripe,
  createStripeCustomer,
  createACHSetupIntent,
  listPaymentMethods,
} from '@/lib/stripe';

// POST - Create setup intent for tenant bank account
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user (landlord)
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
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (profile?.subscription_tier !== 'pro') {
      return NextResponse.json(
        { error: 'Rent collection requires Pro subscription' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { tenantId } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
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

    // Check if tenant already has a Stripe customer
    const { data: existingPM } = await supabase
      .from('tenant_payment_methods')
      .select('stripe_customer_id')
      .eq('tenant_id', tenantId)
      .limit(1)
      .single();

    let stripeCustomerId = existingPM?.stripe_customer_id;

    // Create Stripe customer for tenant if doesn't exist
    if (!stripeCustomerId) {
      const customer = await createStripeCustomer(
        tenant.email || `tenant-${tenantId}@landlord-ai.local`,
        `${tenant.first_name} ${tenant.last_name}`,
        {
          tenant_id: tenantId,
          landlord_id: user.id,
          type: 'tenant',
        }
      );
      stripeCustomerId = customer.id;
    }

    // Create setup intent for ACH
    const setupIntent = await createACHSetupIntent(stripeCustomerId, {
      tenant_id: tenantId,
      landlord_id: user.id,
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: stripeCustomerId,
    });
  } catch (error) {
    console.error('Create setup intent error:', error);
    return NextResponse.json(
      { error: 'Failed to create setup intent' },
      { status: 500 }
    );
  }
}

// GET - List tenant payment methods
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

    let query = supabase
      .from('tenant_payment_methods')
      .select('*, tenants(*)')
      .eq('landlord_id', user.id);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data: paymentMethods, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch payment methods' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: paymentMethods,
    });
  } catch (error) {
    console.error('List payment methods error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}

// PUT - Confirm and save payment method after setup
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { tenantId, paymentMethodId, customerId, setDefault = true } = body;

    if (!tenantId || !paymentMethodId || !customerId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify tenant ownership
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

    // Get payment method details from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    if (paymentMethod.type !== 'us_bank_account') {
      return NextResponse.json(
        { error: 'Invalid payment method type' },
        { status: 400 }
      );
    }

    const bankAccount = paymentMethod.us_bank_account;

    // If setting as default, unset other defaults
    if (setDefault) {
      await supabase
        .from('tenant_payment_methods')
        .update({ is_default: false })
        .eq('tenant_id', tenantId);
    }

    // Save payment method
    const { data: savedPM, error: saveError } = await supabase
      .from('tenant_payment_methods')
      .upsert({
        tenant_id: tenantId,
        landlord_id: user.id,
        stripe_customer_id: customerId,
        stripe_payment_method_id: paymentMethodId,
        payment_method_type: 'us_bank_account',
        bank_name: bankAccount?.bank_name || null,
        last_four: bankAccount?.last4 || null,
        is_default: setDefault,
        is_verified: true, // Using instant verification via Plaid
      }, {
        onConflict: 'stripe_payment_method_id',
      })
      .select()
      .single();

    if (saveError) {
      return NextResponse.json(
        { error: 'Failed to save payment method' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentMethod: savedPM,
    });
  } catch (error) {
    console.error('Save payment method error:', error);
    return NextResponse.json(
      { error: 'Failed to save payment method' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a payment method
export async function DELETE(request: NextRequest) {
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
    const paymentMethodId = searchParams.get('id');

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    // Get payment method and verify ownership
    const { data: pm, error: pmError } = await supabase
      .from('tenant_payment_methods')
      .select('stripe_payment_method_id')
      .eq('id', paymentMethodId)
      .eq('landlord_id', user.id)
      .single();

    if (pmError || !pm) {
      return NextResponse.json(
        { error: 'Payment method not found' },
        { status: 404 }
      );
    }

    // Detach from Stripe
    try {
      await stripe.paymentMethods.detach(pm.stripe_payment_method_id);
    } catch (e) {
      console.error('Failed to detach from Stripe:', e);
    }

    // Delete from database
    await supabase
      .from('tenant_payment_methods')
      .delete()
      .eq('id', paymentMethodId);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Delete payment method error:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment method' },
      { status: 500 }
    );
  }
}
