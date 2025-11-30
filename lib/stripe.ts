import Stripe from 'stripe';

// Initialize Stripe with the secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});

// Subscription plan configuration
export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free',
    description: 'Get started with basic document generation',
    price: 0,
    priceId: null, // No Stripe price for free tier
    features: [
      '3 documents per month',
      'Late rent notices',
      'Move-in/out checklists',
      'Maintenance responses',
      'Generic PDF downloads',
    ],
    limits: {
      documentsPerMonth: 3,
      properties: 1,
      tenants: 5,
    },
  },
  basic: {
    name: 'Basic',
    description: 'Unlimited documents for single-property landlords',
    price: 1900, // $19.00 in cents
    priceId: process.env.STRIPE_BASIC_PRICE_ID,
    features: [
      'Unlimited documents',
      'All document types',
      'Legal AI assistant',
      'Document history',
      'Email support',
    ],
    limits: {
      documentsPerMonth: null, // unlimited
      properties: 1,
      tenants: 1,
    },
  },
  pro: {
    name: 'Pro',
    description: 'Full-featured for professional landlords',
    price: 3900, // $39.00 in cents
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: [
      'Everything in Basic',
      'Unlimited properties',
      'Tenant profiles & history',
      'Rent collection (ACH)',
      'Priority support',
      'API access',
    ],
    limits: {
      documentsPerMonth: null, // unlimited
      properties: null, // unlimited
      tenants: null, // unlimited
    },
  },
} as const;

export type SubscriptionPlanKey = keyof typeof SUBSCRIPTION_PLANS;

// ACH rent collection configuration
export const ACH_CONFIG = {
  // Stripe ACH fees
  feePercentage: 0.008, // 0.8%
  feeCap: 500, // $5.00 cap in cents

  // Calculate fee for a given amount (in cents)
  calculateFee: (amountCents: number): number => {
    const calculatedFee = Math.round(amountCents * ACH_CONFIG.feePercentage);
    return Math.min(calculatedFee, ACH_CONFIG.feeCap);
  },

  // Who pays the fee options
  feePayerOptions: ['landlord', 'tenant', 'split'] as const,
};

// Helper functions

/**
 * Create a Stripe customer for a user
 */
export async function createStripeCustomer(
  email: string,
  name?: string,
  metadata?: Record<string, string>
): Promise<Stripe.Customer> {
  return stripe.customers.create({
    email,
    name,
    metadata: {
      ...metadata,
      source: 'landlord-ai',
    },
  });
}

/**
 * Create a checkout session for subscription
 */
export async function createSubscriptionCheckout(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  metadata?: Record<string, string>
): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    subscription_data: {
      metadata,
    },
    allow_promotion_codes: true,
  });
}

/**
 * Create a customer portal session for managing subscription
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> {
  if (cancelAtPeriodEnd) {
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }
  return stripe.subscriptions.cancel(subscriptionId);
}

/**
 * Get subscription details
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId);
}

// ACH / Rent Collection Functions

/**
 * Create a Setup Intent for ACH bank account
 * This allows tenants to save their bank account for recurring rent payments
 */
export async function createACHSetupIntent(
  customerId: string,
  metadata?: Record<string, string>
): Promise<Stripe.SetupIntent> {
  return stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['us_bank_account'],
    payment_method_options: {
      us_bank_account: {
        financial_connections: {
          permissions: ['payment_method', 'balances'],
        },
        verification_method: 'instant',
      },
    },
    metadata,
  });
}

/**
 * Create a Payment Intent for ACH rent collection
 */
export async function createRentPaymentIntent(
  amount: number, // in cents
  customerId: string,
  paymentMethodId: string,
  metadata: {
    landlordId: string;
    tenantId: string;
    propertyId: string;
    rentPeriod: string;
    description?: string;
  }
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    customer: customerId,
    payment_method: paymentMethodId,
    payment_method_types: ['us_bank_account'],
    confirm: true,
    mandate_data: {
      customer_acceptance: {
        type: 'online',
        online: {
          ip_address: '0.0.0.0', // Should be passed from request
          user_agent: 'LandlordAI', // Should be passed from request
        },
      },
    },
    metadata: {
      type: 'rent_payment',
      ...metadata,
    },
  });
}

/**
 * List saved payment methods for a customer
 */
export async function listPaymentMethods(
  customerId: string,
  type: 'card' | 'us_bank_account' = 'us_bank_account'
): Promise<Stripe.PaymentMethod[]> {
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type,
  });
  return paymentMethods.data;
}

/**
 * Create a connected account for a landlord (for rent collection payouts)
 * This allows landlords to receive rent payments directly
 */
export async function createConnectedAccount(
  email: string,
  metadata?: Record<string, string>
): Promise<Stripe.Account> {
  return stripe.accounts.create({
    type: 'express',
    country: 'US',
    email,
    capabilities: {
      transfers: { requested: true },
    },
    metadata: {
      ...metadata,
      source: 'landlord-ai',
    },
  });
}

/**
 * Create an account link for onboarding a connected account
 */
export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<Stripe.AccountLink> {
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
}

/**
 * Transfer funds to a connected account (landlord payout)
 */
export async function createTransfer(
  amount: number, // in cents
  destinationAccountId: string,
  metadata?: Record<string, string>
): Promise<Stripe.Transfer> {
  return stripe.transfers.create({
    amount,
    currency: 'usd',
    destination: destinationAccountId,
    metadata,
  });
}

// Webhook signature verification
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
