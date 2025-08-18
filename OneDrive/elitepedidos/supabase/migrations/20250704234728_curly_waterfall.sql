/*
  # Funções para o sistema PDV

  1. Novas Funções
    - `verify_operator_password` - Verifica a senha do operador
    - `get_low_stock_products` - Obtém produtos com estoque baixo
    - `get_sales_report` - Gera relatório de vendas

  2. Segurança
    - Funções acessíveis publicamente para demonstração
*/

-- Função para verificar senha do operador
CREATE OR REPLACE FUNCTION verify_operator_password(operator_code text, password_to_check text)
RETURNS boolean AS $$
DECLARE
  stored_hash text;
BEGIN
  -- Buscar hash armazenado
  SELECT password_hash INTO stored_hash
  FROM pdv_operators
  WHERE code = operator_code AND is_active = true;
  
  -- Verificar se encontrou operador
  IF stored_hash IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar senha
  RETURN stored_hash = crypt(password_to_check, stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter produtos com estoque baixo
CREATE OR REPLACE FUNCTION get_low_stock_products(limit_count integer DEFAULT 10)
RETURNS SETOF pdv_low_stock_products AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM pdv_low_stock_products
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Função para gerar relatório de vendas por período
CREATE OR REPLACE FUNCTION get_sales_report(start_date timestamp, end_date timestamp)
RETURNS TABLE (
  total_sales bigint,
  total_amount numeric,
  avg_ticket numeric,
  payment_stats jsonb
) AS $$
BEGIN
  RETURN QUERY
  WITH sales_data AS (
    SELECT 
      COUNT(*) as sales_count,
      SUM(total_amount) as total,
      AVG(total_amount) as average,
      jsonb_object_agg(
        payment_type,
        (
          SELECT jsonb_build_object(
            'count', COUNT(*),
            'amount', SUM(s2.total_amount)
          )
          FROM pdv_sales s2
          WHERE s2.payment_type = s.payment_type
          AND s2.created_at >= start_date
          AND s2.created_at <= end_date
          AND s2.is_cancelled = false
        )
      ) as payment_data
    FROM pdv_sales s
    WHERE s.created_at >= start_date
    AND s.created_at <= end_date
    AND s.is_cancelled = false
    GROUP BY 1
  )
  SELECT 
    sales_count as total_sales,
    total as total_amount,
    average as avg_ticket,
    payment_data as payment_stats
  FROM sales_data;
END;
$$ LANGUAGE plpgsql;