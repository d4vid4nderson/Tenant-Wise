-- Invoices table for tracking contractor invoices
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  contractor_id uuid references contractors(id) on delete cascade not null,
  property_id uuid references properties(id) on delete set null,
  invoice_number text,
  description text not null,
  amount decimal(10,2) not null,
  status text not null default 'unpaid', -- 'unpaid', 'paid', 'overdue'
  invoice_date date not null default current_date,
  due_date date,
  paid_date date,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table invoices enable row level security;

-- RLS Policy: Users can only access their own invoices
drop policy if exists "Users can CRUD own invoices" on invoices;
create policy "Users can CRUD own invoices" on invoices for all using (auth.uid() = user_id);

-- Indexes for faster lookups
create index if not exists invoices_user_id_idx on invoices(user_id);
create index if not exists invoices_contractor_id_idx on invoices(contractor_id);
create index if not exists invoices_property_id_idx on invoices(property_id);
create index if not exists invoices_status_idx on invoices(status);
