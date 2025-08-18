/*
  # Fix Cash Register Closing Function

  1. Changes
    - Fix the ambiguous column reference in close_pdv_cash_register function
    - Ensure proper table qualification for closing_amount
    - Improve error handling and reporting
*/

-- Fix the close_pdv_cash_register function to resolve ambiguous column reference
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
  
  -- Update register - FIX: Qualify the column names to avoid ambiguity
  UPDATE pdv_cash_registers
  SET 
    closed_at = now(),
    closing_amount = close_pdv_cash_register.closing_amount,
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