/*
  # Fix Cash Register Total Sales Calculation

  1. Changes
    - Update get_pdv_cash_summary function to properly calculate total sales from all channels
    - Fix issue with delivery sales not being included in the total
    - Ensure all payment methods are properly tracked and reported

  2. Security
    - No changes to existing RLS policies
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
  
  -- Calculate total of all sales (PDV + delivery)
  -- FIXED: Ensure this calculation is correct and not zero
  total_all_sales := COALESCE(sales_total, 0) + COALESCE(delivery_total, 0);
  
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
  -- FIXED: Ensure all fields are properly populated
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
    'total_all_sales', total_all_sales
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

-- Fix the link_delivery_order_to_cash_register function to ensure delivery orders are properly recorded
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

-- Fix the link_sale_to_cash_register function to ensure PDV sales are properly recorded
CREATE OR REPLACE FUNCTION link_sale_to_cash_register()
RETURNS TRIGGER AS $$
DECLARE
  active_register_id uuid;
  payment_method text;
BEGIN
  -- Get active cash register
  active_register_id := get_active_cash_register();
  
  -- If there's an active register, create a cash entry for all payment types
  IF active_register_id IS NOT NULL THEN
    -- Map payment type to payment method
    CASE NEW.payment_type
      WHEN 'dinheiro' THEN payment_method := 'dinheiro';
      WHEN 'pix' THEN payment_method := 'pix';
      WHEN 'cartao_credito' THEN payment_method := 'cartao_credito';
      WHEN 'cartao_debito' THEN payment_method := 'cartao_debito';
      WHEN 'voucher' THEN payment_method := 'voucher';
      WHEN 'misto' THEN payment_method := 'misto';
      ELSE payment_method := 'outros';
    END CASE;
    
    -- Log the sale as an income entry in the cash register
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
      NEW.total_amount,
      'Venda #' || NEW.sale_number,
      payment_method,
      NEW.created_at
    );
  ELSE
    -- Log warning if no active register
    PERFORM log_pdv_error('No active cash register for sale', jsonb_build_object(
      'sale_id', NEW.id,
      'sale_number', NEW.sale_number,
      'amount', NEW.total_amount,
      'payment_type', NEW.payment_type
    ));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;