/*
  # Sistema de Programação de Produtos

  1. Nova Tabela
    - `product_schedules`
      - `id` (uuid, primary key)
      - `product_id` (text, identificador do produto)
      - `enabled` (boolean, se a programação está ativa)
      - `days` (jsonb, dias da semana configurados)
      - `start_time` (time, horário de início)
      - `end_time` (time, horário de fim)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Enable RLS na tabela
    - Políticas para acesso público (demo)

  3. Índices
    - Índice único para product_id
    - Índices para performance
*/

-- Tabela de programação de produtos
CREATE TABLE IF NOT EXISTS product_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text UNIQUE NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  days jsonb NOT NULL DEFAULT '{"monday": true, "tuesday": true, "wednesday": true, "thursday": true, "friday": true, "saturday": true, "sunday": true}',
  start_time time DEFAULT '00:00',
  end_time time DEFAULT '23:59',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE product_schedules ENABLE ROW LEVEL SECURITY;

-- Políticas para acesso público (demo)
CREATE POLICY "Allow all operations on product_schedules"
  ON product_schedules
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_product_schedules_product_id ON product_schedules(product_id);
CREATE INDEX IF NOT EXISTS idx_product_schedules_enabled ON product_schedules(enabled);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_product_schedules_updated_at
  BEFORE UPDATE ON product_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir configurações padrão para produtos programados
INSERT INTO product_schedules (product_id, enabled, days, start_time, end_time) VALUES
  -- Quinta Elite (quinta-feira apenas)
  ('promocao-quinta-elite-1kg', true, '{"monday": false, "tuesday": false, "wednesday": false, "thursday": true, "friday": false, "saturday": false, "sunday": false}', '00:00', '23:59'),
  ('promocao-quinta-elite-700g', true, '{"monday": false, "tuesday": false, "wednesday": false, "thursday": true, "friday": false, "saturday": false, "sunday": false}', '00:00', '23:59'),
  ('promocao-quinta-elite-600g', true, '{"monday": false, "tuesday": false, "wednesday": false, "thursday": true, "friday": false, "saturday": false, "sunday": false}', '00:00', '23:59'),
  ('promocao-quinta-elite-400g', true, '{"monday": false, "tuesday": false, "wednesday": false, "thursday": true, "friday": false, "saturday": false, "sunday": false}', '00:00', '23:59'),
  
  -- Promoção copo 400ml (quarta-feira apenas)
  ('promocao-copo-400ml', true, '{"monday": false, "tuesday": false, "wednesday": true, "thursday": false, "friday": false, "saturday": false, "sunday": false}', '00:00', '23:59'),
  
  -- Promoção copo 500ml (terça e sexta-feira)
  ('promocao-copo-500ml', true, '{"monday": false, "tuesday": true, "wednesday": false, "thursday": false, "friday": true, "saturday": false, "sunday": false}', '00:00', '23:59'),
  
  -- Combo 4 (todos os dias exceto quinta-feira)
  ('combo-4-900g', true, '{"monday": true, "tuesday": true, "wednesday": true, "thursday": false, "friday": true, "saturday": true, "sunday": true}', '00:00', '23:59')
ON CONFLICT (product_id) DO NOTHING;