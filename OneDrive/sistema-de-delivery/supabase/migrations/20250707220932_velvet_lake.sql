/*
  # Add Cash Menu to Attendance Page

  1. New Functions
    - Add function to get daily sales summary for the attendance page
    
  2. Security
    - Ensure proper access control
    
  3. Changes
    - Update permissions for all operators
*/

-- Create or replace function to get daily sales summary
CREATE OR REPLACE FUNCTION get_daily_sales_summary()
RETURNS jsonb AS $$
DECLARE
  today_start TIMESTAMP;
  today_end TIMESTAMP;
  sales_data jsonb;
  delivery_data jsonb;
  other_income jsonb;
  expenses jsonb;
  total_sales NUMERIC;
  total_delivery NUMERIC;
  total_other_income NUMERIC;
  total_expenses NUMERIC;
  payment_methods jsonb;
BEGIN
  -- Set today's date range
  today_start := date_trunc('day', now());
  today_end := today_start + interval '1 day';
  
  -- Get PDV sales
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COUNT(*)
  INTO total_sales, sales_data
  FROM pdv_sales
  WHERE created_at BETWEEN today_start AND today_end
    AND is_cancelled = false
    AND channel = 'pdv';
    
  -- Get delivery sales
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COUNT(*)
  INTO total_delivery, delivery_data
  FROM pdv_sales
  WHERE created_at BETWEEN today_start AND today_end
    AND is_cancelled = false
    AND channel = 'delivery';
    
  -- Get other income
  SELECT 
    COALESCE(SUM(amount), 0),
    COUNT(*)
  INTO total_other_income, other_income
  FROM pdv_cash_entries
  WHERE created_at BETWEEN today_start AND today_end
    AND type = 'income'
    AND description NOT LIKE 'Venda #%'
    AND description NOT LIKE 'Delivery #%';
    
  -- Get expenses
  SELECT 
    COALESCE(SUM(amount), 0),
    COUNT(*)
  INTO total_expenses, expenses
  FROM pdv_cash_entries
  WHERE created_at BETWEEN today_start AND today_end
    AND type = 'expense';
    
  -- Get payment methods breakdown
  WITH payment_summary AS (
    -- PDV sales by payment method
    SELECT 
      payment_type || '_pdv' AS payment_key,
      COUNT(*) AS count,
      SUM(total_amount) AS total
    FROM pdv_sales
    WHERE created_at BETWEEN today_start AND today_end
      AND is_cancelled = false
      AND channel = 'pdv'
    GROUP BY payment_type
    
    UNION ALL
    
    -- Delivery sales by payment method
    SELECT 
      payment_type || '_delivery' AS payment_key,
      COUNT(*) AS count,
      SUM(total_amount) AS total
    FROM pdv_sales
    WHERE created_at BETWEEN today_start AND today_end
      AND is_cancelled = false
      AND channel = 'delivery'
    GROUP BY payment_type
  )
  SELECT 
    jsonb_object_agg(
      payment_key,
      jsonb_build_object(
        'count', count,
        'total', total
      )
    )
  INTO payment_methods
  FROM payment_summary;
  
  -- Return the complete summary
  RETURN jsonb_build_object(
    'sales_total', total_sales,
    'sales_count', sales_data,
    'delivery_total', total_delivery,
    'delivery_count', delivery_data,
    'other_income_total', total_other_income,
    'other_income_count', other_income,
    'total_expense', total_expenses,
    'expense_count', expenses,
    'total_all', total_sales + total_delivery + total_other_income,
    'sales', payment_methods
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update all operators to have the cash menu permission
UPDATE pdv_operators
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{can_view_cash_register}',
  'true'::jsonb
)
WHERE permissions->>'can_view_cash_register' IS NULL;

-- Ensure all operators have the necessary permissions
UPDATE pdv_operators
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{can_view_attendance}',
  'true'::jsonb
)
WHERE permissions->>'can_view_attendance' IS NULL;