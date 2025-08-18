/*
  # Fix Cash Register Summary Calculation

  1. Changes
    - Fix the close_pdv_cash_register function to correctly calculate the difference
    - Update get_pdv_cash_summary function to properly calculate all transaction totals
    - Ensure proper calculation of expected balance and difference
    - Add support for including delivery sales in the summary

  2. Features
    - More accurate cash register summary
    - Better error handling and reporting
    - Improved calculation of expected balance
*/

-- Fix the close_pdv_cash_register function to correctly calculate the difference
CREATE OR REPLACE FUNCTION close_pdv_cash_register(
  p_register_id uuid,
  p_closing_amount decimal(10,2)
) RETURNS jsonb LANGUAGE plpgsql AS $$
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
  WHERE id = p_register_id;
  
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
  summary_data := get_pdv_cash_summary(p_register_id);
  
  IF (summary_data->>'success')::boolean = false THEN
    RETURN summary_data;
  END IF;
  
  expected_balance := (summary_data->'data'->>'expected_balance')::decimal(10,2);
  
  -- Calculate difference (closing_amount - expected_balance)
  difference_amount := p_closing_amount - expected_balance;
  
  -- Update register - Using parameter names that don't conflict with column names
  UPDATE pdv_cash_registers
  SET 
    closed_at = now(),
    closing_amount = p_closing_amount,
    difference = difference_amount
  WHERE id = p_register_id;
  
  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'register_id', p_register_id,
      'closing_amount', p_closing_amount,
      'expected_balance', expected_balance,
      'difference', difference_amount,
      'closed_at', now()
    )
  );
EXCEPTION WHEN OTHERS THEN
  -- Log the error
  PERFORM log_pdv_error(SQLERRM, jsonb_build_object(
    'register_id', p_register_id,
    'closing_amount', p_closing_amount,
    'error', SQLERRM,
    'context', 'close_pdv_cash_register function'
  ));
  
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Update get_pdv_cash_summary function to properly calculate totals
CREATE OR REPLACE FUNCTION get_pdv_cash_summary(p_register_id uuid, include_delivery boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
    v_register_data record;
    v_opening_amount numeric := 0;
    v_sales_total numeric := 0;
    v_delivery_total numeric := 0;
    v_sales_count integer := 0;
    v_delivery_count integer := 0;
    v_other_income_total numeric := 0;
    v_total_expense numeric := 0;
    v_expected_balance numeric := 0;
    v_actual_balance numeric := 0;
    v_difference numeric := 0;
    v_total_all_sales numeric := 0;
    v_total_income numeric := 0;
    v_sales_data jsonb := '{}'::jsonb;
    v_cash_entries_count integer := 0;
    v_debug_info jsonb;
BEGIN
    -- Get register data
    SELECT * INTO v_register_data
    FROM pdv_cash_registers
    WHERE id = p_register_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cash register not found',
            'data', jsonb_build_object(
                'opening_amount', 0,
                'sales_total', 0,
                'delivery_total', 0,
                'total_all_sales', 0,
                'sales_count', 0,
                'delivery_count', 0,
                'total_income', 0,
                'other_income_total', 0,
                'total_expense', 0,
                'expected_balance', 0,
                'actual_balance', 0,
                'difference', 0,
                'sales', '{}'::jsonb
            )
        );
    END IF;
    
    -- Set opening amount
    v_opening_amount := v_register_data.opening_amount;
    
    -- Check if there are any entries for this register
    SELECT COUNT(*) INTO v_cash_entries_count
    FROM pdv_cash_entries
    WHERE register_id = p_register_id;
    
    -- Calculate PDV sales total (from cash entries)
    SELECT 
        COALESCE(SUM(amount), 0),
        COUNT(*)
    INTO 
        v_sales_total,
        v_sales_count
    FROM pdv_cash_entries
    WHERE register_id = p_register_id
      AND type = 'income'
      AND description LIKE 'Venda #%';
    
    -- Calculate delivery sales total (from cash entries)
    SELECT 
        COALESCE(SUM(amount), 0),
        COUNT(*)
    INTO 
        v_delivery_total,
        v_delivery_count
    FROM pdv_cash_entries
    WHERE register_id = p_register_id
      AND type = 'income'
      AND description LIKE 'Delivery #%';
    
    -- Calculate other income (non-sales)
    SELECT 
        COALESCE(SUM(amount), 0)
    INTO 
        v_other_income_total
    FROM pdv_cash_entries
    WHERE register_id = p_register_id
      AND type = 'income'
      AND description NOT LIKE 'Venda #%'
      AND description NOT LIKE 'Delivery #%';
    
    -- Calculate expense total
    SELECT 
        COALESCE(SUM(amount), 0)
    INTO 
        v_total_expense
    FROM pdv_cash_entries
    WHERE register_id = p_register_id
      AND type = 'expense';
    
    -- Calculate total of all sales (PDV + delivery)
    v_total_all_sales := v_sales_total + v_delivery_total;
    
    -- Calculate total income (all income entries)
    v_total_income := v_sales_total + v_delivery_total + v_other_income_total;
    
    -- Calculate expected balance
    v_expected_balance := v_opening_amount + v_total_income - v_total_expense;
    
    -- Set actual balance (for open registers, it's the expected balance)
    v_actual_balance := COALESCE(v_register_data.closing_amount, v_expected_balance);
    
    -- Calculate difference (actual - expected)
    v_difference := v_actual_balance - v_expected_balance;
    
    -- Get sales data by payment method
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
        WHERE register_id = p_register_id
          AND type = 'income'
          AND (description LIKE 'Venda #%' OR description LIKE 'Delivery #%')
        GROUP BY payment_method, source
    ),
    sales_summary AS (
        SELECT 
            payment_method,
            source,
            total,
            count
        FROM sales_by_method
    )
    SELECT 
        jsonb_object_agg(
            payment_method || '_' || source,
            jsonb_build_object(
                'total', total,
                'count', count
            )
        )
    INTO v_sales_data
    FROM sales_summary;
    
    -- Create debug info
    SELECT jsonb_build_object(
        'register_id', p_register_id,
        'opening_amount', v_opening_amount,
        'sales_total', v_sales_total,
        'delivery_total', v_delivery_total,
        'other_income_total', v_other_income_total,
        'total_expense', v_total_expense,
        'expected_balance', v_expected_balance,
        'actual_balance', v_actual_balance,
        'difference', v_difference,
        'entries_count', v_cash_entries_count,
        'include_delivery', include_delivery
    ) INTO v_debug_info;
    
    -- Return the result
    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'opening_amount', v_opening_amount,
            'sales_total', v_sales_total,
            'delivery_total', v_delivery_total,
            'total_all_sales', v_total_all_sales,
            'sales_count', v_sales_count,
            'delivery_count', v_delivery_count,
            'total_income', v_total_income,
            'other_income_total', v_other_income_total,
            'total_expense', v_total_expense,
            'expected_balance', v_expected_balance,
            'actual_balance', v_actual_balance,
            'difference', v_difference,
            'is_open', v_register_data.closed_at IS NULL,
            'opened_at', v_register_data.opened_at,
            'closed_at', v_register_data.closed_at,
            'sales', COALESCE(v_sales_data, '{}'::jsonb),
            'debug', v_debug_info
        )
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Return error with default values
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'data', jsonb_build_object(
            'opening_amount', 0,
            'sales_total', 0,
            'delivery_total', 0,
            'total_all_sales', 0,
            'sales_count', 0,
            'delivery_count', 0,
            'total_income', 0,
            'other_income_total', 0,
            'total_expense', 0,
            'expected_balance', 0,
            'actual_balance', 0,
            'difference', 0,
            'sales', '{}'::jsonb
        )
    );
END;
$$;