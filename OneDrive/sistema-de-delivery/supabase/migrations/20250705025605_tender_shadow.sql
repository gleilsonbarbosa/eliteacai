/*
  # Add Sales Channel Tracking

  1. New Fields
    - `channel` column to `pdv_sales` table to track sales source (PDV or delivery)
    - `channel` column to `orders` table to track order source

  2. Changes
    - Add default values for existing records
    - Update sales report to display channel information
*/

-- Add channel column to pdv_sales table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pdv_sales' AND column_name = 'channel'
  ) THEN
    ALTER TABLE pdv_sales ADD COLUMN channel text DEFAULT 'pdv' NOT NULL;
  END IF;
END $$;

-- Add channel column to orders table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'channel'
  ) THEN
    ALTER TABLE orders ADD COLUMN channel text DEFAULT 'delivery' NOT NULL;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_pdv_sales_channel ON pdv_sales(channel);
CREATE INDEX IF NOT EXISTS idx_orders_channel ON orders(channel);

-- Update existing records
UPDATE pdv_sales SET channel = 'pdv' WHERE channel IS NULL;
UPDATE orders SET channel = 'delivery' WHERE channel IS NULL;

-- Update pdv_sales_report view to include channel
CREATE OR REPLACE VIEW pdv_sales_report AS
SELECT 
  s.id,
  s.sale_number,
  s.created_at,
  o.name as operator_name,
  s.customer_name,
  s.subtotal,
  s.discount_amount,
  s.total_amount,
  s.payment_type,
  s.is_cancelled,
  COUNT(si.id) as items_count,
  SUM(si.quantity) as total_quantity,
  s.channel
FROM pdv_sales s
LEFT JOIN pdv_operators o ON s.operator_id = o.id
LEFT JOIN pdv_sale_items si ON s.id = si.sale_id
GROUP BY s.id, o.name;