/*
  # Fix Cash Register Report Date Filtering

  1. Changes
    - Update the get_cash_register_history function to properly filter by date range
    - Add proper date range filtering to the cash register report
    - Ensure all cash registers within the date range are returned

  2. Features
    - Accurate date filtering for cash register reports
    - Better error handling and reporting
    - Improved query performance with proper date filtering
*/

-- Update the get_cash_register_history function to properly filter by date range
CREATE OR REPLACE FUNCTION get_cash_register_history(
  start_date date DEFAULT CURRENT_DATE - INTERVAL '7 days',
  end_date date DEFAULT CURRENT_DATE,
  limit_count integer DEFAULT 15
)
RETURNS TABLE (
  id uuid,
  opened_at timestamp with time zone,
  closed_at timestamp with time zone,
  opening_amount decimal(10,2),
  closing_amount decimal(10,2),
  difference decimal(10,2),
  total_sales decimal(10,2),
  total_entries decimal(10,2),
  operator_name text
) AS $$
BEGIN
  RETURN QUERY
  WITH register_totals AS (
    SELECT 
      cr.id,
      COALESCE(SUM(CASE WHEN ce.type = 'income' AND (ce.description LIKE 'Venda #%' OR ce.description LIKE 'Delivery #%') THEN ce.amount ELSE 0 END), 0) as sales_total,
      COALESCE(SUM(CASE WHEN ce.type = 'income' AND NOT (ce.description LIKE 'Venda #%' OR ce.description LIKE 'Delivery #%') THEN ce.amount ELSE 0 END), 0) as entries_total
    FROM pdv_cash_registers cr
    LEFT JOIN pdv_cash_entries ce ON cr.id = ce.register_id
    WHERE DATE(cr.opened_at) BETWEEN start_date AND end_date
    GROUP BY cr.id
  )
  SELECT 
    cr.id,
    cr.opened_at,
    cr.closed_at,
    cr.opening_amount,
    cr.closing_amount,
    cr.difference,
    rt.sales_total,
    rt.entries_total,
    op.name as operator_name
  FROM pdv_cash_registers cr
  LEFT JOIN register_totals rt ON cr.id = rt.id
  LEFT JOIN pdv_operators op ON cr.operator_id = op.id
  WHERE DATE(cr.opened_at) BETWEEN start_date AND end_date
  ORDER BY cr.opened_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get cash register history with more detailed information
CREATE OR REPLACE FUNCTION get_detailed_cash_register_history(
  start_date date DEFAULT CURRENT_DATE - INTERVAL '7 days',
  end_date date DEFAULT CURRENT_DATE,
  limit_count integer DEFAULT 15
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  WITH register_data AS (
    SELECT 
      cr.id,
      cr.opened_at,
      cr.closed_at,
      cr.opening_amount,
      cr.closing_amount,
      cr.difference,
      op.name as operator_name,
      (
        SELECT jsonb_build_object(
          'sales_total', COALESCE(SUM(CASE WHEN ce.type = 'income' AND (ce.description LIKE 'Venda #%' OR ce.description LIKE 'Delivery #%') THEN ce.amount ELSE 0 END), 0),
          'sales_count', COUNT(CASE WHEN ce.type = 'income' AND (ce.description LIKE 'Venda #%' OR ce.description LIKE 'Delivery #%') THEN 1 ELSE NULL END),
          'income_total', COALESCE(SUM(CASE WHEN ce.type = 'income' THEN ce.amount ELSE 0 END), 0),
          'expense_total', COALESCE(SUM(CASE WHEN ce.type = 'expense' THEN ce.amount ELSE 0 END), 0),
          'payment_methods', (
            SELECT jsonb_object_agg(
              payment_method, 
              SUM(amount)
            )
            FROM pdv_cash_entries
            WHERE register_id = cr.id
              AND type = 'income'
            GROUP BY payment_method
          )
        )
        FROM pdv_cash_entries ce
        WHERE ce.register_id = cr.id
      ) as summary
    FROM pdv_cash_registers cr
    LEFT JOIN pdv_operators op ON cr.operator_id = op.id
    WHERE DATE(cr.opened_at) BETWEEN start_date AND end_date
    ORDER BY cr.opened_at DESC
    LIMIT limit_count
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', rd.id,
      'opened_at', rd.opened_at,
      'closed_at', rd.closed_at,
      'opening_amount', rd.opening_amount,
      'closing_amount', rd.closing_amount,
      'difference', rd.difference,
      'operator_name', rd.operator_name,
      'summary', rd.summary
    )
  )
  INTO result
  FROM register_data rd;
  
  RETURN jsonb_build_object(
    'success', true,
    'data', COALESCE(result, '[]'::jsonb),
    'count', jsonb_array_length(COALESCE(result, '[]'::jsonb)),
    'date_range', jsonb_build_object(
      'start_date', start_date,
      'end_date', end_date
    )
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'date_range', jsonb_build_object(
      'start_date', start_date,
      'end_date', end_date
    )
  );
END;
$$ LANGUAGE plpgsql;