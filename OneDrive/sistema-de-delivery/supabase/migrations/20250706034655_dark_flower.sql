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
  cash_entries_count integer;
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
    'sample_entries', (
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
      LIMIT 5
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
    'total_income', other_income_total, -- Use other income total for "Outras Entradas"
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

-- Insert test data for cash register if needed
DO $$
DECLARE
  register_id uuid;
  operator_id uuid;
  entries_count integer;
BEGIN
  -- Check if we have any entries
  SELECT COUNT(*) INTO entries_count FROM pdv_cash_entries;
  
  -- Only insert test data if we have no entries
  IF entries_count = 0 THEN
    -- Get or create operator
    SELECT id INTO operator_id FROM pdv_operators WHERE code = 'ADMIN' LIMIT 1;
    
    IF operator_id IS NULL THEN
      INSERT INTO pdv_operators (name, code, password_hash, is_active, permissions)
      VALUES ('Administrador', 'ADMIN', crypt('123456', gen_salt('bf')), true, 
        '{"can_discount": true, "can_cancel": true, "can_manage_products": true}'::jsonb)
      RETURNING id INTO operator_id;
    END IF;
    
    -- Create a new register
    INSERT INTO pdv_cash_registers (opening_amount, opened_at, operator_id)
    VALUES (100.00, now(), operator_id)
    RETURNING id INTO register_id;
    
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
    
    RAISE NOTICE 'Test data inserted successfully';
  ELSE
    RAISE NOTICE 'Skipping test data insertion, entries already exist';
  END IF;
END $$;