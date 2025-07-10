/*
  # Fix ambiguous register_id in get_pdv_cash_summary function

  1. Function Updates
    - Create or replace the get_pdv_cash_summary function
    - Fix ambiguous column references by using proper table aliases
    - Ensure all register_id references are properly qualified

  2. Function Features
    - Calculate opening amount, sales totals, income, expenses
    - Handle delivery orders and PDV sales separately
    - Return comprehensive cash register summary
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_pdv_cash_summary(uuid);

-- Create the get_pdv_cash_summary function with proper column qualification
CREATE OR REPLACE FUNCTION get_pdv_cash_summary(p_register_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
    v_opening_amount numeric := 0;
    v_sales_total numeric := 0;
    v_delivery_total numeric := 0;
    v_other_income_total numeric := 0;
    v_total_expense numeric := 0;
    v_sales_count integer := 0;
    v_delivery_count integer := 0;
    v_expected_balance numeric := 0;
    v_sales_by_payment jsonb := '{}';
BEGIN
    -- Get opening amount
    SELECT COALESCE(cr.opening_amount, 0)
    INTO v_opening_amount
    FROM pdv_cash_registers cr
    WHERE cr.id = p_register_id;

    -- Get PDV sales total and count
    SELECT 
        COALESCE(SUM(ps.total_amount), 0),
        COUNT(ps.id)
    INTO v_sales_total, v_sales_count
    FROM pdv_sales ps
    WHERE ps.created_at >= (
        SELECT cr.opened_at 
        FROM pdv_cash_registers cr 
        WHERE cr.id = p_register_id
    )
    AND ps.created_at <= COALESCE((
        SELECT cr.closed_at 
        FROM pdv_cash_registers cr 
        WHERE cr.id = p_register_id
    ), NOW())
    AND ps.is_cancelled = false;

    -- Get delivery orders total and count
    SELECT 
        COALESCE(SUM(o.total_price), 0),
        COUNT(o.id)
    INTO v_delivery_total, v_delivery_count
    FROM orders o
    WHERE o.created_at >= (
        SELECT cr.opened_at 
        FROM pdv_cash_registers cr 
        WHERE cr.id = p_register_id
    )
    AND o.created_at <= COALESCE((
        SELECT cr.closed_at 
        FROM pdv_cash_registers cr 
        WHERE cr.id = p_register_id
    ), NOW())
    AND o.status = 'delivered'
    AND o.channel = 'delivery';

    -- Get other income total (from cash entries)
    SELECT COALESCE(SUM(ce.amount), 0)
    INTO v_other_income_total
    FROM pdv_cash_entries ce
    WHERE ce.register_id = p_register_id
    AND ce.type = 'income';

    -- Get total expenses (from cash entries)
    SELECT COALESCE(SUM(ce.amount), 0)
    INTO v_total_expense
    FROM pdv_cash_entries ce
    WHERE ce.register_id = p_register_id
    AND ce.type = 'expense';

    -- Get sales breakdown by payment method
    SELECT COALESCE(
        jsonb_object_agg(
            ps.payment_type::text,
            jsonb_build_object(
                'total', COALESCE(SUM(ps.total_amount), 0),
                'count', COUNT(ps.id)
            )
        ),
        '{}'::jsonb
    )
    INTO v_sales_by_payment
    FROM pdv_sales ps
    WHERE ps.created_at >= (
        SELECT cr.opened_at 
        FROM pdv_cash_registers cr 
        WHERE cr.id = p_register_id
    )
    AND ps.created_at <= COALESCE((
        SELECT cr.closed_at 
        FROM pdv_cash_registers cr 
        WHERE cr.id = p_register_id
    ), NOW())
    AND ps.is_cancelled = false;

    -- Calculate expected balance
    v_expected_balance := v_opening_amount + v_sales_total + v_delivery_total + v_other_income_total - v_total_expense;

    -- Build result
    v_result := jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'opening_amount', v_opening_amount,
            'sales_total', v_sales_total,
            'delivery_total', v_delivery_total,
            'total_all_sales', v_sales_total + v_delivery_total,
            'other_income_total', v_other_income_total,
            'total_income', v_sales_total + v_delivery_total + v_other_income_total,
            'total_expense', v_total_expense,
            'expected_balance', v_expected_balance,
            'actual_balance', v_expected_balance,
            'difference', 0,
            'sales_count', v_sales_count,
            'delivery_count', v_delivery_count,
            'sales', v_sales_by_payment
        )
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'data', jsonb_build_object(
                'opening_amount', 0,
                'sales_total', 0,
                'delivery_total', 0,
                'total_all_sales', 0,
                'other_income_total', 0,
                'total_income', 0,
                'total_expense', 0,
                'expected_balance', 0,
                'actual_balance', 0,
                'difference', 0,
                'sales_count', 0,
                'delivery_count', 0,
                'sales', '{}'::jsonb
            )
        );
END;
$$;