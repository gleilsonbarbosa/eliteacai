/*
  # Sistema PDV (Ponto de Venda)

  1. Novas Tabelas
    - `pdv_products` - Produtos do PDV
    - `pdv_sales` - Vendas realizadas
    - `pdv_sale_items` - Itens de cada venda
    - `pdv_operators` - Operadores do sistema

  2. Funcionalidades
    - Produtos pesáveis e não-pesáveis
    - Controle de estoque
    - Histórico de vendas
    - Múltiplas formas de pagamento

  3. Segurança
    - RLS habilitado
    - Políticas de acesso
*/

-- Enum para categorias de produtos
DO $$ BEGIN
  CREATE TYPE pdv_product_category AS ENUM ('acai', 'bebidas', 'complementos', 'sobremesas', 'outros');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum para formas de pagamento
DO $$ BEGIN
  CREATE TYPE pdv_payment_type AS ENUM ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'voucher', 'misto');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tabela de operadores do PDV
CREATE TABLE IF NOT EXISTS pdv_operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  is_active boolean DEFAULT true,
  permissions jsonb DEFAULT '{"can_discount": true, "can_cancel": true, "can_manage_products": false}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de produtos do PDV
CREATE TABLE IF NOT EXISTS pdv_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  category pdv_product_category NOT NULL DEFAULT 'outros',
  is_weighable boolean DEFAULT false,
  unit_price decimal(10,2),
  price_per_gram decimal(10,4),
  image_url text,
  stock_quantity decimal(10,3) DEFAULT 0,
  min_stock decimal(10,3) DEFAULT 0,
  is_active boolean DEFAULT true,
  barcode text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraint: produto deve ter preço unitário OU preço por grama
  CONSTRAINT pdv_products_price_check CHECK (
    (is_weighable = false AND unit_price IS NOT NULL AND price_per_gram IS NULL) OR
    (is_weighable = true AND price_per_gram IS NOT NULL AND unit_price IS NULL)
  )
);

-- Tabela de vendas
CREATE TABLE IF NOT EXISTS pdv_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number serial UNIQUE NOT NULL,
  operator_id uuid REFERENCES pdv_operators(id),
  customer_name text,
  customer_phone text,
  subtotal decimal(10,2) NOT NULL,
  discount_amount decimal(10,2) DEFAULT 0,
  discount_percentage decimal(5,2) DEFAULT 0,
  total_amount decimal(10,2) NOT NULL,
  payment_type pdv_payment_type NOT NULL,
  payment_details jsonb, -- Para armazenar detalhes específicos do pagamento
  change_amount decimal(10,2) DEFAULT 0,
  notes text,
  is_cancelled boolean DEFAULT false,
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES pdv_operators(id),
  cancel_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de itens da venda
CREATE TABLE IF NOT EXISTS pdv_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES pdv_sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES pdv_products(id),
  product_code text NOT NULL,
  product_name text NOT NULL,
  quantity decimal(10,3) NOT NULL DEFAULT 1,
  weight_kg decimal(10,3), -- Para produtos pesáveis
  unit_price decimal(10,2),
  price_per_gram decimal(10,4),
  discount_amount decimal(10,2) DEFAULT 0,
  subtotal decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE pdv_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdv_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdv_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdv_sale_items ENABLE ROW LEVEL SECURITY;

-- Políticas para acesso público (demo)
CREATE POLICY "Allow all operations on pdv_operators"
  ON pdv_operators FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on pdv_products"
  ON pdv_products FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on pdv_sales"
  ON pdv_sales FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on pdv_sale_items"
  ON pdv_sale_items FOR ALL TO public USING (true) WITH CHECK (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pdv_products_code ON pdv_products(code);
CREATE INDEX IF NOT EXISTS idx_pdv_products_barcode ON pdv_products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pdv_products_category ON pdv_products(category);
CREATE INDEX IF NOT EXISTS idx_pdv_products_active ON pdv_products(is_active);
CREATE INDEX IF NOT EXISTS idx_pdv_products_name_search ON pdv_products(name text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_pdv_sales_operator ON pdv_sales(operator_id);
CREATE INDEX IF NOT EXISTS idx_pdv_sales_date ON pdv_sales(created_at);
CREATE INDEX IF NOT EXISTS idx_pdv_sales_number ON pdv_sales(sale_number);
CREATE INDEX IF NOT EXISTS idx_pdv_sales_cancelled ON pdv_sales(is_cancelled);

CREATE INDEX IF NOT EXISTS idx_pdv_sale_items_sale ON pdv_sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_pdv_sale_items_product ON pdv_sale_items(product_id);

CREATE INDEX IF NOT EXISTS idx_pdv_operators_code ON pdv_operators(code);
CREATE INDEX IF NOT EXISTS idx_pdv_operators_active ON pdv_operators(is_active);

-- Triggers para updated_at
CREATE TRIGGER update_pdv_operators_updated_at
  BEFORE UPDATE ON pdv_operators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pdv_products_updated_at
  BEFORE UPDATE ON pdv_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pdv_sales_updated_at
  BEFORE UPDATE ON pdv_sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para hash de senha dos operadores
CREATE OR REPLACE FUNCTION hash_operator_password()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.password_hash IS NOT NULL AND (OLD IS NULL OR NEW.password_hash != OLD.password_hash) THEN
    NEW.password_hash := crypt(NEW.password_hash, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para hash automático de senha
CREATE TRIGGER trg_hash_operator_password
  BEFORE INSERT OR UPDATE OF password_hash ON pdv_operators
  FOR EACH ROW EXECUTE FUNCTION hash_operator_password();

-- Função para atualizar estoque automaticamente
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Reduzir estoque quando item é vendido
    UPDATE pdv_products 
    SET stock_quantity = stock_quantity - COALESCE(NEW.quantity, NEW.weight_kg, 0)
    WHERE id = NEW.product_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Restaurar estoque quando venda é cancelada
    UPDATE pdv_products 
    SET stock_quantity = stock_quantity + COALESCE(OLD.quantity, OLD.weight_kg, 0)
    WHERE id = OLD.product_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para controle de estoque
CREATE TRIGGER trg_update_product_stock
  AFTER INSERT OR DELETE ON pdv_sale_items
  FOR EACH ROW EXECUTE FUNCTION update_product_stock();

-- Inserir operador padrão
INSERT INTO pdv_operators (name, code, password_hash, permissions) VALUES
  ('Administrador', 'ADMIN', '123456', '{"can_discount": true, "can_cancel": true, "can_manage_products": true}'),
  ('Operador 1', 'OP001', '1234', '{"can_discount": true, "can_cancel": false, "can_manage_products": false}')
ON CONFLICT (code) DO NOTHING;

-- Inserir produtos de exemplo
INSERT INTO pdv_products (code, name, category, is_weighable, unit_price, price_per_gram, description) VALUES
  ('ACAI300', 'Açaí 300ml', 'acai', false, 15.90, NULL, 'Açaí tradicional 300ml'),
  ('ACAI500', 'Açaí 500ml', 'acai', false, 22.90, NULL, 'Açaí tradicional 500ml'),
  ('ACAIPESO', 'Açaí por Peso', 'acai', true, NULL, 0.045, 'Açaí vendido por peso (R$ 45,00/kg)'),
  ('GRANOLA', 'Granola', 'complementos', false, 3.50, NULL, 'Granola crocante'),
  ('LEITEPO', 'Leite em Pó', 'complementos', false, 2.00, NULL, 'Leite em pó'),
  ('AGUA500', 'Água 500ml', 'bebidas', false, 3.00, NULL, 'Água mineral 500ml'),
  ('REFRI350', 'Refrigerante 350ml', 'bebidas', false, 5.50, NULL, 'Refrigerante lata 350ml')
ON CONFLICT (code) DO NOTHING;

-- View para relatórios de vendas
CREATE OR REPLACE VIEW pdv_sales_report AS
SELECT 
  s.id,
  s.sale_number,
  s.created_at,
  o.name as operator_name,
  s.customer_name,
  s.subtotal,
  s.discount_amount,
  s.total_amount,
  s.payment_type,
  s.is_cancelled,
  COUNT(si.id) as items_count,
  SUM(si.quantity) as total_quantity
FROM pdv_sales s
LEFT JOIN pdv_operators o ON s.operator_id = o.id
LEFT JOIN pdv_sale_items si ON s.id = si.sale_id
GROUP BY s.id, o.name;

-- View para produtos com baixo estoque
CREATE OR REPLACE VIEW pdv_low_stock_products AS
SELECT 
  id,
  code,
  name,
  category,
  stock_quantity,
  min_stock,
  (stock_quantity - min_stock) as stock_difference
FROM pdv_products
WHERE is_active = true 
  AND stock_quantity <= min_stock
ORDER BY stock_difference ASC;