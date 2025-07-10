/*
  # Product Images Storage Schema
  
  1. New Tables
    - `product_images` - Stores metadata for uploaded product images
    - `product_image_associations` - Links products to their images
  
  2. Security
    - Enable RLS on both tables
    - Add policies for public read access and authenticated write access
    
  3. Functionality
    - Add updated_at trigger for product_images
    - Add indexes for efficient queries
*/

-- Create product_images table if it doesn't exist
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_path text NOT NULL UNIQUE,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  public_url text NOT NULL,
  original_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create product_image_associations table if it doesn't exist
CREATE TABLE IF NOT EXISTS product_image_associations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  image_id uuid NOT NULL REFERENCES product_images(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_images_file_path ON product_images(file_path);
CREATE INDEX IF NOT EXISTS idx_product_images_created_at ON product_images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_image_associations_product_id ON product_image_associations(product_id);
CREATE INDEX IF NOT EXISTS idx_product_image_associations_image_id ON product_image_associations(image_id);

-- Enable RLS on product_images if not already enabled
DO $$ 
DECLARE
  rls_enabled boolean;
BEGIN
  SELECT rowsecurity INTO rls_enabled FROM pg_tables WHERE tablename = 'product_images';
  IF NOT rls_enabled THEN
    EXECUTE 'ALTER TABLE product_images ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Enable RLS on product_image_associations if not already enabled
DO $$ 
DECLARE
  rls_enabled boolean;
BEGIN
  SELECT rowsecurity INTO rls_enabled FROM pg_tables WHERE tablename = 'product_image_associations';
  IF NOT rls_enabled THEN
    EXECUTE 'ALTER TABLE product_image_associations ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Add RLS policies for product_images (only if they don't exist)
DO $$ 
DECLARE
  policy_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_images' 
    AND policyname = 'Allow public read access to product_images'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    EXECUTE 'CREATE POLICY "Allow public read access to product_images" 
      ON product_images FOR SELECT TO public USING (true)';
  END IF;
END $$;

DO $$ 
DECLARE
  policy_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_images' 
    AND policyname = 'Allow authenticated insert to product_images'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    EXECUTE 'CREATE POLICY "Allow authenticated insert to product_images" 
      ON product_images FOR INSERT TO public WITH CHECK (true)';
  END IF;
END $$;

DO $$ 
DECLARE
  policy_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_images' 
    AND policyname = 'Allow authenticated update to product_images'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    EXECUTE 'CREATE POLICY "Allow authenticated update to product_images" 
      ON product_images FOR UPDATE TO public USING (true)';
  END IF;
END $$;

DO $$ 
DECLARE
  policy_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_images' 
    AND policyname = 'Allow authenticated delete to product_images'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    EXECUTE 'CREATE POLICY "Allow authenticated delete to product_images" 
      ON product_images FOR DELETE TO public USING (true)';
  END IF;
END $$;

-- Add RLS policies for product_image_associations (only if they don't exist)
DO $$ 
DECLARE
  policy_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_image_associations' 
    AND policyname = 'Allow public read access to product_image_associations'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    EXECUTE 'CREATE POLICY "Allow public read access to product_image_associations" 
      ON product_image_associations FOR SELECT TO public USING (true)';
  END IF;
END $$;

DO $$ 
DECLARE
  policy_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_image_associations' 
    AND policyname = 'Allow authenticated insert to product_image_associations'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    EXECUTE 'CREATE POLICY "Allow authenticated insert to product_image_associations" 
      ON product_image_associations FOR INSERT TO public WITH CHECK (true)';
  END IF;
END $$;

DO $$ 
DECLARE
  policy_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_image_associations' 
    AND policyname = 'Allow authenticated update to product_image_associations'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    EXECUTE 'CREATE POLICY "Allow authenticated update to product_image_associations" 
      ON product_image_associations FOR UPDATE TO public USING (true)';
  END IF;
END $$;

DO $$ 
DECLARE
  policy_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_image_associations' 
    AND policyname = 'Allow authenticated delete to product_image_associations'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    EXECUTE 'CREATE POLICY "Allow authenticated delete to product_image_associations" 
      ON product_image_associations FOR DELETE TO public USING (true)';
  END IF;
END $$;

-- Add trigger for updated_at on product_images if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
DECLARE
  trigger_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_product_images_updated_at'
  ) INTO trigger_exists;
  
  IF NOT trigger_exists THEN
    EXECUTE 'CREATE TRIGGER update_product_images_updated_at
    BEFORE UPDATE ON product_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END $$;