/*
  # Corrigir porcentagem de cashback para 5%

  1. Alterações
    - Atualizar função calculate_purchase_cashback para usar 5% em vez de 10%
    - Manter todas as outras funcionalidades inalteradas

  2. Segurança
    - Função mantém as mesmas validações
    - Apenas altera o percentual de cálculo
*/

-- Função para calcular cashback automático (CORRIGIDA para 5%)
CREATE OR REPLACE FUNCTION calculate_purchase_cashback()
RETURNS TRIGGER AS $$
DECLARE
  cashback_percentage numeric := 0.05; -- 5% de cashback (CORRIGIDO)
BEGIN
  -- Só calcular cashback para compras aprovadas
  IF NEW.type = 'purchase' AND NEW.status = 'approved' THEN
    NEW.cashback_amount := NEW.amount * cashback_percentage;
  ELSIF NEW.type = 'redemption' THEN
    NEW.cashback_amount := -NEW.amount; -- Valor negativo para resgates
  ELSE
    NEW.cashback_amount := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Adicionar comentário atualizado na função
COMMENT ON FUNCTION calculate_purchase_cashback() IS 'Automatically calculates 5% cashback for purchases';