-- Add focal point fields to property_images table
-- These store the X and Y percentages (0-100) for where the image should be focused/cropped
-- Default is 50,50 (center)

ALTER TABLE property_images
ADD COLUMN focal_x integer DEFAULT 50,
ADD COLUMN focal_y integer DEFAULT 50;

-- Also add focal point to the properties table for the cover image
ALTER TABLE properties
ADD COLUMN cover_focal_x integer DEFAULT 50,
ADD COLUMN cover_focal_y integer DEFAULT 50;

-- Add constraint to ensure focal points are valid percentages
ALTER TABLE property_images
ADD CONSTRAINT property_images_focal_x_range CHECK (focal_x >= 0 AND focal_x <= 100),
ADD CONSTRAINT property_images_focal_y_range CHECK (focal_y >= 0 AND focal_y <= 100);

ALTER TABLE properties
ADD CONSTRAINT properties_cover_focal_x_range CHECK (cover_focal_x >= 0 AND cover_focal_x <= 100),
ADD CONSTRAINT properties_cover_focal_y_range CHECK (cover_focal_y >= 0 AND cover_focal_y <= 100);
