-- LandlordAI Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends Supabase Auth users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  subscription_tier text default 'free' check (subscription_tier in ('free', 'basic', 'pro')),
  documents_this_month integer default 0,
  billing_cycle_start timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Properties table
create table if not exists properties (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null default 'TX',
  zip text not null,
  unit_count integer default 1,
  property_type text check (property_type in ('single_family', 'duplex', 'apartment', 'condo', 'townhouse', 'other')),
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Tenants table
create table if not exists tenants (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  property_id uuid references properties(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  lease_start date,
  lease_end date,
  rent_amount decimal(10,2),
  security_deposit decimal(10,2),
  status text default 'active' check (status in ('active', 'past', 'pending')),
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Documents table
create table if not exists documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  property_id uuid references properties(id) on delete set null,
  tenant_id uuid references tenants(id) on delete set null,
  document_type text not null check (document_type in ('late_rent', 'lease_renewal', 'maintenance', 'move_in_out', 'deposit_return', 'other')),
  title text not null,
  content text not null,
  form_data jsonb,
  state text default 'TX',
  created_at timestamp with time zone default now()
);

-- Create indexes for better query performance
create index if not exists idx_properties_user_id on properties(user_id);
create index if not exists idx_tenants_user_id on tenants(user_id);
create index if not exists idx_tenants_property_id on tenants(property_id);
create index if not exists idx_documents_user_id on documents(user_id);
create index if not exists idx_documents_tenant_id on documents(tenant_id);
create index if not exists idx_documents_created_at on documents(created_at desc);

-- Enable Row Level Security
alter table profiles enable row level security;
alter table properties enable row level security;
alter table tenants enable row level security;
alter table documents enable row level security;

-- RLS Policies for profiles
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- RLS Policies for properties
create policy "Users can view own properties" on properties
  for select using (auth.uid() = user_id);

create policy "Users can create own properties" on properties
  for insert with check (auth.uid() = user_id);

create policy "Users can update own properties" on properties
  for update using (auth.uid() = user_id);

create policy "Users can delete own properties" on properties
  for delete using (auth.uid() = user_id);

-- RLS Policies for tenants
create policy "Users can view own tenants" on tenants
  for select using (auth.uid() = user_id);

create policy "Users can create own tenants" on tenants
  for insert with check (auth.uid() = user_id);

create policy "Users can update own tenants" on tenants
  for update using (auth.uid() = user_id);

create policy "Users can delete own tenants" on tenants
  for delete using (auth.uid() = user_id);

-- RLS Policies for documents
create policy "Users can view own documents" on documents
  for select using (auth.uid() = user_id);

create policy "Users can create own documents" on documents
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own documents" on documents
  for delete using (auth.uid() = user_id);

-- Function to create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

-- Trigger to auto-create profile (creates only if not exists)
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute procedure public.handle_new_user();
  end if;
end
$$;

-- Function to increment document count
create or replace function public.increment_document_count(user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles
  set documents_this_month = documents_this_month + 1,
      updated_at = now()
  where id = user_id;
end;
$$;

-- Function to reset monthly document counts (run via cron)
create or replace function public.reset_monthly_document_counts()
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles
  set documents_this_month = 0,
      billing_cycle_start = now()
  where billing_cycle_start < now() - interval '1 month';
end;
$$;
