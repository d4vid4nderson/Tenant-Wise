-- Add description field to properties table for rich text property descriptions
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment for documentation
COMMENT ON COLUMN properties.description IS 'Rich text HTML description of the property';
