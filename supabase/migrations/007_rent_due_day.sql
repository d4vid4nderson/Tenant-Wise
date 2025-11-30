-- Add rent_due_day column to properties table
-- This column stores the day of month when rent is due (1-31)

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS rent_due_day INTEGER DEFAULT 1 CHECK (rent_due_day >= 1 AND rent_due_day <= 31);

-- Add comment for clarity
COMMENT ON COLUMN properties.rent_due_day IS 'Day of month when rent is due (1-31)';
