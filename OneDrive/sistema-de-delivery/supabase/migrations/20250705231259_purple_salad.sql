/*
  # Fix Cash Register Summary Calculation

  1. Changes
    - Update get_pdv_cash_summary function to properly calculate all transaction types
    - Fix calculation of total income to include non-sale entries
    - Ensure proper balance calculation including all cash transactions
    - Improve debug information for troubleshooting

  2. Features
    - Accurate cash register summary including all transaction types
    - Proper calculation of expected balance
    - Improved reporting for cash register management
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
  all_entries_total decimal(10,2);
  other_income_total decimal(10,2);
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
  
  -- Calculate total of ALL income entries (including non-sales)
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)
  INTO 
    all_entries_total
  FROM pdv_cash_entries
  WHERE register_id = register_data.id;
  
  -- Calculate other income (non-sales)
  SELECT 
    COALESCE(SUM(amount), 0)
  INTO 
    other_income_total
  FROM pdv_cash_entries
  WHERE register_id = register_data.id
    AND type = 'income'
    AND description NOT LIKE 'Venda #%'
    AND description NOT LIKE 'Delivery #%';
  
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
  expected_balance := register_data.opening_amount;
  
  -- Add ALL cash income (including non-sales)
  SELECT expected_balance + COALESCE(SUM(amount), 0)
  INTO expected_balance
  FROM pdv_cash_entries
  WHERE register_id = register_data.id
    AND payment_method = 'dinheiro'
    AND type = 'income';
  
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
  
  -- Calculate expense total
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
  INTO 
    expense_total
  FROM pdv_cash_entries
  WHERE register_id = register_data.id;
  
  -- Create detailed debug info for troubleshooting
  SELECT jsonb_build_object(
    'register_id', register_id,
    'all_entries_total', all_entries_total,
    'cash_sales_total', cash_sales_total,
    'other_income_total', other_income_total,
    'all_entries_count', (
      SELECT COUNT(*) FROM pdv_cash_entries 
      WHERE register_id = register_data.id
    ),
    'all_income_entries', (
      SELECT COUNT(*) FROM pdv_cash_entries 
      WHERE register_id = register_data.id 
      AND type = 'income'
    ),
    'payment_methods', (
      SELECT jsonb_agg(DISTINCT payment_method)
      FROM pdv_cash_entries
      WHERE register_id = register_data.id
    ),
    'entries_by_payment', (
      SELECT jsonb_object_agg(
        payment_method,
        SUM(amount)
      )
      FROM pdv_cash_entries
      WHERE register_id = register_data.id
      AND type = 'income'
      GROUP BY payment_method
    ),
    'total_all_sales_calc', total_all_sales,
    'sales_total_calc', sales_total,
    'delivery_total_calc', delivery_total,
    'other_income_total_calc', other_income_total,
    'expense_total_calc', expense_total,
    'expected_balance_calc', expected_balance
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
    'total_income', all_entries_total, -- Use all income entries, not just sales
    'other_income_total', other_income_total, -- Add other income total
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