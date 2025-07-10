/*
  # Update PDV Cash Register System to Track All Payment Types

  1. Changes
    - Update link_sale_to_cash_register function to track all payment types
    - Update process_pdv_sale function to require an active cash register
    - Update get_pdv_cash_summary function to include all payment types

  2. Features
    - All sales (cash, card, PIX) are now tracked in the cash register
    - Cash register summary includes breakdowns by payment method
    - Improved error handling and reporting
*/

-- Update the link_sale_to_cash_register function to track all payment types
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

-- Update the process_pdv_sale function to check for active cash register for all payment types
CREATE OR REPLACE FUNCTION process_pdv_sale(
  sale_data jsonb,
  items_data jsonb
) RETURNS jsonb AS $$
DECLARE
  new_sale_id uuid;
  new_sale_number integer;
  operator_id uuid;
  active_register_id uuid;
  result jsonb;
BEGIN
  -- Check for active register for all payment types
  active_register_id := get_active_cash_register();
  
  IF active_register_id IS NULL THEN
    -- No active cash register
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Não há caixa aberto. Por favor, abra o caixa antes de realizar vendas.',
      'error_code', 'NO_ACTIVE_REGISTER'
    );
  END IF;
  
  -- Get operator ID or use default
  IF sale_data->>'operator_id' = 'admin-id' OR sale_data->>'operator_id' IS NULL THEN
    operator_id := get_default_operator_id();
  ELSE
    BEGIN
      operator_id := (sale_data->>'operator_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      operator_id := get_default_operator_id();
    END;
  END IF;
  
  -- Insert the sale
  INSERT INTO pdv_sales (
    operator_id,
    customer_name,
    customer_phone,
    subtotal,
    discount_amount,
    discount_percentage,
    total_amount,
    payment_type,
    payment_details,
    change_amount,
    notes,
    is_cancelled,
    channel
  ) VALUES (
    operator_id,
    sale_data->>'customer_name',
    sale_data->>'customer_phone',
    (sale_data->>'subtotal')::decimal,
    (sale_data->>'discount_amount')::decimal,
    (sale_data->>'discount_percentage')::decimal,
    (sale_data->>'total_amount')::decimal,
    (sale_data->>'payment_type')::pdv_payment_type,
    sale_data->'payment_details',
    (sale_data->>'change_amount')::decimal,
    sale_data->>'notes',
    (sale_data->>'is_cancelled')::boolean,
    COALESCE(sale_data->>'channel', 'pdv')
  )
  RETURNING id, sale_number INTO new_sale_id, new_sale_number;
  
  -- Insert sale items
  FOR i IN 0..jsonb_array_length(items_data) - 1 LOOP
    INSERT INTO pdv_sale_items (
      sale_id,
      product_id,
      product_code,
      product_name,
      quantity,
      weight_kg,
      unit_price,
      price_per_gram,
      discount_amount,
      subtotal
    ) VALUES (
      new_sale_id,
      (items_data->i->>'product_id')::uuid,
      items_data->i->>'product_code',
      items_data->i->>'product_name',
      (items_data->i->>'quantity')::decimal,
      (items_data->i->>'weight_kg')::decimal,
      (items_data->i->>'unit_price')::decimal,
      (items_data->i->>'price_per_gram')::decimal,
      (items_data->i->>'discount_amount')::decimal,
      (items_data->i->>'subtotal')::decimal
    );
  END LOOP;
  
  -- Return the result
  SELECT jsonb_build_object(
    'id', new_sale_id,
    'sale_number', new_sale_number,
    'success', true,
    'message', 'Sale created successfully'
  ) INTO result;
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- Log the error
  PERFORM log_pdv_error(SQLERRM, jsonb_build_object(
    'sale_data', sale_data,
    'items_data', items_data,
    'error', SQLERRM,
    'context', 'process_pdv_sale function'
  ));
  
  -- Return error
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql;

-- Update get_pdv_cash_summary function to include all payment types
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
  
  -- Get sales data by payment method
  WITH sales_by_method AS (
    SELECT 
      payment_method,
      SUM(amount) as total,
      COUNT(*) as count
    FROM pdv_cash_entries
    WHERE register_id = register_data.id
      AND type = 'income'
      AND description LIKE 'Venda #%'
    GROUP BY payment_method
  )
  SELECT jsonb_object_agg(
    payment_method,
    jsonb_build_object(
      'total', total,
      'count', count
    )
  ) INTO sales_data
  FROM sales_by_method;
  
  -- Get total cash sales
  SELECT COALESCE(SUM(amount), 0)
  INTO expected_balance
  FROM pdv_cash_entries
  WHERE register_id = register_data.id
    AND payment_method = 'dinheiro';
  
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
  
  -- Calculate totals for convenience
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'income' AND description LIKE 'Venda #%' THEN amount ELSE 0 END), 0),
    COUNT(CASE WHEN type = 'income' AND description LIKE 'Venda #%' THEN 1 ELSE NULL END),
    COALESCE(SUM(CASE WHEN type = 'income' AND description NOT LIKE 'Venda #%' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
  INTO 
    sales_total,
    sales_count,
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