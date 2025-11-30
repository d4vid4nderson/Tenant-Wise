-- LandlordAI Stripe Integration Schema
-- Run this in your Supabase SQL Editor after 002_subscriptions_and_payments.sql

-- Add Stripe fields to profiles table
alter table profiles
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_connected_account_id text;

-- Create index for Stripe customer lookups
create index if not exists idx_profiles_stripe_customer_id on profiles(stripe_customer_id);
create index if not exists idx_profiles_stripe_connected_account_id on profiles(stripe_connected_account_id);

-- Add Stripe fields to subscriptions table
alter table subscriptions
  add column if not exists stripe_subscription_id text unique,
  add column if not exists stripe_price_id text,
  add column if not exists stripe_customer_id text;

create index if not exists idx_subscriptions_stripe_subscription_id on subscriptions(stripe_subscription_id);

-- Add Stripe fields to payments table
alter table payments
  add column if not exists stripe_payment_intent_id text unique,
  add column if not exists stripe_charge_id text,
  add column if not exists stripe_transfer_id text;

create index if not exists idx_payments_stripe_payment_intent_id on payments(stripe_payment_intent_id);

-- Tenant payment methods table (for rent collection via ACH)
create table if not exists tenant_payment_methods (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  landlord_id uuid references profiles(id) on delete cascade not null,
  stripe_customer_id text not null,
  stripe_payment_method_id text not null unique,
  payment_method_type text not null default 'us_bank_account',
  bank_name text,
  last_four text,
  is_default boolean default false,
  is_verified boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_tenant_payment_methods_tenant_id on tenant_payment_methods(tenant_id);
create index if not exists idx_tenant_payment_methods_landlord_id on tenant_payment_methods(landlord_id);

-- Rent payments table (tracks individual rent payments)
create table if not exists rent_payments (
  id uuid primary key default uuid_generate_v4(),
  landlord_id uuid references profiles(id) on delete cascade not null,
  tenant_id uuid references tenants(id) on delete set null,
  property_id uuid references properties(id) on delete set null,
  payment_method_id uuid references tenant_payment_methods(id) on delete set null,

  -- Payment details
  amount integer not null, -- in cents
  fee_amount integer default 0, -- Stripe fee in cents
  net_amount integer not null, -- amount - fee in cents
  fee_payer text default 'landlord' check (fee_payer in ('landlord', 'tenant', 'split')),

  -- Stripe references
  stripe_payment_intent_id text unique,
  stripe_charge_id text,
  stripe_transfer_id text,

  -- Status tracking
  status text not null default 'pending' check (status in ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'canceled')),
  failure_reason text,

  -- Rent period info
  rent_period_start date,
  rent_period_end date,
  due_date date,
  paid_at timestamp with time zone,

  -- Metadata
  description text,
  notes text,

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_rent_payments_landlord_id on rent_payments(landlord_id);
create index if not exists idx_rent_payments_tenant_id on rent_payments(tenant_id);
create index if not exists idx_rent_payments_property_id on rent_payments(property_id);
create index if not exists idx_rent_payments_status on rent_payments(status);
create index if not exists idx_rent_payments_due_date on rent_payments(due_date);
create index if not exists idx_rent_payments_stripe_payment_intent_id on rent_payments(stripe_payment_intent_id);

-- Connected accounts table (for landlord payouts)
create table if not exists connected_accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null unique,
  stripe_account_id text not null unique,
  account_status text default 'pending' check (account_status in ('pending', 'active', 'restricted', 'disabled')),
  charges_enabled boolean default false,
  payouts_enabled boolean default false,
  details_submitted boolean default false,
  onboarding_complete boolean default false,

  -- Payout settings
  default_payout_schedule text default 'daily', -- daily, weekly, monthly

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_connected_accounts_stripe_account_id on connected_accounts(stripe_account_id);

-- Enable RLS on new tables
alter table tenant_payment_methods enable row level security;
alter table rent_payments enable row level security;
alter table connected_accounts enable row level security;

-- RLS Policies for tenant_payment_methods
create policy "Landlords can view their tenant payment methods" on tenant_payment_methods
  for select using (auth.uid() = landlord_id);

create policy "Landlords can create tenant payment methods" on tenant_payment_methods
  for insert with check (auth.uid() = landlord_id);

create policy "Landlords can update their tenant payment methods" on tenant_payment_methods
  for update using (auth.uid() = landlord_id);

create policy "Landlords can delete their tenant payment methods" on tenant_payment_methods
  for delete using (auth.uid() = landlord_id);

-- RLS Policies for rent_payments
create policy "Landlords can view their rent payments" on rent_payments
  for select using (auth.uid() = landlord_id);

create policy "Landlords can create rent payments" on rent_payments
  for insert with check (auth.uid() = landlord_id);

create policy "Landlords can update their rent payments" on rent_payments
  for update using (auth.uid() = landlord_id);

-- RLS Policies for connected_accounts
create policy "Users can view own connected account" on connected_accounts
  for select using (auth.uid() = user_id);

create policy "Users can create own connected account" on connected_accounts
  for insert with check (auth.uid() = user_id);

create policy "Users can update own connected account" on connected_accounts
  for update using (auth.uid() = user_id);

-- Function to get landlord's rent collection summary
create or replace function public.get_rent_collection_summary(p_landlord_id uuid)
returns table (
  total_collected bigint,
  total_pending bigint,
  total_failed bigint,
  payments_this_month bigint,
  collected_this_month bigint
)
language plpgsql
security definer
as $$
begin
  return query
  select
    coalesce(sum(case when status = 'succeeded' then net_amount else 0 end), 0) as total_collected,
    coalesce(sum(case when status in ('pending', 'processing') then amount else 0 end), 0) as total_pending,
    coalesce(sum(case when status = 'failed' then amount else 0 end), 0) as total_failed,
    count(case when status = 'succeeded' and paid_at >= date_trunc('month', now()) then 1 end) as payments_this_month,
    coalesce(sum(case when status = 'succeeded' and paid_at >= date_trunc('month', now()) then net_amount else 0 end), 0) as collected_this_month
  from rent_payments
  where landlord_id = p_landlord_id;
end;
$$;

-- Function to update rent payment status from webhook
create or replace function public.update_rent_payment_status(
  p_payment_intent_id text,
  p_status text,
  p_charge_id text default null,
  p_transfer_id text default null,
  p_failure_reason text default null
)
returns void
language plpgsql
security definer
as $$
begin
  update rent_payments
  set
    status = p_status,
    stripe_charge_id = coalesce(p_charge_id, stripe_charge_id),
    stripe_transfer_id = coalesce(p_transfer_id, stripe_transfer_id),
    failure_reason = p_failure_reason,
    paid_at = case when p_status = 'succeeded' then now() else paid_at end,
    updated_at = now()
  where stripe_payment_intent_id = p_payment_intent_id;
end;
$$;
