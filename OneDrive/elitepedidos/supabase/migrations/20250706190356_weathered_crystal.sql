/*
  # Create PDV Cash Summary Function

  1. New Functions
    - `get_pdv_cash_summary(include_delivery)` - Returns comprehensive cash register summary
      - Calculates sales totals, delivery totals, expenses, and expected balance
      - Supports optional delivery sales inclusion
      - Returns structured JSONB response with success status

  2. Features
    - Handles open cash register detection
    - Calculates totals by payment method
    - Provides fallback for no open register
    - Includes debug information for troubleshooting
*/

CREATE OR REPLACE FUNCTION public.get_pdv_cash_summary(include_delivery BOOLEAN DEFAULT FALSE)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    current_register_id UUID;
    v_opening_amount NUMERIC := 0;
    v_sales_total NUMERIC := 0;
    v_sales_count INTEGER := 0;
    v_delivery_total NUMERIC := 0;
    v_delivery_count INTEGER := 0;
    v_other_income_total NUMERIC := 0;
    v_total_expense NUMERIC := 0;
    v_total_income NUMERIC := 0;
    v_expected_balance NUMERIC := 0;
    v_total_all_sales NUMERIC := 0;
    v_sales_by_payment_method JSONB := '{}';
    v_result JSONB;
BEGIN
    -- Get the ID of the currently open cash register
    SELECT id, opening_amount INTO current_register_id, v_opening_amount
    FROM pdv_cash_registers
    WHERE closed_at IS NULL
    ORDER BY opened_at DESC
    LIMIT 1;

    IF current_register_id IS NULL THEN
        -- No open register, return default summary
        RETURN jsonb_build_object(
            'success', TRUE,
            'data', jsonb_build_object(
                'opening_amount', 0,
                'sales_total', 0,
                'total_income', 0,
                'other_income_total', 0,
                'total_expense', 0,
                'expected_balance', 0,
                'actual_balance', 0,
                'difference', 0,
                'sales_count', 0,
                'delivery_total', 0,
                'delivery_count', 0,
                'total_all_sales', 0,
                'sales', '{}'::jsonb
            )
        );
    END IF;

    -- Calculate PDV sales
    SELECT COALESCE(SUM(amount), 0), COALESCE(COUNT(*), 0)
    INTO v_sales_total, v_sales_count
    FROM pdv_cash_entries
    WHERE register_id = current_register_id
      AND type = 'income'
      AND description LIKE 'Venda #%';

    -- Calculate Delivery sales (if include_delivery is true)
    IF include_delivery THEN
        SELECT COALESCE(SUM(amount), 0), COALESCE(COUNT(*), 0)
        INTO v_delivery_total, v_delivery_count
        FROM pdv_cash_entries
        WHERE register_id = current_register_id
          AND type = 'income'
          AND description LIKE 'Delivery #%';
    END IF;

    -- Calculate other income
    SELECT COALESCE(SUM(amount), 0)
    INTO v_other_income_total
    FROM pdv_cash_entries
    WHERE register_id = current_register_id
      AND type = 'income'
      AND description NOT LIKE 'Venda #%'
      AND description NOT LIKE 'Delivery #%';

    -- Calculate total expenses
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_expense
    FROM pdv_cash_entries
    WHERE register_id = current_register_id
      AND type = 'expense';

    -- Calculate total income (all sources)
    v_total_income := v_sales_total + v_delivery_total + v_other_income_total;
    v_total_all_sales := v_sales_total + v_delivery_total;

    -- Calculate expected balance
    v_expected_balance := v_opening_amount + v_total_income - v_total_expense;

    -- Calculate sales by payment method
    SELECT jsonb_object_agg(payment_method || '_total', total_amount)
    INTO v_sales_by_payment_method
    FROM (
        SELECT payment_method, COALESCE(SUM(amount), 0) AS total_amount
        FROM pdv_cash_entries
        WHERE register_id = current_register_id
          AND type = 'income'
          AND (description LIKE 'Venda #%' OR (include_delivery AND description LIKE 'Delivery #%'))
        GROUP BY payment_method
    ) AS subquery;

    -- Construct the result JSONB object
    v_result := jsonb_build_object(
        'success', TRUE,
        'data', jsonb_build_object(
            'opening_amount', v_opening_amount,
            'sales_total', v_sales_total,
            'sales_count', v_sales_count,
            'delivery_total', v_delivery_total,
            'delivery_count', v_delivery_count,
            'other_income_total', v_other_income_total,
            'total_expense', v_total_expense,
            'total_income', v_total_income,
            'expected_balance', v_expected_balance,
            'actual_balance', v_expected_balance,
            'difference', 0,
            'total_all_sales', v_total_all_sales,
            'sales', COALESCE(v_sales_by_payment_method, '{}'::jsonb)
        )
    );

    RETURN v_result;
END;
$$;