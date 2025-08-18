/*
  # Add last_login column to pdv_operators table

  1. Changes
    - Add `last_login` column to `pdv_operators` table
    - Column type: timestamp with time zone
    - Nullable to allow for operators who haven't logged in yet

  2. Security
    - No changes to existing RLS policies needed
*/

-- Add last_login column to pdv_operators table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pdv_operators' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE pdv_operators ADD COLUMN last_login timestamptz;
  END IF;
END $$;