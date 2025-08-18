/*
  # Fix PDV Sales Report View

  1. Changes
    - Drop and recreate the view with all necessary columns
    - Include customer_phone column
    - Ensure proper grouping for all columns
    - Fix the column naming issue
*/

-- Drop the existing view first
DROP VIEW IF EXISTS pdv_sales_report;

-- Create the view with all necessary columns
CREATE VIEW pdv_sales_report AS
SELECT 
  s.id,
  s.sale_number,
  s.created_at,
  o.name as operator_name,
  s.customer_name,
  s.customer_phone,
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
GROUP BY 
  s.id, 
  s.sale_number, 
  s.created_at, 
  o.name, 
  s.customer_name, 
  s.customer_phone, 
  s.subtotal, 
  s.discount_amount, 
  s.total_amount, 
  s.payment_type, 
  s.is_cancelled, 
  s.channel;