-- LandlordAI Additional Schema: Subscriptions and Payments
-- Run this in your Supabase SQL Editor after 001_initial_schema.sql

-- Subscriptions table - tracks subscription status and history
create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  tier text not null check (tier in ('free', 'basic', 'pro')),
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due', 'trialing', 'paused')),
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean default false,
  canceled_at timestamp with time zone,
  trial_start timestamp with time zone,
  trial_end timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Payment history table - tracks all payments
create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  subscription_id uuid references subscriptions(id) on delete set null,
  amount decimal(10,2) not null,
  currency text default 'usd',
  status text not null check (status in ('succeeded', 'pending', 'failed', 'refunded')),
  payment_method text, -- 'card', 'ach', 'manual', etc.
  description text,
  receipt_url text,
  created_at timestamp with time zone default now()
);

-- Document usage tracking per billing period
create table if not exists document_usage (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  billing_period_start date not null,
  billing_period_end date not null,
  documents_generated integer default 0,
  document_types_used jsonb default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, billing_period_start)
);

-- Create indexes
create index if not exists idx_subscriptions_user_id on subscriptions(user_id);
create index if not exists idx_subscriptions_status on subscriptions(status);
create index if not exists idx_payments_user_id on payments(user_id);
create index if not exists idx_payments_created_at on payments(created_at desc);
create index if not exists idx_document_usage_user_id on document_usage(user_id);
create index if not exists idx_document_usage_period on document_usage(billing_period_start, billing_period_end);

-- Enable Row Level Security
alter table subscriptions enable row level security;
alter table payments enable row level security;
alter table document_usage enable row level security;

-- RLS Policies for subscriptions
create policy "Users can view own subscriptions" on subscriptions
  for select using (auth.uid() = user_id);

-- RLS Policies for payments
create policy "Users can view own payments" on payments
  for select using (auth.uid() = user_id);

-- RLS Policies for document_usage
create policy "Users can view own document usage" on document_usage
  for select using (auth.uid() = user_id);

-- Function to get user's current active subscription
create or replace function public.get_user_subscription(p_user_id uuid)
returns table (
  subscription_id uuid,
  tier text,
  status text,
  current_period_end timestamp with time zone,
  documents_this_period integer,
  document_limit integer
)
language plpgsql
security definer
as $$
declare
  v_tier text;
  v_doc_count integer;
  v_doc_limit integer;
begin
  -- Get current tier from profile
  select subscription_tier into v_tier
  from public.profiles
  where id = p_user_id;

  -- Get document count for current period
  select coalesce(documents_generated, 0) into v_doc_count
  from public.document_usage
  where user_id = p_user_id
    and billing_period_start <= current_date
    and billing_period_end >= current_date
  limit 1;

  -- Set limit based on tier
  v_doc_limit := case v_tier
    when 'free' then 3
    when 'basic' then null  -- unlimited
    when 'pro' then null    -- unlimited
    else 3
  end;

  return query
  select
    s.id as subscription_id,
    coalesce(s.tier, v_tier) as tier,
    coalesce(s.status, 'active') as status,
    s.current_period_end,
    coalesce(v_doc_count, 0) as documents_this_period,
    v_doc_limit as document_limit
  from public.profiles p
  left join public.subscriptions s on s.user_id = p.id and s.status = 'active'
  where p.id = p_user_id;
end;
$$;

-- Function to check if user can generate document
create or replace function public.can_generate_document(p_user_id uuid, p_document_type text)
returns boolean
language plpgsql
security definer
as $$
declare
  v_tier text;
  v_doc_count integer;
  v_allowed_types text[];
begin
  -- Get current tier
  select subscription_tier into v_tier
  from public.profiles
  where id = p_user_id;

  -- Get current document count
  select coalesce(documents_this_month, 0) into v_doc_count
  from public.profiles
  where id = p_user_id;

  -- Check limits based on tier
  if v_tier = 'free' then
    -- Free tier: 3 docs/month, limited types
    v_allowed_types := array['late_rent', 'move_in_out', 'maintenance'];
    if v_doc_count >= 3 then
      return false;
    end if;
    if not (p_document_type = any(v_allowed_types)) then
      return false;
    end if;
  end if;

  -- Basic and Pro have unlimited documents and all types
  return true;
end;
$$;

-- Function to record document generation
create or replace function public.record_document_generation(p_user_id uuid, p_document_type text)
returns void
language plpgsql
security definer
as $$
declare
  v_period_start date;
  v_period_end date;
begin
  -- Calculate current billing period (monthly)
  v_period_start := date_trunc('month', current_date)::date;
  v_period_end := (date_trunc('month', current_date) + interval '1 month' - interval '1 day')::date;

  -- Update profile document count
  update public.profiles
  set documents_this_month = documents_this_month + 1,
      updated_at = now()
  where id = p_user_id;

  -- Upsert document usage record
  insert into public.document_usage (user_id, billing_period_start, billing_period_end, documents_generated, document_types_used)
  values (
    p_user_id,
    v_period_start,
    v_period_end,
    1,
    jsonb_build_object(p_document_type, 1)
  )
  on conflict (user_id, billing_period_start)
  do update set
    documents_generated = document_usage.documents_generated + 1,
    document_types_used = document_usage.document_types_used ||
      jsonb_build_object(p_document_type, coalesce((document_usage.document_types_used->>excluded.document_types_used::text)::integer, 0) + 1),
    updated_at = now();
end;
$$;

-- Function to upgrade/downgrade user subscription
create or replace function public.update_user_subscription(
  p_user_id uuid,
  p_tier text,
  p_period_days integer default 30
)
returns void
language plpgsql
security definer
as $$
begin
  -- Update profile tier
  update public.profiles
  set subscription_tier = p_tier,
      updated_at = now()
  where id = p_user_id;

  -- Create or update subscription record
  insert into public.subscriptions (
    user_id,
    tier,
    status,
    current_period_start,
    current_period_end
  )
  values (
    p_user_id,
    p_tier,
    'active',
    now(),
    now() + (p_period_days || ' days')::interval
  )
  on conflict (user_id) where status = 'active'
  do update set
    tier = p_tier,
    current_period_start = now(),
    current_period_end = now() + (p_period_days || ' days')::interval,
    updated_at = now();
end;
$$;

-- View for user dashboard data
create or replace view user_dashboard_stats as
select
  p.id as user_id,
  p.subscription_tier,
  p.documents_this_month,
  case p.subscription_tier when 'free' then 3 else null end as document_limit,
  (select count(*) from properties where user_id = p.id) as property_count,
  (select count(*) from tenants where user_id = p.id) as tenant_count,
  (select count(*) from documents where user_id = p.id) as total_documents,
  (select count(*) from documents where user_id = p.id and created_at >= date_trunc('month', now())) as documents_this_month_actual
from profiles p;

-- Grant access to the view
grant select on user_dashboard_stats to authenticated;
