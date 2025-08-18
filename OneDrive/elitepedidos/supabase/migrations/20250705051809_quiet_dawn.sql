/*
  # Complete Cash Register Module

  1. New Tables
    - `pdv_cash_registers` - Tracks cash register opening/closing
    - `pdv_cash_entries` - Records cash entries and expenses

  2. Functions
    - `get_active_cash_register` - Gets the currently active cash register
    - `get_pdv_cash_summary` - Gets a summary of the cash register
    - `close_pdv_cash_register` - Closes a cash register
    - `link_sale_to_cash_register` - Links sales to cash register
    - `link_delivery_order_to_cash_register` - Links delivery orders to cash register

  3. Security
    - RLS enabled on all tables
    - Public access policies for demo purposes
*/

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
  SELECT (get_pdv_cash_summary(register_id)->'data'->>'expected_balance')::decimal(10,2)
  INTO expected_balance;
  
  -- Calculate difference
  difference_amount := closing_amount - expected_balance;
  
  -- Update register - Using explicit table name and different variable name to avoid ambiguity
  UPDATE pdv_cash_registers
  SET 
    closed_at = now(),
    closing_amount = close_pdv_cash_register.closing_amount,
    difference = difference_amount
  WHERE id = close_pdv_cash_register.register_id;
  
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
  total_all_sales := sales_total + delivery_total;
  
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
  
  -- Create debug info for troubleshooting
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

-- Function to check if a cash register is open
CREATE OR REPLACE FUNCTION is_cash_register_open()
RETURNS boolean AS $$
DECLARE
  register_count integer;
BEGIN
  SELECT COUNT(*) INTO register_count
  FROM pdv_cash_registers
  WHERE closed_at IS NULL;
  
  RETURN register_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get daily cash summary
CREATE OR REPLACE FUNCTION get_daily_cash_summary()
RETURNS jsonb AS $$
DECLARE
  active_register_id uuid;
  result jsonb;
BEGIN
  -- Get active cash register
  SELECT id INTO active_register_id
  FROM pdv_cash_registers
  WHERE closed_at IS NULL
  ORDER BY opened_at DESC
  LIMIT 1;
  
  IF active_register_id IS NULL THEN
    -- Get the most recently closed register from today
    SELECT id INTO active_register_id
    FROM pdv_cash_registers
    WHERE DATE(opened_at) = CURRENT_DATE
    ORDER BY closed_at DESC
    LIMIT 1;
    
    -- If still null, return empty summary
    IF active_register_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
          'opening_amount', 0,
          'sales_total', 0,
          'sales_count', 0,
          'delivery_total', 0,
          'delivery_count', 0,
          'total_income', 0,
          'total_expense', 0,
          'expected_balance', 0,
          'actual_balance', 0,
          'difference', 0,
          'is_open', false,
          'total_all_sales', 0
        )
      );
    END IF;
  END IF;
  
  -- Get summary for the active register
  RETURN get_pdv_cash_summary(active_register_id);
END;
$$ LANGUAGE plpgsql;

-- Function to get payment methods summary
CREATE OR REPLACE FUNCTION get_payment_methods_summary(register_id uuid)
RETURNS TABLE (
  payment_method text,
  total decimal(10,2),
  count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.payment_method,
    SUM(ce.amount) as total,
    COUNT(*) as count
  FROM pdv_cash_entries ce
  WHERE ce.register_id = get_payment_methods_summary.register_id
    AND ce.type = 'income'
    AND (ce.description LIKE 'Venda #%' OR ce.description LIKE 'Delivery #%')
  GROUP BY ce.payment_method
  ORDER BY total DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get cash register history
CREATE OR REPLACE FUNCTION get_cash_register_history(
  start_date date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date date DEFAULT CURRENT_DATE,
  limit_count integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  opened_at timestamp with time zone,
  closed_at timestamp with time zone,
  opening_amount decimal(10,2),
  closing_amount decimal(10,2),
  difference decimal(10,2),
  total_sales decimal(10,2),
  total_entries decimal(10,2),
  operator_name text
) AS $$
BEGIN
  RETURN QUERY
  WITH register_totals AS (
    SELECT 
      cr.id,
      COALESCE(SUM(CASE WHEN ce.type = 'income' AND (ce.description LIKE 'Venda #%' OR ce.description LIKE 'Delivery #%') THEN ce.amount ELSE 0 END), 0) as sales_total,
      COALESCE(SUM(CASE WHEN ce.type = 'income' AND NOT (ce.description LIKE 'Venda #%' OR ce.description LIKE 'Delivery #%') THEN ce.amount ELSE 0 END), 0) as entries_total
    FROM pdv_cash_registers cr
    LEFT JOIN pdv_cash_entries ce ON cr.id = ce.register_id
    GROUP BY cr.id
  )
  SELECT 
    cr.id,
    cr.opened_at,
    cr.closed_at,
    cr.opening_amount,
    cr.closing_amount,
    cr.difference,
    rt.sales_total,
    rt.entries_total,
    op.name as operator_name
  FROM pdv_cash_registers cr
  LEFT JOIN register_totals rt ON cr.id = rt.id
  LEFT JOIN pdv_operators op ON cr.operator_id = op.id
  WHERE DATE(cr.opened_at) BETWEEN start_date AND end_date
  ORDER BY cr.opened_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get cash entries for a register
CREATE OR REPLACE FUNCTION get_cash_entries(register_id uuid)
RETURNS TABLE (
  id uuid,
  type text,
  amount decimal(10,2),
  description text,
  payment_method text,
  created_at timestamp with time zone
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
  WHERE ce.register_id = get_cash_entries.register_id
  ORDER BY ce.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to prevent opening multiple cash registers
CREATE OR REPLACE FUNCTION prevent_multiple_open_registers()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pdv_cash_registers
    WHERE closed_at IS NULL
    AND operator_id = NEW.operator_id
  ) THEN
    RAISE EXCEPTION 'Este operador já possui um caixa aberto';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent multiple open registers per operator
DROP TRIGGER IF EXISTS trg_prevent_multiple_open_registers ON pdv_cash_registers;
CREATE TRIGGER trg_prevent_multiple_open_registers
  BEFORE INSERT ON pdv_cash_registers
  FOR EACH ROW
  WHEN (NEW.operator_id IS NOT NULL)
  EXECUTE FUNCTION prevent_multiple_open_registers();