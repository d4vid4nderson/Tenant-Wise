import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createConnectedAccount,
  createAccountLink,
  stripe,
} from '@/lib/stripe';

// POST - Create connected account or get onboarding link
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

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*, connected_accounts(*)')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    // Check subscription tier - only Pro users can collect rent
    if (profile.subscription_tier !== 'pro') {
      return NextResponse.json(
        { error: 'Rent collection requires Pro subscription' },
        { status: 403 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    let accountId = profile.stripe_connected_account_id;

    // Create connected account if doesn't exist
    if (!accountId) {
      const account = await createConnectedAccount(user.email!, {
        user_id: user.id,
      });
      accountId = account.id;

      // Save to database
      await supabase.from('connected_accounts').insert({
        user_id: user.id,
        stripe_account_id: accountId,
        account_status: 'pending',
      });

      // Update profile
      await supabase
        .from('profiles')
        .update({ stripe_connected_account_id: accountId })
        .eq('id', user.id);
    }

    // Check if onboarding is complete
    const account = await stripe.accounts.retrieve(accountId);

    if (account.details_submitted && account.charges_enabled) {
      return NextResponse.json({
        status: 'active',
        accountId,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      });
    }

    // Create onboarding link
    const accountLink = await createAccountLink(
      accountId,
      `${appUrl}/dashboard/settings?connect=refresh`,
      `${appUrl}/dashboard/settings?connect=complete`
    );

    return NextResponse.json({
      status: 'pending',
      accountId,
      onboardingUrl: accountLink.url,
    });
  } catch (error) {
    console.error('Connect account error:', error);
    return NextResponse.json(
      { error: 'Failed to setup payment account' },
      { status: 500 }
    );
  }
}

// GET - Get connected account status
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

    // Get connected account
    const { data: connectedAccount, error } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !connectedAccount) {
      return NextResponse.json({
        hasAccount: false,
        status: null,
      });
    }

    // Get latest status from Stripe
    const account = await stripe.accounts.retrieve(
      connectedAccount.stripe_account_id
    );

    return NextResponse.json({
      hasAccount: true,
      status: connectedAccount.account_status,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      onboardingComplete: account.details_submitted && account.charges_enabled,
    });
  } catch (error) {
    console.error('Get connect account error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account status' },
      { status: 500 }
    );
  }
}
