/*
  # Add Sorvetes Category to PDV Product Category Enum

  1. Changes
    - Add 'sorvetes' to the pdv_product_category enum
    - Ensure backward compatibility with existing data
    - Update enum type to include the new category

  2. Security
    - No changes to existing RLS policies
    - No changes to access control
*/

-- Add 'sorvetes' to the pdv_product_category enum
ALTER TYPE pdv_product_category ADD VALUE IF NOT EXISTS 'sorvetes';