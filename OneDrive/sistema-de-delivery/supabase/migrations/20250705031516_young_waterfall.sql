/*
  # PDV Cash Register Integration

  1. New Features
    - Automatically link PDV sales to active cash register
    - Track all cash transactions in the cash register
    - Ensure all sales are accounted for during cash register closing

  2. Changes
    - Add trigger to link sales to cash register
    - Update process_pdv_sale function to handle cash register integration
    - Add function to get active cash register
*/

-- Function to get the currently active cash register
CREATE OR REPLACE FUNCTION get_active_cash_register()
RETURNS uuid AS $$
DECLARE
  register_id uuid;
BEGIN
  -- Get the most recently opened and not closed register
  SELECT id INTO register_id
  FROM pdv_cash_registers
  WHERE closed_at IS NULL
  ORDER BY opened_at DESC
  LIMIT 1;
  
  -- If no active register, return null
  RETURN register_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to link cash sales to the active register
CREATE OR REPLACE FUNCTION link_sale_to_cash_register()
RETURNS TRIGGER AS $$
DECLARE
  active_register_id uuid;
BEGIN
  -- Only process cash sales
  IF NEW.payment_type = 'dinheiro' THEN
    -- Get active cash register
    active_register_id := get_active_cash_register();
    
    -- If there's an active register, create a cash entry
    IF active_register_id IS NOT NULL THEN
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
        'dinheiro',
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
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to link sales to cash register
DROP TRIGGER IF EXISTS trg_link_sale_to_cash_register ON pdv_sales;
CREATE TRIGGER trg_link_sale_to_cash_register
  AFTER INSERT ON pdv_sales
  FOR EACH ROW
  EXECUTE FUNCTION link_sale_to_cash_register();

-- Update the process_pdv_sale function to check for active cash register
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
  is_cash_payment boolean;
BEGIN
  -- Check if this is a cash payment
  is_cash_payment := (sale_data->>'payment_type') = 'dinheiro';
  
  -- If cash payment, check for active register
  IF is_cash_payment THEN
    active_register_id := get_active_cash_register();
    
    IF active_register_id IS NULL THEN
      -- No active cash register
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Não há caixa aberto. Por favor, abra o caixa antes de realizar vendas em dinheiro.',
        'error_code', 'NO_ACTIVE_REGISTER'
      );
    END IF;
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

-- Function to validate cash register operations
CREATE OR REPLACE FUNCTION validate_cash_register_operation()
RETURNS TRIGGER AS $$
BEGIN
  -- For cash entries, ensure there's an active register
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (
      SELECT 1 FROM pdv_cash_registers 
      WHERE id = NEW.register_id AND closed_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Cannot add entry to a closed or non-existent cash register';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate cash entries
DROP TRIGGER IF EXISTS trg_validate_cash_entry ON pdv_cash_entries;
CREATE TRIGGER trg_validate_cash_entry
  BEFORE INSERT ON pdv_cash_entries
  FOR EACH ROW
  EXECUTE FUNCTION validate_cash_register_operation();

-- Update get_pdv_cash_summary function to include all sales
CREATE OR REPLACE FUNCTION get_pdv_cash_summary(register_id uuid)
RETURNS jsonb AS $$
DECLARE
  register_data record;
  sales_total decimal(10,2);
  sales_count integer;
  income_total decimal(10,2);
  expense_total decimal(10,2);
  expected_balance decimal(10,2);
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
  
  -- Get sales data from entries
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'income' AND description LIKE 'Venda #%' THEN amount ELSE 0 END), 0),
    COUNT(CASE WHEN type = 'income' AND description LIKE 'Venda #%' THEN 1 ELSE NULL END)
  INTO sales_total, sales_count
  FROM pdv_cash_entries
  WHERE register_id = register_data.id
    AND payment_method = 'dinheiro';
  
  -- Get income/expense data (excluding sales)
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'income' AND description NOT LIKE 'Venda #%' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
  INTO income_total, expense_total
  FROM pdv_cash_entries
  WHERE register_id = register_data.id;
  
  -- Calculate expected balance
  expected_balance := register_data.opening_amount + sales_total + income_total - expense_total;
  
  -- Build result
  result := jsonb_build_object(
    'opening_amount', register_data.opening_amount,
    'sales_total', sales_total,
    'sales_count', sales_count,
    'income_total', income_total,
    'expense_total', expense_total,
    'expected_balance', expected_balance,
    'actual_balance', COALESCE(register_data.closing_amount, expected_balance),
    'difference', COALESCE(register_data.closing_amount - expected_balance, 0),
    'is_open', register_data.closed_at IS NULL,
    'opened_at', register_data.opened_at,
    'closed_at', register_data.closed_at
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

-- Function to check if cash register can be closed
CREATE OR REPLACE FUNCTION close_pdv_cash_register(
  register_id uuid,
  closing_amount decimal(10,2)
) RETURNS jsonb AS $$
DECLARE
  register_data record;
  expected_balance decimal(10,2);
  difference decimal(10,2);
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
  difference := closing_amount - expected_balance;
  
  -- Update register
  UPDATE pdv_cash_registers
  SET 
    closed_at = now(),
    closing_amount = closing_amount,
    difference = difference
  WHERE id = register_id;
  
  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'register_id', register_id,
      'closing_amount', closing_amount,
      'expected_balance', expected_balance,
      'difference', difference,
      'closed_at', now()
    )
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql;