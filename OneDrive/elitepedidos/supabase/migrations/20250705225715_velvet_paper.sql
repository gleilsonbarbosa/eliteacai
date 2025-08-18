/*
  # Fix Cash Register Summary Calculation

  1. Changes
    - Completely rewrite the get_pdv_cash_summary function to fix calculation issues
    - Ensure all sales from both channels (PDV and delivery) are properly counted
    - Add detailed debug information to help diagnose issues
    - Fix the calculation of total_all_sales to include all payment methods

  2. Features
    - More accurate cash register summary
    - Better error handling and reporting
    - Improved calculation of expected balance
*/

-- Update get_pdv_cash_summary function to properly calculate totals
CREATE OR REPLACE FUNCTION get_pdv_cash_summary(register_id uuid)
RETURNS jsonb AS $$
DECLARE
  register_data record;
  sales_data jsonb;
  expected_balance decimal(10,2);
  result jsonb;
  sales_total decimal(10,2);
  sales_count integer;
  income_total decimal(10,2);
  expense_total decimal(10,2);
  delivery_total decimal(10,2);
  delivery_count integer;
  cash_sales_total decimal(10,2);
  total_all_sales decimal(10,2);
  debug_info jsonb;
BEGIN
  -- Get register data
  SELECT * INTO register_data
  FROM pdv_cash_registers
  WHERE id = register_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cash register not found'
    );
  END IF;
  
  -- Calculate totals for PDV sales (all payment methods)
  SELECT 
    COALESCE(SUM(amount), 0),
    COUNT(*)
  INTO 
    sales_total,
    sales_count
  FROM pdv_cash_entries
  WHERE register_id = register_data.id
    AND type = 'income'
    AND description LIKE 'Venda #%';
  
  -- Calculate totals for delivery orders (all payment methods)
  SELECT 
    COALESCE(SUM(amount), 0),
    COUNT(*)
  INTO 
    delivery_total,
    delivery_count
  FROM pdv_cash_entries
  WHERE register_id = register_data.id
    AND type = 'income'
    AND description LIKE 'Delivery #%';
  
  -- Calculate total of all sales (PDV + delivery)
  total_all_sales := COALESCE(sales_total, 0) + COALESCE(delivery_total, 0);
  
  -- Get total cash sales (both PDV and delivery)
  SELECT COALESCE(SUM(amount), 0)
  INTO cash_sales_total
  FROM pdv_cash_entries
  WHERE register_id = register_data.id
    AND payment_method = 'dinheiro'
    AND type = 'income'
    AND (description LIKE 'Venda #%' OR description LIKE 'Delivery #%');
  
  -- Calculate expected balance
  expected_balance := register_data.opening_amount + cash_sales_total;
  
  -- Add other cash income
  SELECT expected_balance + COALESCE(SUM(amount), 0)
  INTO expected_balance
  FROM pdv_cash_entries
  WHERE register_id = register_data.id
    AND payment_method = 'dinheiro'
    AND type = 'income'
    AND description NOT LIKE 'Venda #%'
    AND description NOT LIKE 'Delivery #%';
  
  -- Subtract expenses
  SELECT expected_balance - COALESCE(SUM(amount), 0)
  INTO expected_balance
  FROM pdv_cash_entries
  WHERE register_id = register_data.id
    AND type = 'expense';
  
  -- Get sales data by payment method (including both PDV and delivery)
  WITH sales_by_method AS (
    SELECT 
      payment_method,
      SUM(amount) as total,
      COUNT(*) as count,
      CASE 
        WHEN description LIKE 'Venda #%' THEN 'pdv'
        WHEN description LIKE 'Delivery #%' THEN 'delivery'
        ELSE 'other'
      END as source
    FROM pdv_cash_entries
    WHERE register_id = register_data.id
      AND type = 'income'
      AND (description LIKE 'Venda #%' OR description LIKE 'Delivery #%')
    GROUP BY payment_method, source
  ),
  sales_summary AS (
    SELECT 
      payment_method,
      SUM(total) as total,
      SUM(count) as count,
      source
    FROM sales_by_method
    GROUP BY payment_method, source
  )
  SELECT jsonb_object_agg(
    payment_method || '_' || source,
    jsonb_build_object(
      'total', total,
      'count', count
    )
  ) INTO sales_data
  FROM sales_summary;
  
  -- Get income/expense data
  WITH income_expense AS (
    SELECT
      type,
      payment_method,
      SUM(amount) as total,
      COUNT(*) as count
    FROM pdv_cash_entries
    WHERE register_id = register_data.id
      AND description NOT LIKE 'Venda #%'
      AND description NOT LIKE 'Delivery #%'
    GROUP BY type, payment_method
  )
  SELECT 
    COALESCE(jsonb_object_agg(
      payment_method || '_' || type,
      jsonb_build_object(
        'total', total,
        'count', count
      )
    ), '{}'::jsonb)
  INTO result
  FROM income_expense;
  
  -- Calculate other income/expense
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'income' AND description NOT LIKE 'Venda #%' AND description NOT LIKE 'Delivery #%' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
  INTO 
    income_total,
    expense_total
  FROM pdv_cash_entries
  WHERE register_id = register_data.id;
  
  -- Create detailed debug info for troubleshooting
  SELECT jsonb_build_object(
    'register_id', register_id,
    'cash_sales_count', (
      SELECT COUNT(*) FROM pdv_cash_entries 
      WHERE register_id = register_data.id 
      AND payment_method = 'dinheiro' 
      AND type = 'income'
      AND (description LIKE 'Venda #%' OR description LIKE 'Delivery #%')
    ),
    'all_entries_count', (
      SELECT COUNT(*) FROM pdv_cash_entries 
      WHERE register_id = register_data.id
    ),
    'all_sales_entries', (
      SELECT COUNT(*) FROM pdv_cash_entries 
      WHERE register_id = register_data.id 
      AND type = 'income'
      AND (description LIKE 'Venda #%' OR description LIKE 'Delivery #%')
    ),
    'payment_methods', (
      SELECT jsonb_agg(DISTINCT payment_method)
      FROM pdv_cash_entries
      WHERE register_id = register_data.id
    ),
    'sales_by_payment', (
      SELECT jsonb_object_agg(
        payment_method,
        SUM(amount)
      )
      FROM pdv_cash_entries
      WHERE register_id = register_data.id
      AND type = 'income'
      AND (description LIKE 'Venda #%' OR description LIKE 'Delivery #%')
      GROUP BY payment_method
    ),
    'total_all_sales_calc', total_all_sales,
    'sales_total_calc', sales_total,
    'delivery_total_calc', delivery_total,
    'all_entries', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'type', type,
        'amount', amount,
        'description', description,
        'payment_method', payment_method,
        'created_at', created_at
      ))
      FROM pdv_cash_entries
      WHERE register_id = register_data.id
      ORDER BY created_at DESC
      LIMIT 20
    )
  ) INTO debug_info;
  
  -- Build complete result with consistent field naming
  result := jsonb_build_object(
    'opening_amount', register_data.opening_amount,
    'sales', COALESCE(sales_data, '{}'::jsonb),
    'other_transactions', result,
    'expected_balance', expected_balance,
    'actual_balance', COALESCE(register_data.closing_amount, expected_balance),
    'difference', COALESCE(register_data.closing_amount - expected_balance, 0),
    'is_open', register_data.closed_at IS NULL,
    'opened_at', register_data.opened_at,
    'closed_at', register_data.closed_at,
    'sales_total', sales_total,
    'sales_count', sales_count,
    'delivery_total', delivery_total,
    'delivery_count', delivery_count,
    'total_income', income_total,
    'total_expense', expense_total,
    'total_all_sales', total_all_sales,
    'debug', debug_info
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'data', result
  );
EXCEPTION WHEN OTHERS THEN
  -- Log the error
  PERFORM log_pdv_error(SQLERRM, jsonb_build_object(
    'register_id', register_id,
    'error', SQLERRM,
    'context', 'get_pdv_cash_summary function'
  ));
  
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql;

-- Create a function to directly get all cash entries for a register
CREATE OR REPLACE FUNCTION get_all_cash_entries(register_id uuid)
RETURNS TABLE (
  id uuid,
  type text,
  amount decimal(10,2),
  description text,
  payment_method text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id,
    ce.type,
    ce.amount,
    ce.description,
    ce.payment_method,
    ce.created_at
  FROM pdv_cash_entries ce
  WHERE ce.register_id = get_all_cash_entries.register_id
  ORDER BY ce.created_at;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get sales summary by payment method
CREATE OR REPLACE FUNCTION get_sales_by_payment_method(register_id uuid)
RETURNS TABLE (
  payment_method text,
  total decimal(10,2),
  count bigint,
  source text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.payment_method,
    SUM(ce.amount) as total,
    COUNT(*) as count,
    CASE 
      WHEN ce.description LIKE 'Venda #%' THEN 'pdv'
      WHEN ce.description LIKE 'Delivery #%' THEN 'delivery'
      ELSE 'other'
    END as source
  FROM pdv_cash_entries ce
  WHERE ce.register_id = get_sales_by_payment_method.register_id
    AND ce.type = 'income'
    AND (ce.description LIKE 'Venda #%' OR ce.description LIKE 'Delivery #%')
  GROUP BY ce.payment_method, source
  ORDER BY total DESC;
END;
$$ LANGUAGE plpgsql;