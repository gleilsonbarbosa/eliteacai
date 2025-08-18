/*
  # Add image_url to PDV Products

  1. Changes
    - Add image_url column to pdv_products table
    - Update existing products to use image_url if available
    - Add index for image_url column for better performance

  2. Security
    - Maintain existing RLS policies
    - No changes to access control
*/

-- Add image_url column to pdv_products table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pdv_products' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE pdv_products ADD COLUMN image_url text;
  END IF;
END $$;

-- Create index for image_url column
CREATE INDEX IF NOT EXISTS idx_pdv_products_image_url ON pdv_products(image_url) WHERE image_url IS NOT NULL;

-- Update existing products to use image_url if available
UPDATE pdv_products
SET image_url = 'https://images.pexels.com/photos/1092730/pexels-photo-1092730.jpeg?auto=compress&cs=tinysrgb&w=400'
WHERE image_url IS NULL;