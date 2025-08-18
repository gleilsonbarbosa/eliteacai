/*
  # Adicionar Promoção Copo 300ml para Segundas-feiras

  1. Nova Programação
    - Produto: promocao-copo-300ml
    - Disponível: Apenas segundas-feiras
    - Horário: 00:00 às 23:59

  2. Atualização
    - Configurar programação específica para segunda-feira
*/

-- Inserir ou atualizar programação para promoção copo 300ml (segunda-feira apenas)
INSERT INTO product_schedules (product_id, enabled, days, start_time, end_time) VALUES
  ('promocao-copo-300ml', true, '{"monday": true, "tuesday": false, "wednesday": false, "thursday": false, "friday": false, "saturday": false, "sunday": false}', '00:00', '23:59')
ON CONFLICT (product_id) 
DO UPDATE SET 
  enabled = EXCLUDED.enabled,
  days = EXCLUDED.days,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  updated_at = now();