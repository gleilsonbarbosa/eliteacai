/*
  # Fix ambiguous column reference in get_pdv_cash_summary function

  1. Function Updates
    - Update `get_pdv_cash_summary` function to resolve ambiguous `register_id` column reference
    - Add proper table aliases to distinguish between `pdv_cash_registers.id` and `pdv_cash_entries.register_id`

  2. Changes Made
    - Qualify all column references with appropriate table aliases
    - Ensure the function returns proper cash register summary data
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_pdv_cash_summary();

-- Create the updated function with proper column qualification
CREATE OR REPLACE FUNCTION get_pdv_cash_summary()
RETURNS TABLE (
  register_id uuid,
  opening_amount numeric,
  total_sales numeric,
  total_income numeric,
  total_expenses numeric,
  expected_amount numeric,
  opened_at timestamptz,
  operator_name text
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as register_id,
    r.opening_amount,
    COALESCE(sales_summary.total_sales, 0) as total_sales,
    COALESCE(income_summary.total_income, 0) as total_income,
    COALESCE(expense_summary.total_expenses, 0) as total_expenses,
    (r.opening_amount + 
     COALESCE(sales_summary.total_sales, 0) + 
     COALESCE(income_summary.total_income, 0) - 
     COALESCE(expense_summary.total_expenses, 0)) as expected_amount,
    r.opened_at,
    COALESCE(o.name, 'Sistema') as operator_name
  FROM pdv_cash_registers r
  LEFT JOIN pdv_operators o ON r.operator_id = o.id
  LEFT JOIN (
    SELECT 
      s.id as sale_register_id,
      SUM(CASE WHEN s.payment_type = 'dinheiro' AND NOT s.is_cancelled THEN s.total_amount ELSE 0 END) as total_sales
    FROM pdv_sales s
    INNER JOIN pdv_cash_registers cr ON DATE(s.created_at) = DATE(cr.opened_at)
    WHERE cr.closed_at IS NULL
    GROUP BY s.id
  ) sales_summary ON TRUE
  LEFT JOIN (
    SELECT 
      e.register_id as entry_register_id,
      SUM(e.amount) as total_income
    FROM pdv_cash_entries e
    WHERE e.type = 'income'
    GROUP BY e.register_id
  ) income_summary ON r.id = income_summary.entry_register_id
  LEFT JOIN (
    SELECT 
      e.register_id as entry_register_id,
      SUM(e.amount) as total_expenses
    FROM pdv_cash_entries e
    WHERE e.type = 'expense'
    GROUP BY e.register_id
  ) expense_summary ON r.id = expense_summary.entry_register_id
  WHERE r.closed_at IS NULL
  ORDER BY r.opened_at DESC
  LIMIT 1;
END;
$$;