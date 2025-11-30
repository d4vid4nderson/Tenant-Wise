-- Property Images table for multiple images per property
create table if not exists property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade not null,
  image_url text not null,
  caption text,
  display_order integer default 0,
  is_primary boolean default false,
  created_at timestamp with time zone default now()
);

-- Index for faster lookups by property
create index if not exists idx_property_images_property_id on property_images(property_id);

-- Index for ordering
create index if not exists idx_property_images_order on property_images(property_id, display_order);

-- Enable Row Level Security
alter table property_images enable row level security;

-- Policy: Users can manage images for their own properties
create policy "Users can manage own property images" on property_images
  for all using (
    property_id in (
      select id from properties where user_id = auth.uid()
    )
  );

-- Function to ensure only one primary image per property
create or replace function ensure_single_primary_image()
returns trigger as $$
begin
  if NEW.is_primary = true then
    update property_images
    set is_primary = false
    where property_id = NEW.property_id
      and id != NEW.id
      and is_primary = true;
  end if;
  return NEW;
end;
$$ language plpgsql;

-- Trigger to maintain single primary image
create trigger trigger_ensure_single_primary_image
  after insert or update of is_primary on property_images
  for each row
  when (NEW.is_primary = true)
  execute function ensure_single_primary_image();
