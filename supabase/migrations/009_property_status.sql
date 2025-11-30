-- Add status field to properties table for manual status tracking
-- Status can be: 'available', 'occupied', 'under_construction'

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available';

-- Add comment for documentation
COMMENT ON COLUMN properties.status IS 'Property status: available, occupied, or under_construction';
