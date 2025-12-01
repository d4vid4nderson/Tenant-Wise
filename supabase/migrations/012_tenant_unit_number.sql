-- Add unit_number field to tenants table
-- This allows tracking which specific unit a tenant occupies in multi-unit properties

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS unit_number text;

-- Add comment for documentation
COMMENT ON COLUMN tenants.unit_number IS 'The specific unit identifier (e.g., "A", "101", "2B") for multi-unit properties';
