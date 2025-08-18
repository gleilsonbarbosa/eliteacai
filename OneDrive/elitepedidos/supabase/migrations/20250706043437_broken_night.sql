/*
  # Fix PDV Cash Summary Function

  1. Database Function Fix
    - Corrects the `get_pdv_cash_summary` function to properly reference existing columns
    - Uses correct table relationships between sales, cash entries, and cash registers
    - Ensures proper aggregation of cash register data

  2. Function Logic
    - Calculates total sales amount from pdv_sales
    - Calculates cash entries (income/expense) from pdv_cash_entries
    - Returns comprehensive cash register summary
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_pdv_cash_summary(uuid);

-- Create the corrected function
CREATE OR REPLACE FUNCTION get_pdv_cash_summary(p_register_id uuid)
RETURNS TABLE (
  register_id uuid,
  opening_amount numeric,
  total_sales numeric,
  total_income numeric,
  total_expenses numeric,
  expected_amount numeric,
  cash_entries_count bigint
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.id as register_id,
    cr.opening_amount,
    COALESCE(sales_summary.total_sales, 0) as total_sales,
    COALESCE(income_summary.total_income, 0) as total_income,
    COALESCE(expense_summary.total_expenses, 0) as total_expenses,
    cr.opening_amount + 
      COALESCE(sales_summary.total_sales, 0) + 
      COALESCE(income_summary.total_income, 0) - 
      COALESCE(expense_summary.total_expenses, 0) as expected_amount,
    COALESCE(entries_count.total_entries, 0) as cash_entries_count
  FROM pdv_cash_registers cr
  LEFT JOIN (
    -- Get sales linked to this cash register through cash entries
    SELECT 
      ce.register_id,
      SUM(s.total_amount) as total_sales
    FROM pdv_cash_entries ce
    JOIN pdv_sales s ON ce.description LIKE '%Venda #' || s.sale_number || '%'
    WHERE ce.register_id = p_register_id 
      AND ce.type = 'income'
      AND s.is_cancelled = false
    GROUP BY ce.register_id
  ) sales_summary ON cr.id = sales_summary.register_id
  LEFT JOIN (
    -- Get income entries (excluding sales)
    SELECT 
      register_id,
      SUM(amount) as total_income
    FROM pdv_cash_entries
    WHERE register_id = p_register_id 
      AND type = 'income'
      AND description NOT LIKE '%Venda #%'
    GROUP BY register_id
  ) income_summary ON cr.id = income_summary.register_id
  LEFT JOIN (
    -- Get expense entries
    SELECT 
      register_id,
      SUM(amount) as total_expenses
    FROM pdv_cash_entries
    WHERE register_id = p_register_id 
      AND type = 'expense'
    GROUP BY register_id
  ) expense_summary ON cr.id = expense_summary.register_id
  LEFT JOIN (
    -- Get total count of cash entries
    SELECT 
      register_id,
      COUNT(*) as total_entries
    FROM pdv_cash_entries
    WHERE register_id = p_register_id
    GROUP BY register_id
  ) entries_count ON cr.id = entries_count.register_id
  WHERE cr.id = p_register_id;
END;
$$;