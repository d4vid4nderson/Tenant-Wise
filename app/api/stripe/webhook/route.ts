import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe, constructWebhookEvent } from '@/lib/stripe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Lazy-load Supabase admin client to avoid build-time initialization
let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
    );
  }
  return _supabaseAdmin;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = constructWebhookEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      // Subscription events
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      // ACH / Rent payment events
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        if (paymentIntent.metadata?.type === 'rent_payment') {
          await handleRentPaymentSucceeded(paymentIntent);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        if (paymentIntent.metadata?.type === 'rent_payment') {
          await handleRentPaymentFailed(paymentIntent);
        }
        break;
      }

      // Connected account events
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await handleConnectedAccountUpdate(account);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// Handler functions

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const plan = session.metadata?.plan;

  if (!userId || !plan) {
    console.error('Missing metadata in checkout session');
    return;
  }

  // Update profile with subscription ID
  await getSupabaseAdmin()
    .from('profiles')
    .update({
      subscription_tier: plan,
      stripe_subscription_id: session.subscription as string,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  console.log(`Checkout complete for user ${userId}, plan: ${plan}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Get user by Stripe customer ID
  const { data: profile } = await getSupabaseAdmin()
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('No profile found for customer:', customerId);
    return;
  }

  // Determine tier from price ID
  const priceId = subscription.items.data[0]?.price.id;
  let tier: 'free' | 'basic' | 'pro' = 'free';

  if (priceId === process.env.STRIPE_BASIC_PRICE_ID) {
    tier = 'basic';
  } else if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
    tier = 'pro';
  }

  // Map Stripe status to our status
  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    trialing: 'trialing',
    paused: 'paused',
    incomplete: 'pending',
    incomplete_expired: 'canceled',
    unpaid: 'past_due',
  };

  const status = statusMap[subscription.status] || 'active';

  // Update profile
  await getSupabaseAdmin()
    .from('profiles')
    .update({
      subscription_tier: tier,
      stripe_subscription_id: subscription.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id);

  // Update or create subscription record
  await getSupabaseAdmin()
    .from('subscriptions')
    .upsert({
      user_id: profile.id,
      tier,
      status,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      stripe_customer_id: customerId,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  console.log(`Subscription updated for user ${profile.id}: ${tier} (${status})`);
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Get user by Stripe customer ID
  const { data: profile } = await getSupabaseAdmin()
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('No profile found for customer:', customerId);
    return;
  }

  // Downgrade to free tier
  await getSupabaseAdmin()
    .from('profiles')
    .update({
      subscription_tier: 'free',
      stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id);

  // Update subscription record
  await getSupabaseAdmin()
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  console.log(`Subscription canceled for user ${profile.id}`);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Get user by Stripe customer ID
  const { data: profile } = await getSupabaseAdmin()
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) return;

  // Record payment
  await getSupabaseAdmin().from('payments').insert({
    user_id: profile.id,
    subscription_id: invoice.subscription as string,
    amount: invoice.amount_paid / 100, // Convert cents to dollars
    currency: invoice.currency,
    status: 'succeeded',
    stripe_payment_intent_id: invoice.payment_intent as string,
    description: invoice.description || 'Subscription payment',
    receipt_url: invoice.hosted_invoice_url,
  });

  console.log(`Payment recorded for user ${profile.id}: $${invoice.amount_paid / 100}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Get user by Stripe customer ID
  const { data: profile } = await getSupabaseAdmin()
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) return;

  // Record failed payment
  await getSupabaseAdmin().from('payments').insert({
    user_id: profile.id,
    subscription_id: invoice.subscription as string,
    amount: invoice.amount_due / 100,
    currency: invoice.currency,
    status: 'failed',
    stripe_payment_intent_id: invoice.payment_intent as string,
    description: 'Failed subscription payment',
  });

  // Update subscription status
  await getSupabaseAdmin()
    .from('profiles')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', profile.id);

  console.log(`Payment failed for user ${profile.id}`);
}

async function handleRentPaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { landlordId, tenantId, propertyId } = paymentIntent.metadata;

  // Update rent payment record
  await getSupabaseAdmin()
    .from('rent_payments')
    .update({
      status: 'succeeded',
      stripe_charge_id: paymentIntent.latest_charge as string,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  console.log(`Rent payment succeeded: ${paymentIntent.id}`);
}

async function handleRentPaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const failureMessage =
    paymentIntent.last_payment_error?.message || 'Payment failed';

  await getSupabaseAdmin()
    .from('rent_payments')
    .update({
      status: 'failed',
      failure_reason: failureMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  console.log(`Rent payment failed: ${paymentIntent.id} - ${failureMessage}`);
}

async function handleConnectedAccountUpdate(account: Stripe.Account) {
  // Update connected account record
  await getSupabaseAdmin()
    .from('connected_accounts')
    .update({
      account_status: account.charges_enabled ? 'active' : 'pending',
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      onboarding_complete: account.details_submitted && account.charges_enabled,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_account_id', account.id);

  // Also update the profile
  await getSupabaseAdmin()
    .from('profiles')
    .update({
      stripe_connected_account_id: account.id,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_connected_account_id', account.id);

  console.log(`Connected account updated: ${account.id}`);
}
