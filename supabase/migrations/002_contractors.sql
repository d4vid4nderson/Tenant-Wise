-- Contractors table for storing landlord's contractor contacts
create table if not exists contractors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  company_name text,
  phone text,
  email text,
  specialty text not null, -- 'plumbing', 'electrical', 'hvac', 'appliance', 'roofing', 'landscaping', 'painting', 'cleaning', 'general', 'other'
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table contractors enable row level security;

-- RLS Policy: Users can only access their own contractors
drop policy if exists "Users can CRUD own contractors" on contractors;
create policy "Users can CRUD own contractors" on contractors for all using (auth.uid() = user_id);

-- Index for faster lookups
create index if not exists contractors_user_id_idx on contractors(user_id);
create index if not exists contractors_specialty_idx on contractors(specialty);
