import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  stripe,
  createStripeCustomer,
  createSubscriptionCheckout,
  SUBSCRIPTION_PLANS,
  SubscriptionPlanKey,
} from '@/lib/stripe';

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

    const body = await request.json();
    const { plan } = body as { plan: SubscriptionPlanKey };

    // Validate plan
    if (!plan || !SUBSCRIPTION_PLANS[plan]) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    const selectedPlan = SUBSCRIPTION_PLANS[plan];

    // Free plan doesn't need checkout
    if (plan === 'free' || !selectedPlan.priceId) {
      return NextResponse.json(
        { error: 'Free plan does not require checkout' },
        { status: 400 }
      );
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    let stripeCustomerId = profile.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      const customer = await createStripeCustomer(
        user.email!,
        profile.full_name || undefined,
        { user_id: user.id }
      );
      stripeCustomerId = customer.id;

      // Save Stripe customer ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id);
    }

    // Create checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const session = await createSubscriptionCheckout(
      stripeCustomerId,
      selectedPlan.priceId,
      `${appUrl}/dashboard?checkout=success`,
      `${appUrl}/dashboard?checkout=canceled`,
      {
        user_id: user.id,
        plan,
      }
    );

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
