-- Migration: Add landlord address fields to profiles table
-- These fields are used for auto-filling landlord information on generated documents

-- Add landlord contact and address fields
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists address_line1 text;
alter table profiles add column if not exists address_line2 text;
alter table profiles add column if not exists city text;
alter table profiles add column if not exists state text default 'TX';
alter table profiles add column if not exists zip text;

-- Add comment to explain purpose
comment on column profiles.phone is 'Landlord phone number for document generation';
comment on column profiles.address_line1 is 'Landlord street address for document generation';
comment on column profiles.address_line2 is 'Landlord address line 2 (apt, suite, etc)';
comment on column profiles.city is 'Landlord city for document generation';
comment on column profiles.state is 'Landlord state for document generation';
comment on column profiles.zip is 'Landlord zip code for document generation';
