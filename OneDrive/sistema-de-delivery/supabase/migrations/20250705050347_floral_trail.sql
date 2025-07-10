/*
  # Create close_pdv_cash_register function

  1. New Functions
    - `close_pdv_cash_register` - Handles closing cash register with proper calculations
    - `get_pdv_cash_summary` - Gets cash register summary data

  2. Features
    - Calculates expected vs actual balance
    - Updates cash register with closing information
    - Returns success/error status with detailed data
    - Handles delivery orders integration
*/

-- Function to get PDV cash register summary
CREATE OR REPLACE FUNCTION get_pdv_cash_summary(register_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  register_data pdv_cash_registers%ROWTYPE;
  sales_total numeric := 0;
  sales_count integer := 0;
  delivery_total numeric := 0;
  delivery_count integer := 0;
  income_total numeric := 0;
  expense_total numeric := 0;
  expected_balance numeric := 0;
  result jsonb;
BEGIN
  -- Get register data
  SELECT * INTO register_data
  FROM pdv_cash_registers
  WHERE id = register_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Caixa não encontrado'
    );
  END IF;
  
  -- Get PDV sales total and count
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COUNT(*)
  INTO sales_total, sales_count
  FROM pdv_sales
  WHERE created_at >= register_data.opened_at
    AND (register_data.closed_at IS NULL OR created_at <= register_data.closed_at)
    AND is_cancelled = false;
  
  -- Get delivery orders total and count (orders that were paid and delivered)
  SELECT 
    COALESCE(SUM(total_price), 0),
    COUNT(*)
  INTO delivery_total, delivery_count
  FROM orders
  WHERE created_at >= register_data.opened_at
    AND (register_data.closed_at IS NULL OR created_at <= register_data.closed_at)
    AND status IN ('delivered', 'confirmed', 'preparing', 'out_for_delivery', 'ready_for_pickup')
    AND payment_method IN ('money', 'card'); -- Only cash and card payments count for cash register
  
  -- Get cash entries totals
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
  INTO income_total, expense_total
  FROM pdv_cash_entries
  WHERE register_id = get_pdv_cash_summary.register_id;
  
  -- Calculate expected balance
  expected_balance := register_data.opening_amount + sales_total + delivery_total + income_total - expense_total;
  
  -- Build result
  result := jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'opening_amount', register_data.opening_amount,
      'sales_total', sales_total,
      'sales_count', sales_count,
      'delivery_total', delivery_total,
      'delivery_count', delivery_count,
      'total_all_sales', sales_total + delivery_total,
      'income_total', income_total,
      'expense_total', expense_total,
      'expected_balance', expected_balance,
      'actual_balance', COALESCE(register_data.closing_amount, expected_balance),
      'difference', COALESCE(register_data.closing_amount, expected_balance) - expected_balance
    )
  );
  
  RETURN result;
END;
$$;

-- Function to close PDV cash register
CREATE OR REPLACE FUNCTION close_pdv_cash_register(
  register_id uuid,
  closing_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  register_data pdv_cash_registers%ROWTYPE;
  summary_data jsonb;
  expected_balance numeric;
  difference_amount numeric;
  result jsonb;
BEGIN
  -- Get register data
  SELECT * INTO register_data
  FROM pdv_cash_registers
  WHERE id = register_id AND closed_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Caixa não encontrado ou já fechado'
    );
  END IF;
  
  -- Get summary to calculate expected balance
  summary_data := get_pdv_cash_summary(register_id);
  
  IF (summary_data->>'success')::boolean = false THEN
    RETURN summary_data;
  END IF;
  
  expected_balance := (summary_data->'data'->>'expected_balance')::numeric;
  difference_amount := closing_amount - expected_balance;
  
  -- Update register with closing information
  UPDATE pdv_cash_registers
  SET 
    closing_amount = close_pdv_cash_register.closing_amount,
    difference = difference_amount,
    closed_at = now()
  WHERE id = register_id;
  
  -- Return success with updated data
  result := jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'id', register_id,
      'opening_amount', register_data.opening_amount,
      'closing_amount', closing_amount,
      'expected_balance', expected_balance,
      'difference', difference_amount,
      'closed_at', now()
    )
  );
  
  RETURN result;
END;
$$;