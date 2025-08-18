/*
  # Fix Sales Report Filtering

  1. Changes
    - Create a function to get sales report data filtered by date range
    - Ensure proper date filtering for sales reports
    - Add support for additional filters

  2. Features
    - Accurate date-based filtering for sales reports
    - Improved performance for sales queries
    - Better error handling and reporting
*/

-- Create a function to get sales report data filtered by date range
CREATE OR REPLACE FUNCTION get_sales_report(
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  payment_type text DEFAULT NULL,
  customer_search text DEFAULT NULL,
  operator_search text DEFAULT NULL,
  min_amount numeric DEFAULT NULL,
  max_amount numeric DEFAULT NULL,
  channel text DEFAULT NULL,
  limit_count integer DEFAULT 100
)
RETURNS jsonb AS $$
DECLARE
  sales_data jsonb;
  summary jsonb;
  result jsonb;
BEGIN
  -- Get sales data
  WITH filtered_sales AS (
    SELECT 
      s.id,
      s.sale_number,
      s.created_at,
      s.customer_name,
      s.customer_phone,
      s.payment_type,
      s.total_amount,
      s.is_cancelled,
      s.channel,
      o.name as operator_name
    FROM pdv_sales s
    LEFT JOIN pdv_operators o ON s.operator_id = o.id
    WHERE s.created_at BETWEEN start_date AND end_date
      AND (payment_type IS NULL OR s.payment_type = payment_type)
      AND (customer_search IS NULL OR 
           s.customer_name ILIKE '%' || customer_search || '%' OR 
           s.customer_phone ILIKE '%' || customer_search || '%')
      AND (operator_search IS NULL OR o.name ILIKE '%' || operator_search || '%')
      AND (min_amount IS NULL OR s.total_amount >= min_amount)
      AND (max_amount IS NULL OR s.total_amount <= max_amount)
      AND (channel IS NULL OR s.channel = channel)
    ORDER BY s.created_at DESC
    LIMIT limit_count
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', fs.id,
      'sale_number', fs.sale_number,
      'created_at', fs.created_at,
      'customer_name', fs.customer_name,
      'customer_phone', fs.customer_phone,
      'payment_type', fs.payment_type,
      'total_amount', fs.total_amount,
      'is_cancelled', fs.is_cancelled,
      'channel', fs.channel,
      'operator_name', fs.operator_name
    )
  )
  INTO sales_data
  FROM filtered_sales fs;
  
  -- Get summary data
  SELECT jsonb_build_object(
    'total_sales', COUNT(*),
    'total_amount', COALESCE(SUM(CASE WHEN NOT is_cancelled THEN total_amount ELSE 0 END), 0),
    'avg_ticket', CASE 
      WHEN COUNT(CASE WHEN NOT is_cancelled THEN 1 ELSE NULL END) > 0 
      THEN COALESCE(SUM(CASE WHEN NOT is_cancelled THEN total_amount ELSE 0 END), 0) / COUNT(CASE WHEN NOT is_cancelled THEN 1 ELSE NULL END)
      ELSE 0
    END,
    'cancelled_count', COUNT(CASE WHEN is_cancelled THEN 1 ELSE NULL END),
    'payment_types', (
      SELECT jsonb_object_agg(
        payment_type,
        COUNT(*)
      )
      FROM pdv_sales
      WHERE created_at BETWEEN start_date AND end_date
      GROUP BY payment_type
    ),
    'channels', (
      SELECT jsonb_object_agg(
        channel,
        COUNT(*)
      )
      FROM pdv_sales
      WHERE created_at BETWEEN start_date AND end_date
      GROUP BY channel
    )
  )
  INTO summary
  FROM pdv_sales
  WHERE created_at BETWEEN start_date AND end_date
    AND (payment_type IS NULL OR payment_type = payment_type)
    AND (channel IS NULL OR channel = channel);
  
  -- Build result
  result := jsonb_build_object(
    'success', true,
    'data', COALESCE(sales_data, '[]'::jsonb),
    'summary', summary,
    'count', jsonb_array_length(COALESCE(sales_data, '[]'::jsonb)),
    'filters', jsonb_build_object(
      'start_date', start_date,
      'end_date', end_date,
      'payment_type', payment_type,
      'customer_search', customer_search,
      'operator_search', operator_search,
      'min_amount', min_amount,
      'max_amount', max_amount,
      'channel', channel
    )
  );
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'filters', jsonb_build_object(
      'start_date', start_date,
      'end_date', end_date,
      'payment_type', payment_type,
      'customer_search', customer_search,
      'operator_search', operator_search,
      'min_amount', min_amount,
      'max_amount', max_amount,
      'channel', channel
    )
  );
END;
$$ LANGUAGE plpgsql;