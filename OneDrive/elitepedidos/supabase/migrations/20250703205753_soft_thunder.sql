/*
  # Configurações de horário da loja

  1. Novas Tabelas
    - `store_hours`
      - `id` (uuid, primary key)
      - `day_of_week` (integer, 0-6, domingo a sábado)
      - `is_open` (boolean)
      - `open_time` (time)
      - `close_time` (time)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `store_settings`
      - `id` (text, primary key)
      - `store_name` (text)
      - `phone` (text)
      - `address` (text)
      - `delivery_fee` (decimal)
      - `min_order_value` (decimal)
      - `estimated_delivery_time` (integer, em minutos)
      - `is_open_now` (boolean, controle manual)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Enable RLS nas tabelas
    - Políticas para acesso público (demo)

  3. Índices
    - Índice único para day_of_week na store_hours
    - Índices para performance
*/

-- Tabela de horários da loja por dia da semana
CREATE TABLE IF NOT EXISTS store_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_open boolean NOT NULL DEFAULT true,
  open_time time NOT NULL DEFAULT '08:00',
  close_time time NOT NULL DEFAULT '22:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(day_of_week)
);

-- Tabela de configurações gerais da loja
CREATE TABLE IF NOT EXISTS store_settings (
  id text PRIMARY KEY DEFAULT 'default',
  store_name text NOT NULL DEFAULT 'Elite Açaí',
  phone text NOT NULL DEFAULT '(85) 98904-1010',
  address text NOT NULL DEFAULT 'Rua das Frutas, 123 - Centro, Fortaleza/CE',
  delivery_fee decimal(10,2) NOT NULL DEFAULT 5.00,
  min_order_value decimal(10,2) NOT NULL DEFAULT 15.00,
  estimated_delivery_time integer NOT NULL DEFAULT 35,
  is_open_now boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE store_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para acesso público (demo)
-- Em produção, você deve implementar autenticação adequada

CREATE POLICY "Allow all operations on store_hours"
  ON store_hours
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on store_settings"
  ON store_settings
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_store_hours_day_of_week ON store_hours(day_of_week);
CREATE INDEX IF NOT EXISTS idx_store_hours_is_open ON store_hours(is_open);

-- Trigger para atualizar updated_at na tabela store_hours
CREATE TRIGGER update_store_hours_updated_at
  BEFORE UPDATE ON store_hours
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar updated_at na tabela store_settings
CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON store_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir horários padrão se não existirem
INSERT INTO store_hours (day_of_week, is_open, open_time, close_time) VALUES
  (0, true, '10:00', '20:00'), -- Domingo
  (1, true, '08:00', '22:00'), -- Segunda
  (2, true, '08:00', '22:00'), -- Terça
  (3, true, '08:00', '22:00'), -- Quarta
  (4, true, '08:00', '22:00'), -- Quinta
  (5, true, '08:00', '22:00'), -- Sexta
  (6, true, '08:00', '23:00')  -- Sábado
ON CONFLICT (day_of_week) DO NOTHING;

-- Inserir configurações padrão se não existirem
INSERT INTO store_settings (id, store_name, phone, address, delivery_fee, min_order_value, estimated_delivery_time, is_open_now) VALUES
  ('default', 'Elite Açaí', '(85) 98904-1010', 'Rua das Frutas, 123 - Centro, Fortaleza/CE', 5.00, 15.00, 35, true)
ON CONFLICT (id) DO NOTHING;