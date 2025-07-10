/*
  # Fix PDV Cash Summary Function

  1. Function Updates
    - Drop and recreate `get_pdv_cash_summary` function
    - Fix nested aggregate function calls
    - Use CTEs and subqueries to properly calculate summary data
    - Return proper JSON structure with all required fields

  2. Function Features
    - Calculate sales totals from PDV and delivery channels
    - Calculate income and expense totals from cash entries
    - Calculate expected vs actual balance
    - Return detailed breakdown by payment methods
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_pdv_cash_summary(uuid);

-- Create the corrected function
CREATE OR REPLACE FUNCTION get_pdv_cash_summary(p_register_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_result jsonb;
    v_opening_amount numeric := 0;
    v_sales_total numeric := 0;
    v_delivery_total numeric := 0;
    v_sales_count integer := 0;
    v_delivery_count integer := 0;
    v_total_income numeric := 0;
    v_other_income_total numeric := 0;
    v_total_expense numeric := 0;
    v_expected_balance numeric := 0;
    v_actual_balance numeric := 0;
    v_difference numeric := 0;
    v_sales_by_method jsonb := '{}';
    v_register_exists boolean := false;
BEGIN
    -- Check if register exists and get opening amount
    SELECT 
        opening_amount,
        CASE WHEN closed_at IS NULL THEN true ELSE false END
    INTO v_opening_amount, v_register_exists
    FROM pdv_cash_registers 
    WHERE id = p_register_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cash register not found',
            'data', null
        );
    END IF;
    
    -- Get PDV sales totals (excluding cancelled sales)
    WITH pdv_sales_summary AS (
        SELECT 
            COALESCE(SUM(total_amount), 0) as total_amount,
            COUNT(*) as sales_count,
            payment_type
        FROM pdv_sales s
        INNER JOIN pdv_cash_registers cr ON DATE(s.created_at) = DATE(cr.opened_at)
        WHERE cr.id = p_register_id
            AND s.is_cancelled = false
            AND s.channel = 'pdv'
        GROUP BY payment_type
    ),
    delivery_sales_summary AS (
        SELECT 
            COALESCE(SUM(total_price), 0) as total_amount,
            COUNT(*) as sales_count
        FROM orders o
        INNER JOIN pdv_cash_registers cr ON DATE(o.created_at) = DATE(cr.opened_at)
        WHERE cr.id = p_register_id
            AND o.status = 'delivered'
            AND o.channel = 'delivery'
    ),
    cash_entries_summary AS (
        SELECT 
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
        FROM pdv_cash_entries
        WHERE register_id = p_register_id
    )
    SELECT 
        -- PDV Sales
        COALESCE((SELECT SUM(total_amount) FROM pdv_sales_summary), 0),
        COALESCE((SELECT SUM(sales_count) FROM pdv_sales_summary), 0),
        
        -- Delivery Sales  
        COALESCE((SELECT total_amount FROM delivery_sales_summary), 0),
        COALESCE((SELECT sales_count FROM delivery_sales_summary), 0),
        
        -- Cash Entries
        COALESCE((SELECT total_income FROM cash_entries_summary), 0),
        COALESCE((SELECT total_expense FROM cash_entries_summary), 0),
        
        -- Sales by payment method
        COALESCE(
            (SELECT jsonb_object_agg(
                payment_type::text, 
                jsonb_build_object(
                    'total', total_amount,
                    'count', sales_count
                )
            ) FROM pdv_sales_summary), 
            '{}'::jsonb
        )
    INTO 
        v_sales_total,
        v_sales_count,
        v_delivery_total, 
        v_delivery_count,
        v_total_income,
        v_total_expense,
        v_sales_by_method;
    
    -- Calculate other income (excluding sales)
    v_other_income_total := v_total_income;
    
    -- Calculate expected balance
    v_expected_balance := v_opening_amount + v_sales_total + v_delivery_total + v_other_income_total - v_total_expense;
    
    -- For open registers, actual balance equals expected balance
    -- For closed registers, get the actual closing amount
    SELECT 
        CASE 
            WHEN closed_at IS NULL THEN v_expected_balance
            ELSE COALESCE(closing_amount, v_expected_balance)
        END
    INTO v_actual_balance
    FROM pdv_cash_registers 
    WHERE id = p_register_id;
    
    -- Calculate difference
    v_difference := v_actual_balance - v_expected_balance;
    
    -- Build result
    v_result := jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'opening_amount', v_opening_amount,
            'sales_total', v_sales_total,
            'delivery_total', v_delivery_total,
            'total_all_sales', v_sales_total + v_delivery_total,
            'sales_count', v_sales_count,
            'delivery_count', v_delivery_count,
            'total_income', v_total_income,
            'other_income_total', v_other_income_total,
            'total_expense', v_total_expense,
            'expected_balance', v_expected_balance,
            'actual_balance', v_actual_balance,
            'difference', v_difference,
            'sales', v_sales_by_method
        ),
        'error', null
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
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