'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  FiArrowLeft,
  FiCheck,
  FiZap,
  FiStar,
  FiAward,
  FiLoader,
  FiExternalLink,
} from 'react-icons/fi';

interface Plan {
  id: 'free' | 'basic' | 'pro';
  name: string;
  description: string;
  price: number;
  features: string[];
  limits: {
    documentsPerMonth: number | null;
    properties: number | null;
    tenants: number | null;
  };
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Get started with basic document generation',
    price: 0,
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
  {
    id: 'basic',
    name: 'Basic',
    description: 'Unlimited documents for single-property landlords',
    price: 19,
    features: [
      'Unlimited documents',
      'All document types',
      'Legal AI assistant',
      'Document history',
      'Email support',
      '1 property',
      '1 tenant',
    ],
    limits: {
      documentsPerMonth: null,
      properties: 1,
      tenants: 1,
    },
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Full-featured for professional landlords',
    price: 39,
    features: [
      'Everything in Basic',
      'Unlimited properties',
      'Unlimited tenants',
      'Tenant profiles & history',
      'Rent collection (ACH)',
      'Priority support',
      'API access',
    ],
    limits: {
      documentsPerMonth: null,
      properties: null,
      tenants: null,
    },
  },
];

const planIcons = {
  free: <FiZap className="w-6 h-6" />,
  basic: <FiStar className="w-6 h-6" />,
  pro: <FiAward className="w-6 h-6" />,
};

const planColors = {
  free: {
    border: 'border-gray-200',
    badge: 'bg-gray-100 text-gray-700',
    button: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    icon: 'bg-gray-100 text-gray-600',
  },
  basic: {
    border: 'border-blue-300 ring-2 ring-blue-100',
    badge: 'bg-blue-100 text-blue-700',
    button: 'bg-blue-600 text-white hover:bg-blue-700',
    icon: 'bg-blue-100 text-blue-600',
  },
  pro: {
    border: 'border-amber-300',
    badge: 'bg-gradient-to-r from-amber-400 to-orange-500 text-white',
    button: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600',
    icon: 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-600',
  },
};

export default function PricingPage() {
  const supabase = createClient();
  const [currentTier, setCurrentTier] = useState<'free' | 'basic' | 'pro'>('free');
  const [loading, setLoading] = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [hasStripeCustomer, setHasStripeCustomer] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profile) {
      setCurrentTier((profile.subscription_tier || 'free') as 'free' | 'basic' | 'pro');
      setHasStripeCustomer(!!profile.stripe_customer_id);
    }
    setLoading(false);
  }

  const handleSelectPlan = async (planId: 'free' | 'basic' | 'pro') => {
    if (planId === currentTier) return;

    setUpgradeLoading(planId);

    try {
      if (planId === 'free') {
        // Downgrading to free - redirect to Stripe portal for cancellation
        if (hasStripeCustomer) {
          const response = await fetch('/api/stripe/portal', { method: 'POST' });
          const data = await response.json();
          if (data.url) {
            window.location.href = data.url;
          }
        }
      } else if (currentTier !== 'free' && hasStripeCustomer) {
        // Changing between paid plans - use Stripe portal
        const response = await fetch('/api/stripe/portal', { method: 'POST' });
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        // New subscription - use checkout
        const response = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: planId }),
        });
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        }
      }
    } catch (error) {
      console.error('Error selecting plan:', error);
    } finally {
      setUpgradeLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setUpgradeLoading('manage');
    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error opening portal:', error);
    } finally {
      setUpgradeLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <FiArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
          <p className="text-muted-foreground">
            Select the perfect plan for your rental management needs. Upgrade or downgrade anytime.
          </p>
        </div>
      </div>

      {/* Current Plan Badge */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full shadow-sm">
          <span className="text-sm text-muted-foreground">Current Plan:</span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${planColors[currentTier].badge}`}>
            {plans.find(p => p.id === currentTier)?.name}
          </span>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-8 items-stretch">
        {plans.map((plan) => {
          const isCurrentPlan = plan.id === currentTier;
          const colors = planColors[plan.id];

          return (
            <Card
              key={plan.id}
              className={`relative ${colors.border} ${plan.popular ? 'scale-105 shadow-xl' : 'shadow-md'} transition-all hover:shadow-lg flex flex-col`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3 ${colors.icon}`}>
                  {planIcons[plan.id]}
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </CardHeader>

              <CardContent className="flex flex-col flex-1">
                {/* Price */}
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  {plan.price === 0 && (
                    <p className="text-sm text-muted-foreground mt-1">Free forever</p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 flex-1">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <FiCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isCurrentPlan || upgradeLoading !== null}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 mt-6 ${
                    isCurrentPlan
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : colors.button
                  } disabled:opacity-50`}
                >
                  {upgradeLoading === plan.id ? (
                    <>
                      <FiLoader className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : isCurrentPlan ? (
                    'Current Plan'
                  ) : currentTier === 'free' ? (
                    plan.id === 'free' ? 'Current Plan' : 'Upgrade'
                  ) : plan.id === 'free' ? (
                    'Downgrade'
                  ) : plans.findIndex(p => p.id === plan.id) > plans.findIndex(p => p.id === currentTier) ? (
                    'Upgrade'
                  ) : (
                    'Switch Plan'
                  )}
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Manage Subscription */}
      {hasStripeCustomer && currentTier !== 'free' && (
        <div className="text-center mb-8">
          <button
            onClick={handleManageSubscription}
            disabled={upgradeLoading !== null}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
          >
            {upgradeLoading === 'manage' ? (
              <FiLoader className="w-4 h-4 animate-spin" />
            ) : (
              <FiExternalLink className="w-4 h-4" />
            )}
            Manage Subscription & Billing
          </button>
        </div>
      )}

      {/* FAQ / Info Section */}
      <div className="max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-1">Can I change my plan anytime?</h4>
              <p className="text-sm text-muted-foreground">
                You can change your plan at anytime, changes take effect the following billing cycle.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">What happens to my documents if I downgrade?</h4>
              <p className="text-sm text-muted-foreground">
                All your documents are saved and accessible. On the Free plan, you&apos;ll be limited to 3 new documents per month.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Is there a contract or commitment?</h4>
              <p className="text-sm text-muted-foreground">
                No contracts! All plans are month-to-month. Cancel anytime with no penalties.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">What payment methods do you accept?</h4>
              <p className="text-sm text-muted-foreground">
                We accept all major credit cards through our secure payment processor, Stripe.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
