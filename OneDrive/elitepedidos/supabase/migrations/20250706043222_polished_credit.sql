/*
  # Fix ambiguous register_id column reference

  1. Updates
    - Fix the `get_pdv_cash_summary` function to properly qualify column references
    - Add table aliases to prevent ambiguous column references
    - Ensure all register_id references are properly qualified

  2. Changes
    - Update the SQL function to use proper table aliases
    - Qualify all column references to prevent ambiguity
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS get_pdv_cash_summary(uuid);

-- Recreate the function with proper column qualification
CREATE OR REPLACE FUNCTION get_pdv_cash_summary(p_register_id uuid)
RETURNS TABLE (
  register_id uuid,
  opening_amount numeric,
  closing_amount numeric,
  difference numeric,
  opened_at timestamptz,
  closed_at timestamptz,
  operator_name text,
  total_sales numeric,
  total_entries numeric,
  total_income numeric,
  total_expenses numeric,
  cash_sales numeric,
  card_sales numeric,
  pix_sales numeric,
  voucher_sales numeric,
  mixed_sales numeric
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.id as register_id,
    cr.opening_amount,
    cr.closing_amount,
    cr.difference,
    cr.opened_at,
    cr.closed_at,
    op.name as operator_name,
    COALESCE(sales_summary.total_sales, 0) as total_sales,
    COALESCE(entries_summary.total_entries, 0) as total_entries,
    COALESCE(entries_summary.total_income, 0) as total_income,
    COALESCE(entries_summary.total_expenses, 0) as total_expenses,
    COALESCE(sales_summary.cash_sales, 0) as cash_sales,
    COALESCE(sales_summary.card_sales, 0) as card_sales,
    COALESCE(sales_summary.pix_sales, 0) as pix_sales,
    COALESCE(sales_summary.voucher_sales, 0) as voucher_sales,
    COALESCE(sales_summary.mixed_sales, 0) as mixed_sales
  FROM pdv_cash_registers cr
  LEFT JOIN pdv_operators op ON cr.operator_id = op.id
  LEFT JOIN (
    SELECT 
      s.register_id,
      SUM(s.total_amount) as total_sales,
      SUM(CASE WHEN s.payment_type = 'dinheiro' THEN s.total_amount ELSE 0 END) as cash_sales,
      SUM(CASE WHEN s.payment_type IN ('cartao_credito', 'cartao_debito') THEN s.total_amount ELSE 0 END) as card_sales,
      SUM(CASE WHEN s.payment_type = 'pix' THEN s.total_amount ELSE 0 END) as pix_sales,
      SUM(CASE WHEN s.payment_type = 'voucher' THEN s.total_amount ELSE 0 END) as voucher_sales,
      SUM(CASE WHEN s.payment_type = 'misto' THEN s.total_amount ELSE 0 END) as mixed_sales
    FROM pdv_sales s
    WHERE s.is_cancelled = false
    GROUP BY s.register_id
  ) sales_summary ON cr.id = sales_summary.register_id
  LEFT JOIN (
    SELECT 
      e.register_id,
      COUNT(*) as total_entries,
      SUM(CASE WHEN e.type = 'income' THEN e.amount ELSE 0 END) as total_income,
      SUM(CASE WHEN e.type = 'expense' THEN e.amount ELSE 0 END) as total_expenses
    FROM pdv_cash_entries e
    GROUP BY e.register_id
  ) entries_summary ON cr.id = entries_summary.register_id
  WHERE cr.id = p_register_id;
END;
$$;