/*
  # Fix Cash Register Integration for Delivery Orders

  1. Changes
    - Update link_sale_to_cash_register function to handle both PDV and delivery orders
    - Add trigger to orders table to track delivery orders in cash register
    - Ensure all sales are properly tracked regardless of channel

  2. Security
    - Maintain existing RLS policies
    - No changes to access control
*/

-- Create a function to link delivery orders to cash register
CREATE OR REPLACE FUNCTION link_delivery_order_to_cash_register()
RETURNS TRIGGER AS $$
DECLARE
  active_register_id uuid;
  payment_method text;
BEGIN
  -- Get active cash register
  active_register_id := get_active_cash_register();
  
  -- If there's an active register, create a cash entry
  IF active_register_id IS NOT NULL THEN
    -- Map payment method
    CASE NEW.payment_method
      WHEN 'money' THEN payment_method := 'dinheiro';
      WHEN 'pix' THEN payment_method := 'pix';
      WHEN 'card' THEN payment_method := 'cartao_credito';
      ELSE payment_method := 'outros';
    END CASE;
    
    -- Log the order as an income entry in the cash register
    INSERT INTO pdv_cash_entries (
      register_id,
      type,
      amount,
      description,
      payment_method,
      created_at
    ) VALUES (
      active_register_id,
      'income',
      NEW.total_price,
      'Delivery #' || substring(NEW.id::text, 1, 8),
      payment_method,
      NEW.created_at
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to link delivery orders to cash register
DROP TRIGGER IF EXISTS trg_link_delivery_order_to_cash_register ON orders;
CREATE TRIGGER trg_link_delivery_order_to_cash_register
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION link_delivery_order_to_cash_register();

-- Update get_pdv_cash_summary function to include delivery orders
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
  
  -- Get sales data by payment method (including both PDV and delivery)
  WITH sales_by_method AS (
    SELECT 
      payment_method,
      SUM(amount) as total,
      COUNT(*) as count,
      'pdv' as source
    FROM pdv_cash_entries
    WHERE register_id = register_data.id
      AND type = 'income'
      AND description LIKE 'Venda #%'
    GROUP BY payment_method
    
    UNION ALL
    
    SELECT 
      payment_method,
      SUM(amount) as total,
      COUNT(*) as count,
      'delivery' as source
    FROM pdv_cash_entries
    WHERE register_id = register_data.id
      AND type = 'income'
      AND description LIKE 'Delivery #%'
    GROUP BY payment_method
  ),
  sales_summary AS (
    SELECT 
      payment_method,
      SUM(total) as total,
      SUM(count) as count
    FROM sales_by_method
    GROUP BY payment_method
  )
  SELECT jsonb_object_agg(
    payment_method,
    jsonb_build_object(
      'total', total,
      'count', count
    )
  ) INTO sales_data
  FROM sales_summary;
  
  -- Get total cash sales (both PDV and delivery)
  SELECT COALESCE(SUM(amount), 0)
  INTO expected_balance
  FROM pdv_cash_entries
  WHERE register_id = register_data.id
    AND payment_method = 'dinheiro'
    AND type = 'income';
  
  -- Add opening amount
  expected_balance := expected_balance + register_data.opening_amount;
  
  -- Subtract expenses
  SELECT expected_balance - COALESCE(SUM(amount), 0)
  INTO expected_balance
  FROM pdv_cash_entries
  WHERE register_id = register_data.id
    AND type = 'expense';
  
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
  
  -- Calculate totals for PDV sales
  SELECT 
    COALESCE(SUM(CASE WHEN description LIKE 'Venda #%' THEN amount ELSE 0 END), 0),
    COUNT(CASE WHEN description LIKE 'Venda #%' THEN 1 ELSE NULL END)
  INTO 
    sales_total,
    sales_count
  FROM pdv_cash_entries
  WHERE register_id = register_data.id
    AND type = 'income';
  
  -- Calculate totals for delivery orders
  SELECT 
    COALESCE(SUM(CASE WHEN description LIKE 'Delivery #%' THEN amount ELSE 0 END), 0),
    COUNT(CASE WHEN description LIKE 'Delivery #%' THEN 1 ELSE NULL END)
  INTO 
    delivery_total,
    delivery_count
  FROM pdv_cash_entries
  WHERE register_id = register_data.id
    AND type = 'income';
  
  -- Calculate other income/expense
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'income' AND description NOT LIKE 'Venda #%' AND description NOT LIKE 'Delivery #%' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
  INTO 
    income_total,
    expense_total
  FROM pdv_cash_entries
  WHERE register_id = register_data.id;
  
  -- Build complete result
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
    'total_sales', sales_total,
    'sales_count', sales_count,
    'delivery_total', delivery_total,
    'delivery_count', delivery_count,
    'total_income', income_total,
    'total_expense', expense_total
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'data', result
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql;