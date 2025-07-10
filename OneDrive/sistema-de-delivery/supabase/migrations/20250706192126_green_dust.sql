/*
  # Corrigir cálculo do saldo esperado no caixa

  1. Novas Funcionalidades
    - Atualizar a função get_pdv_cash_summary para considerar apenas transações em dinheiro no saldo esperado
    - Garantir que apenas vendas em dinheiro afetem o saldo físico do caixa
    - Corrigir o cálculo da diferença no fechamento do caixa

  2. Alterações
    - Modificar o cálculo do saldo esperado para considerar apenas transações em dinheiro
    - Manter o rastreamento de todas as vendas (PIX, cartão) para relatórios
    - Melhorar o tratamento de erros e depuração
*/

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS public.get_pdv_cash_summary(uuid);
DROP FUNCTION IF EXISTS public.get_pdv_cash_summary(boolean);
DROP FUNCTION IF EXISTS public.get_pdv_cash_summary();

-- Create a single, correct version of the function
CREATE OR REPLACE FUNCTION public.get_pdv_cash_summary(p_register_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_register_data record;
    v_register_id uuid;
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
    v_cash_sales_total numeric := 0;
    v_cash_delivery_total numeric := 0;
    v_cash_other_income numeric := 0;
    v_sales_data jsonb := '{}'::jsonb;
    v_cash_entries_count integer := 0;
    v_debug_info jsonb;
BEGIN
    -- If no register ID provided, get the active register
    IF p_register_id IS NULL THEN
        SELECT id INTO v_register_id
        FROM pdv_cash_registers
        WHERE closed_at IS NULL
        ORDER BY opened_at DESC
        LIMIT 1;
        
        IF v_register_id IS NULL THEN
            -- No open register found
            RETURN jsonb_build_object(
                'success', false,
                'error', 'No active cash register found',
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
    ELSE
        v_register_id := p_register_id;
    END IF;
    
    -- Get register data
    SELECT * INTO v_register_data
    FROM pdv_cash_registers
    WHERE id = v_register_id;
    
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
    WHERE register_id = v_register_id;
    
    -- If no entries, return zeros but with success
    IF v_cash_entries_count = 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'data', jsonb_build_object(
                'opening_amount', v_opening_amount,
                'sales_total', 0,
                'delivery_total', 0,
                'total_all_sales', 0,
                'sales_count', 0,
                'delivery_count', 0,
                'total_income', 0,
                'other_income_total', 0,
                'total_expense', 0,
                'expected_balance', v_opening_amount,
                'actual_balance', v_opening_amount,
                'difference', 0,
                'is_open', v_register_data.closed_at IS NULL,
                'opened_at', v_register_data.opened_at,
                'closed_at', v_register_data.closed_at,
                'sales', '{}'::jsonb
            )
        );
    END IF;
    
    -- Calculate PDV sales total (all payment methods)
    SELECT 
        COALESCE(SUM(amount), 0),
        COUNT(*)
    INTO 
        v_sales_total,
        v_sales_count
    FROM pdv_cash_entries
    WHERE register_id = v_register_id
      AND type = 'income'
      AND description LIKE 'Venda #%';
    
    -- Calculate delivery sales total (all payment methods)
    SELECT 
        COALESCE(SUM(amount), 0),
        COUNT(*)
    INTO 
        v_delivery_total,
        v_delivery_count
    FROM pdv_cash_entries
    WHERE register_id = v_register_id
      AND type = 'income'
      AND description LIKE 'Delivery #%';
    
    -- Calculate other income (non-sales)
    SELECT 
        COALESCE(SUM(amount), 0)
    INTO 
        v_other_income_total
    FROM pdv_cash_entries
    WHERE register_id = v_register_id
      AND type = 'income'
      AND description NOT LIKE 'Venda #%'
      AND description NOT LIKE 'Delivery #%';
    
    -- Calculate expense total
    SELECT 
        COALESCE(SUM(amount), 0)
    INTO 
        v_total_expense
    FROM pdv_cash_entries
    WHERE register_id = v_register_id
      AND type = 'expense';
    
    -- Calculate total of all sales (PDV + delivery)
    v_total_all_sales := v_sales_total + v_delivery_total;
    
    -- Calculate total income (all income entries)
    v_total_income := v_sales_total + v_delivery_total + v_other_income_total;
    
    -- IMPORTANTE: Calcular apenas vendas em dinheiro para o saldo esperado
    -- PDV sales in cash
    SELECT 
        COALESCE(SUM(amount), 0)
    INTO 
        v_cash_sales_total
    FROM pdv_cash_entries
    WHERE register_id = v_register_id
      AND type = 'income'
      AND description LIKE 'Venda #%'
      AND payment_method = 'dinheiro';
    
    -- Delivery sales in cash
    SELECT 
        COALESCE(SUM(amount), 0)
    INTO 
        v_cash_delivery_total
    FROM pdv_cash_entries
    WHERE register_id = v_register_id
      AND type = 'income'
      AND description LIKE 'Delivery #%'
      AND payment_method = 'dinheiro';
    
    -- Other income in cash
    SELECT 
        COALESCE(SUM(amount), 0)
    INTO 
        v_cash_other_income
    FROM pdv_cash_entries
    WHERE register_id = v_register_id
      AND type = 'income'
      AND description NOT LIKE 'Venda #%'
      AND description NOT LIKE 'Delivery #%'
      AND payment_method = 'dinheiro';
    
    -- Calculate expected balance - ONLY CASH TRANSACTIONS
    v_expected_balance := v_opening_amount + v_cash_sales_total + v_cash_delivery_total + v_cash_other_income - v_total_expense;
    
    -- Set actual balance (for open registers, it's the expected balance)
    v_actual_balance := COALESCE(v_register_data.closing_amount, v_expected_balance);
    
    -- Calculate difference
    v_difference := v_actual_balance - v_expected_balance;
    
    -- Get sales data by payment method (using a separate query to avoid nested aggregates)
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
        WHERE register_id = v_register_id
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
        'register_id', v_register_id,
        'opening_amount', v_opening_amount,
        'sales_total', v_sales_total,
        'delivery_total', v_delivery_total,
        'other_income_total', v_other_income_total,
        'total_expense', v_total_expense,
        'cash_sales_total', v_cash_sales_total,
        'cash_delivery_total', v_cash_delivery_total,
        'cash_other_income', v_cash_other_income,
        'expected_balance', v_expected_balance,
        'actual_balance', v_actual_balance,
        'difference', v_difference,
        'entries_count', v_cash_entries_count,
        'total_all_sales', v_total_all_sales
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

-- Fix the close_pdv_cash_register function to correctly calculate the difference
CREATE OR REPLACE FUNCTION close_pdv_cash_register(
  p_register_id uuid,
  p_closing_amount decimal(10,2)
) RETURNS jsonb AS $$
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
$$ LANGUAGE plpgsql;