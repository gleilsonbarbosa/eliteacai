/*
  # PDV Cash Register System

  1. New Tables
    - `pdv_cash_registers` - Tracks cash register opening/closing
    - `pdv_cash_entries` - Records cash entries and expenses

  2. Functions
    - `process_pdv_sale` - Fixed function to handle sales properly
    - `get_default_operator_id` - Safely gets a valid operator ID

  3. Security
    - RLS enabled on all tables
    - Public access policies for demo purposes
*/

-- Create a function to get default operator ID
CREATE OR REPLACE FUNCTION get_default_operator_id()
RETURNS uuid AS $$
DECLARE
  op_id uuid;
BEGIN
  -- Try to get admin operator ID
  SELECT id INTO op_id FROM pdv_operators WHERE code = 'ADMIN' LIMIT 1;
  
  -- If not found, try admin
  IF op_id IS NULL THEN
    SELECT id INTO op_id FROM pdv_operators WHERE code = 'admin' LIMIT 1;
  END IF;
  
  -- If still not found, get any operator
  IF op_id IS NULL THEN
    SELECT id INTO op_id FROM pdv_operators LIMIT 1;
  END IF;
  
  -- If no operators exist, create a default one
  IF op_id IS NULL THEN
    INSERT INTO pdv_operators (
      name, 
      code, 
      password_hash, 
      is_active, 
      permissions
    ) VALUES (
      'Default Operator',
      'DEFAULT',
      crypt('123456', gen_salt('bf')),
      true,
      '{"can_discount": true, "can_cancel": true, "can_manage_products": true}'
    ) RETURNING id INTO op_id;
  END IF;
  
  RETURN op_id;
END;
$$ LANGUAGE plpgsql;

-- Create error logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS pdv_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_message TEXT NOT NULL,
  error_data JSONB,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Function to log PDV errors
CREATE OR REPLACE FUNCTION log_pdv_error(error_message TEXT, error_data JSONB)
RETURNS VOID AS $$
BEGIN
  INSERT INTO pdv_error_logs (error_message, error_data, created_at)
  VALUES (error_message, error_data, now());
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on error logs
ALTER TABLE pdv_error_logs ENABLE ROW LEVEL SECURITY;

-- Allow all operations on error logs for demo
CREATE POLICY "Allow all operations on pdv_error_logs"
  ON pdv_error_logs
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create index on error logs
CREATE INDEX IF NOT EXISTS idx_pdv_error_logs_created_at ON pdv_error_logs(created_at);

-- Create a function to safely process sales
CREATE OR REPLACE FUNCTION process_pdv_sale(
  sale_data jsonb,
  items_data jsonb
) RETURNS jsonb AS $$
DECLARE
  new_sale_id uuid;
  new_sale_number integer;
  operator_id uuid;
  result jsonb;
BEGIN
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
    is_cancelled
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
    (sale_data->>'is_cancelled')::boolean
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

-- Create cash register tables
CREATE TABLE IF NOT EXISTS pdv_cash_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opening_amount decimal(10,2) NOT NULL,
  closing_amount decimal(10,2),
  difference decimal(10,2),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  operator_id uuid REFERENCES pdv_operators(id)
);

CREATE TABLE IF NOT EXISTS pdv_cash_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  register_id uuid NOT NULL REFERENCES pdv_cash_registers(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  amount decimal(10,2) NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  payment_method text NOT NULL DEFAULT 'dinheiro',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE pdv_cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdv_cash_entries ENABLE ROW LEVEL SECURITY;

-- Policies for public access (demo)
CREATE POLICY "Allow all operations on pdv_cash_registers"
  ON pdv_cash_registers
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on pdv_cash_entries"
  ON pdv_cash_entries
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pdv_cash_registers_opened_at ON pdv_cash_registers(opened_at);
CREATE INDEX IF NOT EXISTS idx_pdv_cash_registers_closed_at ON pdv_cash_registers(closed_at);
CREATE INDEX IF NOT EXISTS idx_pdv_cash_entries_register_id ON pdv_cash_entries(register_id);
CREATE INDEX IF NOT EXISTS idx_pdv_cash_entries_type ON pdv_cash_entries(type);
CREATE INDEX IF NOT EXISTS idx_pdv_cash_entries_created_at ON pdv_cash_entries(created_at);

-- Function to get cash register summary
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
  
  -- Get sales data
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COUNT(*)
  INTO sales_total, sales_count
  FROM pdv_sales
  WHERE created_at >= register_data.opened_at
    AND (register_data.closed_at IS NULL OR created_at <= register_data.closed_at)
    AND is_cancelled = false
    AND payment_type = 'dinheiro';
  
  -- Get income/expense data
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
  INTO income_total, expense_total
  FROM pdv_cash_entries
  WHERE register_id = register_data.id
    AND payment_method = 'dinheiro';
  
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

-- Function to close cash register
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