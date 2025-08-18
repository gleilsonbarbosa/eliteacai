/*
  # Add CNPJ column to store_settings table

  1. Changes
    - Add `cnpj` column to `store_settings` table
    - Set default value to empty string
    - Allow NULL values for backward compatibility

  2. Notes
    - This migration adds CNPJ support to store settings
    - Existing records will have NULL CNPJ values initially
    - CNPJ can be updated through the store settings interface
*/

-- Add CNPJ column to store_settings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'store_settings' AND column_name = 'cnpj'
  ) THEN
    ALTER TABLE store_settings ADD COLUMN cnpj text;
  END IF;
END $$;