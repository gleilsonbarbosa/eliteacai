/*
  # Sistema de Bairros e Taxas de Entrega

  1. Nova Tabela
    - `delivery_neighborhoods`
      - `id` (uuid, primary key)
      - `name` (text, nome do bairro)
      - `delivery_fee` (decimal, taxa de entrega)
      - `delivery_time` (integer, tempo em minutos)
      - `is_active` (boolean, se está ativo)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Enable RLS na tabela
    - Políticas para acesso público (demo)

  3. Dados Iniciais
    - Inserir os bairros fornecidos
*/

-- Tabela de bairros com taxas de entrega
CREATE TABLE IF NOT EXISTS delivery_neighborhoods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  delivery_fee decimal(10,2) NOT NULL DEFAULT 0.00,
  delivery_time integer NOT NULL DEFAULT 50,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE delivery_neighborhoods ENABLE ROW LEVEL SECURITY;

-- Políticas para acesso público (demo)
CREATE POLICY "Allow all operations on delivery_neighborhoods"
  ON delivery_neighborhoods
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_delivery_neighborhoods_name ON delivery_neighborhoods(name);
CREATE INDEX IF NOT EXISTS idx_delivery_neighborhoods_active ON delivery_neighborhoods(is_active);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_delivery_neighborhoods_updated_at
  BEFORE UPDATE ON delivery_neighborhoods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir bairros iniciais
INSERT INTO delivery_neighborhoods (name, delivery_fee, delivery_time, is_active) VALUES
  ('Acaracuzinho', 7.00, 50, true),
  ('Antônio Justa', 7.00, 50, true),
  ('Boa Vista', 7.00, 50, true),
  ('Cágado', 3.00, 50, true),
  ('Centro', 7.00, 50, true),
  ('Coqueiral', 5.00, 50, true),
  ('Distrito Industrial I', 7.00, 50, true),
  ('Distrito Industrial III', 8.00, 50, true),
  ('Furna da Onça', 7.00, 50, true),
  ('Jaçanaú', 7.00, 50, true),
  ('Jardim Bandeirantes', 8.00, 50, true),
  ('Jenipapeiro', 6.00, 50, true),
  ('Jereissati I', 6.00, 50, true),
  ('Jereissati II', 7.00, 50, true),
  ('Luzardo Viana', 5.00, 50, true),
  ('Maracananzinho', 3.00, 50, true),
  ('Mucunã', 8.00, 50, true),
  ('Novo Maracanaú', 5.00, 50, true),
  ('Novo Oriente', 7.00, 60, true),
  ('Parque Tijuca', 7.00, 60, true),
  ('Pau-Serrado', 3.00, 50, true),
  ('Piratininga', 4.00, 50, true),
  ('Residencial 1', 3.00, 50, true),
  ('Residencial 2', 3.00, 50, true),
  ('Senador Carlos Jereissati', 8.00, 50, true),
  ('Timbó', 7.00, 50, true)
ON CONFLICT (name) DO NOTHING;

-- Adicionar coluna neighborhood_id na tabela orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS neighborhood_id uuid REFERENCES delivery_neighborhoods(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee decimal(10,2) DEFAULT 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_minutes integer DEFAULT 50;

-- Índice para a nova coluna
CREATE INDEX IF NOT EXISTS idx_orders_neighborhood_id ON orders(neighborhood_id);