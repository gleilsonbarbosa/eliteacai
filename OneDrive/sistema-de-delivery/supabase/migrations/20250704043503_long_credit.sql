/*
  # Sistema de Cashback Integrado

  1. Novas Tabelas
    - `customers` - Clientes com saldo de cashback
    - `transactions` - Histórico de transações de cashback

  2. Funcionalidades
    - Cálculo automático de cashback (10%)
    - Expiração automática no fim do mês
    - Validação de saldo para resgates
    - Atualização automática de saldos

  3. Segurança
    - RLS habilitado
    - Políticas de acesso
    - Validações e constraints

  4. Performance
    - Índices otimizados
    - Views para consultas complexas
*/

-- Enum para tipos de transação
DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('purchase', 'redemption', 'adjustment');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  name text,
  email text,
  balance numeric DEFAULT 0 NOT NULL,
  password_hash text DEFAULT '' NOT NULL,
  last_login timestamptz,
  date_of_birth date,
  whatsapp_consent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar constraints após criação da tabela
DO $$ BEGIN
  ALTER TABLE customers ADD CONSTRAINT customers_phone_format_check 
    CHECK (phone ~ '^\d{11}$');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE customers ADD CONSTRAINT customers_email_format_check 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tabela de transações de cashback
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  amount numeric NOT NULL,
  cashback_amount numeric NOT NULL,
  type transaction_type NOT NULL,
  status text NOT NULL,
  receipt_url text,
  store_id uuid,
  location jsonb,
  expires_at timestamptz,
  comment text,
  attendant_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar comentário na coluna location
COMMENT ON COLUMN transactions.location IS 'Stores transaction location data as JSONB with latitude and longitude';

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Políticas para acesso público (demo)
DROP POLICY IF EXISTS "Enable insert access for all users" ON customers;
CREATE POLICY "Enable insert access for all users"
  ON customers
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON customers;
CREATE POLICY "Enable read access for all users"
  ON customers
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Enable update access for authenticated users" ON customers;
CREATE POLICY "Enable update access for authenticated users"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON transactions;
CREATE POLICY "Enable insert access for all users"
  ON transactions
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON transactions;
CREATE POLICY "Enable read access for all users"
  ON transactions
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Enable update access for authenticated users" ON transactions;
CREATE POLICY "Enable update access for authenticated users"
  ON transactions
  FOR UPDATE
  TO authenticated
  USING (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_phone_password ON customers(phone, password_hash);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone_search ON customers(phone text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_customers_name_search ON customers(name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_customers_phone_lookup ON customers(phone) WHERE password_hash <> '';

CREATE INDEX IF NOT EXISTS idx_transactions_customer_type_status ON transactions(customer_id, type, status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_expires_at ON transactions(expires_at) WHERE type = 'purchase' AND status = 'approved';
CREATE INDEX IF NOT EXISTS idx_transactions_store_id ON transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_transactions_location ON transactions(((location ->> 'latitude')), ((location ->> 'longitude')));
CREATE INDEX IF NOT EXISTS idx_transactions_receipt_url ON transactions(receipt_url) WHERE receipt_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_comment ON transactions(comment) WHERE comment IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_attendant_name ON transactions(attendant_name) WHERE attendant_name IS NOT NULL;

-- Função para hash de senha do cliente
CREATE OR REPLACE FUNCTION hash_customer_password()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.password_hash IS NOT NULL AND NEW.password_hash != '' AND (OLD IS NULL OR NEW.password_hash != OLD.password_hash) THEN
    NEW.password_hash := crypt(NEW.password_hash, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Adicionar comentário na função
COMMENT ON FUNCTION hash_customer_password() IS 'Automatically hashes customer passwords using bcrypt';

-- Trigger para hash automático de senha
DROP TRIGGER IF EXISTS trg_hash_customer_password ON customers;
CREATE TRIGGER trg_hash_customer_password
  BEFORE INSERT OR UPDATE OF password_hash ON customers
  FOR EACH ROW
  EXECUTE FUNCTION hash_customer_password();

-- Função para calcular cashback automático
CREATE OR REPLACE FUNCTION calculate_purchase_cashback()
RETURNS TRIGGER AS $$
DECLARE
  cashback_percentage numeric := 0.10; -- 10% de cashback
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

-- Adicionar comentário na função
COMMENT ON FUNCTION calculate_purchase_cashback() IS 'Automatically calculates cashback for purchases';

-- Trigger para calcular cashback
DROP TRIGGER IF EXISTS trg_calculate_purchase_cashback ON transactions;
CREATE TRIGGER trg_calculate_purchase_cashback
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_purchase_cashback();

-- Função para definir expiração automática
CREATE OR REPLACE FUNCTION set_transaction_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- Cashback expira no último dia do mês atual
  IF NEW.type = 'purchase' AND NEW.status = 'approved' THEN
    NEW.expires_at := date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day' + time '23:59:59';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Adicionar comentário na função
COMMENT ON FUNCTION set_transaction_expiration() IS 'Sets expiration date for purchase transactions';

-- Trigger para definir expiração
DROP TRIGGER IF EXISTS set_transaction_expiration_trigger ON transactions;
CREATE TRIGGER set_transaction_expiration_trigger
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION set_transaction_expiration();

-- Função para validar resgate de cashback
CREATE OR REPLACE FUNCTION validate_redemption()
RETURNS TRIGGER AS $$
DECLARE
  available_balance numeric;
BEGIN
  -- Só validar para resgates
  IF NEW.type = 'redemption' THEN
    -- Calcular saldo disponível (não expirado)
    SELECT COALESCE(SUM(cashback_amount), 0)
    INTO available_balance
    FROM transactions
    WHERE customer_id = NEW.customer_id
      AND status = 'approved'
      AND (expires_at IS NULL OR expires_at >= CURRENT_TIMESTAMP);
    
    -- Verificar se tem saldo suficiente
    IF available_balance < NEW.amount THEN
      RAISE EXCEPTION 'Saldo insuficiente. Disponível: R$ %.2f', available_balance;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Adicionar comentário na função
COMMENT ON FUNCTION validate_redemption() IS 'Validates redemption transactions against available balance';

-- Trigger para validar resgate
DROP TRIGGER IF EXISTS trg_validate_redemption ON transactions;
CREATE TRIGGER trg_validate_redemption
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_redemption();

-- Função para atualizar saldo do cliente
CREATE OR REPLACE FUNCTION handle_customer_balance()
RETURNS TRIGGER AS $$
DECLARE
  new_balance numeric;
  target_customer_id uuid;
BEGIN
  -- Determinar qual customer_id usar
  IF TG_OP = 'DELETE' THEN
    target_customer_id := OLD.customer_id;
  ELSE
    target_customer_id := NEW.customer_id;
  END IF;
  
  -- Calcular novo saldo baseado em transações válidas (não expiradas)
  SELECT COALESCE(SUM(cashback_amount), 0)
  INTO new_balance
  FROM transactions
  WHERE customer_id = target_customer_id
    AND status = 'approved'
    AND (expires_at IS NULL OR expires_at >= CURRENT_TIMESTAMP);
  
  -- Atualizar saldo do cliente
  UPDATE customers
  SET balance = new_balance,
      updated_at = now()
  WHERE id = target_customer_id;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Adicionar comentário na função
COMMENT ON FUNCTION handle_customer_balance() IS 'Handles balance updates and creates adjustments when needed';

-- Trigger para atualizar saldo
DROP TRIGGER IF EXISTS trg_handle_balance ON transactions;
CREATE TRIGGER trg_handle_balance
  BEFORE INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION handle_customer_balance();

-- Constraints adicionais
DO $$ BEGIN
  ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
    CHECK (type IN ('purchase', 'redemption', 'cashback'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE transactions ADD CONSTRAINT transactions_status_check 
    CHECK (status IN ('approved', 'pending', 'rejected', 'used'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Adicionar referência de cliente aos pedidos se a coluna não existir
DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN customer_id uuid REFERENCES customers(id);
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Adicionar referência de loja às transações se a tabela stores existir
DO $$ BEGIN
  ALTER TABLE transactions ADD CONSTRAINT transactions_store_id_fkey 
    FOREIGN KEY (store_id) REFERENCES stores(id);
EXCEPTION
  WHEN undefined_table THEN null;
  WHEN duplicate_object THEN null;
END $$;

-- View para consultar saldos de clientes com informações de expiração
CREATE OR REPLACE VIEW customer_balances AS
SELECT 
  c.id as customer_id,
  c.name,
  COALESCE(SUM(CASE 
    WHEN t.status = 'approved' AND (t.expires_at IS NULL OR t.expires_at >= CURRENT_TIMESTAMP) 
    THEN t.cashback_amount 
    ELSE 0 
  END), 0) as available_balance,
  COALESCE(SUM(CASE 
    WHEN t.status = 'approved' AND t.expires_at < CURRENT_TIMESTAMP 
    THEN t.cashback_amount 
    ELSE 0 
  END), 0) as expiring_amount,
  MIN(CASE 
    WHEN t.status = 'approved' AND t.expires_at >= CURRENT_TIMESTAMP 
    THEN t.expires_at 
  END) as expiration_date
FROM customers c
LEFT JOIN transactions t ON c.id = t.customer_id
GROUP BY c.id, c.name;

-- Adicionar comentário na view
COMMENT ON VIEW customer_balances IS 'Shows customer balances with proper expiration handling';

-- Função para buscar ou criar cliente por telefone
CREATE OR REPLACE FUNCTION get_or_create_customer(customer_phone text, customer_name text DEFAULT NULL)
RETURNS uuid AS $$
DECLARE
  customer_id uuid;
BEGIN
  -- Tentar encontrar cliente existente
  SELECT id INTO customer_id
  FROM customers
  WHERE phone = customer_phone;
  
  -- Se não encontrou, criar novo cliente
  IF customer_id IS NULL THEN
    INSERT INTO customers (phone, name)
    VALUES (customer_phone, customer_name)
    RETURNING id INTO customer_id;
  ELSE
    -- Atualizar nome se fornecido e diferente
    IF customer_name IS NOT NULL AND customer_name != '' THEN
      UPDATE customers 
      SET name = customer_name, updated_at = now()
      WHERE id = customer_id AND (name IS NULL OR name != customer_name);
    END IF;
  END IF;
  
  RETURN customer_id;
END;
$$ LANGUAGE plpgsql;