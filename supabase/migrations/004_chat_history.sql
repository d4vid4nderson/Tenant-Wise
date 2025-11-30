-- LandlordAI Chat History Schema
-- Run this in your Supabase SQL Editor after 003_stripe_integration.sql

-- Chat history table
create table if not exists chat_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  metadata jsonb default '{}',
  created_at timestamp with time zone default now()
);

-- Create indexes
create index if not exists idx_chat_history_user_id on chat_history(user_id);
create index if not exists idx_chat_history_created_at on chat_history(created_at desc);

-- Enable RLS
alter table chat_history enable row level security;

-- RLS Policies
create policy "Users can view own chat history" on chat_history
  for select using (auth.uid() = user_id);

create policy "Users can insert own chat messages" on chat_history
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own chat history" on chat_history
  for delete using (auth.uid() = user_id);

-- Function to get recent chat context (for continuing conversations)
create or replace function public.get_recent_chat_context(p_user_id uuid, p_limit integer default 10)
returns table (
  role text,
  content text,
  created_at timestamp with time zone
)
language plpgsql
security definer
as $$
begin
  return query
  select ch.role, ch.content, ch.created_at
  from chat_history ch
  where ch.user_id = p_user_id
  order by ch.created_at desc
  limit p_limit;
end;
$$;
