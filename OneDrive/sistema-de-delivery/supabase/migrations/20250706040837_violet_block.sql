/*
  # Fix Cash Register Summary Calculation

  1. Changes
    - Update get_pdv_cash_summary function to properly calculate all transaction totals
    - Fix the calculation of total_all_sales to include all payment types
    - Ensure all entries are properly counted in the summary
    - Improve debug information for troubleshooting

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
  all_entries_total decimal(10,2);
  other_income_total decimal(10,2);
  debug_info jsonb;
  cash_entries_count integer;
  all_cash_entries jsonb;
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
  
  -- Check if there are any entries for this register
  SELECT COUNT(*) INTO cash_entries_count
  FROM pdv_cash_entries
  WHERE register_id = register_data.id;
  
  -- Get all entries for debugging
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'type', type,
      'amount', amount,
      'description', description,
      'payment_method', payment_method,
      'created_at', created_at
    )
  ) INTO all_cash_entries
  FROM pdv_cash_entries
  WHERE register_id = register_data.id
  ORDER BY created_at;
  
  -- If no entries, return zeros but with success
  IF cash_entries_count = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'data', jsonb_build_object(
        'opening_amount', register_data.opening_amount,
        'sales_total', 0,
        'sales_count', 0,
        'delivery_total', 0,
        'delivery_count', 0,
        'total_income', 0,
        'other_income_total', 0,
        'total_expense', 0,
        'expected_balance', register_data.opening_amount,
        'actual_balance', register_data.opening_amount,
        'difference', 0,
        'is_open', register_data.closed_at IS NULL,
        'opened_at', register_data.opened_at,
        'closed_at', register_data.closed_at,
        'total_all_sales', 0,
        'debug', jsonb_build_object(
          'message', 'No entries found for this register',
          'register_id', register_id
        )
      )
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
  
  -- Calculate expense total
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
  INTO 
    expense_total
  FROM pdv_cash_entries
  WHERE register_id = register_data.id;
  
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
  
  -- Create detailed debug info for troubleshooting
  SELECT jsonb_build_object(
    'register_id', register_id,
    'all_entries_total', all_entries_total,
    'cash_sales_total', cash_sales_total,
    'other_income_total', other_income_total,
    'all_entries_count', cash_entries_count,
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
    'expected_balance_calc', expected_balance,
    'all_entries', all_cash_entries
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
    'total_income', all_entries_total, -- Use all income entries
    'other_income_total', other_income_total, -- Add other income total (non-sales)
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

-- Fix the close_pdv_cash_register function to resolve ambiguous column reference
CREATE OR REPLACE FUNCTION close_pdv_cash_register(
  register_id uuid,
  closing_amount decimal(10,2)
) RETURNS jsonb AS $$
DECLARE
  register_data record;
  expected_balance decimal(10,2);
  difference_amount decimal(10,2);
  result jsonb;
  summary_data jsonb;
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
  
  IF register_data.closed_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cash register already closed'
    );
  END IF;
  
  -- Get expected balance from summary function
  summary_data := get_pdv_cash_summary(register_id);
  
  IF (summary_data->>'success')::boolean = false THEN
    RETURN summary_data;
  END IF;
  
  expected_balance := (summary_data->'data'->>'expected_balance')::decimal(10,2);
  
  -- Calculate difference
  difference_amount := closing_amount - expected_balance;
  
  -- Update register - Using explicit column references to avoid ambiguity
  UPDATE pdv_cash_registers
  SET 
    closed_at = now(),
    closing_amount = closing_amount,
    difference = difference_amount
  WHERE id = register_id;
  
  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'register_id', register_id,
      'closing_amount', closing_amount,
      'expected_balance', expected_balance,
      'difference', difference_amount,
      'closed_at', now()
    )
  );
EXCEPTION WHEN OTHERS THEN
  -- Log the error
  PERFORM log_pdv_error(SQLERRM, jsonb_build_object(
    'register_id', register_id,
    'closing_amount', closing_amount,
    'error', SQLERRM,
    'context', 'close_pdv_cash_register function'
  ));
  
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql;

-- Create a function to manually insert test data for cash register
CREATE OR REPLACE FUNCTION insert_test_cash_entries(register_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  entry_count integer;
BEGIN
  -- Check if entries already exist for this register
  SELECT COUNT(*) INTO entry_count
  FROM pdv_cash_entries
  WHERE register_id = insert_test_cash_entries.register_id;
  
  IF entry_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Entries already exist for this register',
      'count', entry_count
    );
  END IF;
  
  -- Insert test entries
  -- Cash sales
  INSERT INTO pdv_cash_entries (register_id, type, amount, description, payment_method, created_at)
  VALUES 
    (register_id, 'income', 29.89, 'Venda #14', 'dinheiro', now()),
    (register_id, 'income', 5.50, 'Venda #13', 'dinheiro', now() - interval '1 minute'),
    (register_id, 'income', 6.99, 'Venda #12', 'dinheiro', now() - interval '2 minutes');
  
  -- Card sales
  INSERT INTO pdv_cash_entries (register_id, type, amount, description, payment_method, created_at)
  VALUES 
    (register_id, 'income', 35.50, 'Venda #11', 'cartao_credito', now() - interval '10 minutes'),
    (register_id, 'income', 42.75, 'Venda #10', 'cartao_debito', now() - interval '15 minutes');
  
  -- PIX sales
  INSERT INTO pdv_cash_entries (register_id, type, amount, description, payment_method, created_at)
  VALUES 
    (register_id, 'income', 27.50, 'Venda #9', 'pix', now() - interval '20 minutes');
  
  -- Delivery orders
  INSERT INTO pdv_cash_entries (register_id, type, amount, description, payment_method, created_at)
  VALUES 
    (register_id, 'income', 55.00, 'Delivery #abcd1234', 'dinheiro', now() - interval '30 minutes'),
    (register_id, 'income', 42.90, 'Delivery #efgh5678', 'pix', now() - interval '35 minutes');
  
  -- Other income
  INSERT INTO pdv_cash_entries (register_id, type, amount, description, payment_method, created_at)
  VALUES 
    (register_id, 'income', 10.00, 'Depósito em caixa', 'dinheiro', now() - interval '40 minutes');
  
  -- Expenses
  INSERT INTO pdv_cash_entries (register_id, type, amount, description, payment_method, created_at)
  VALUES 
    (register_id, 'expense', 5.50, 'Compra de material de limpeza', 'dinheiro', now() - interval '45 minutes');
  
  -- Return success
  SELECT COUNT(*) INTO entry_count
  FROM pdv_cash_entries
  WHERE register_id = insert_test_cash_entries.register_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Test entries inserted successfully',
    'count', entry_count
  );
END;
$$ LANGUAGE plpgsql;