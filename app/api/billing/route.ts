import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, listPaymentMethods, createPortalSession } from '@/lib/stripe';

// GET - Fetch billing information (payment method, invoices)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with stripe_customer_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, subscription_tier')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // If no Stripe customer, return empty billing info
    if (!profile.stripe_customer_id) {
      return NextResponse.json({
        paymentMethod: null,
        invoices: [],
        subscription: null,
      });
    }

    // Fetch payment methods (cards)
    let paymentMethod = null;
    try {
      const paymentMethods = await listPaymentMethods(profile.stripe_customer_id, 'card');
      if (paymentMethods.length > 0) {
        const pm = paymentMethods[0];
        paymentMethod = {
          id: pm.id,
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          expMonth: pm.card?.exp_month,
          expYear: pm.card?.exp_year,
        };
      }
    } catch (err) {
      console.error('Error fetching payment methods:', err);
    }

    // Fetch invoices
    let invoices: Array<{
      id: string;
      number: string | null;
      status: string | null;
      amount: number;
      currency: string;
      created: number;
      pdfUrl: string | null;
      hostedUrl: string | null;
    }> = [];
    try {
      const invoiceList = await stripe.invoices.list({
        customer: profile.stripe_customer_id,
        limit: 24, // Last 2 years of monthly invoices
      });

      invoices = invoiceList.data.map(inv => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        amount: inv.amount_paid,
        currency: inv.currency,
        created: inv.created,
        pdfUrl: inv.invoice_pdf,
        hostedUrl: inv.hosted_invoice_url,
      }));
    } catch (err) {
      console.error('Error fetching invoices:', err);
    }

    // Fetch active subscription
    let subscription = null;
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: 'active',
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const sub = subscriptions.data[0];
        subscription = {
          id: sub.id,
          status: sub.status,
          currentPeriodStart: sub.current_period_start,
          currentPeriodEnd: sub.current_period_end,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        };
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
    }

    return NextResponse.json({
      paymentMethod,
      invoices,
      subscription,
    });
  } catch (error) {
    console.error('Error in GET /api/billing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a customer portal session
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with stripe_customer_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!profile.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 400 });
    }

    const body = await request.json();
    const { returnUrl } = body;

    // Create a portal session
    const portalSession = await createPortalSession(
      profile.stripe_customer_id,
      returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`
    );

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Error in POST /api/billing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
