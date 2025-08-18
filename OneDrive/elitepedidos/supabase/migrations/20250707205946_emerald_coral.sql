-- Function to insert test data for cash register entries
CREATE OR REPLACE FUNCTION insert_test_cash_entries()
RETURNS void 
LANGUAGE plpgsql
AS $$
DECLARE
  register_id uuid;
  operator_id uuid;
  entries_count integer;
BEGIN
  -- Check if we have any entries
  SELECT COUNT(*) INTO entries_count FROM pdv_cash_entries;
  
  -- Only insert test data if we have no entries
  IF entries_count = 0 THEN
    -- Get or create operator
    SELECT id INTO operator_id FROM pdv_operators WHERE code = 'ADMIN' LIMIT 1;
    
    IF operator_id IS NULL THEN
      INSERT INTO pdv_operators (name, code, password_hash, is_active, permissions)
      VALUES ('Administrador', 'ADMIN', crypt('elite2024', gen_salt('bf')), true, 
        '{"can_discount": true, "can_cancel": true, "can_manage_products": true, "can_view_sales": true, "can_view_cash_register": true, "can_view_products": true, "can_view_orders": true, "can_view_reports": true, "can_view_sales_report": true, "can_view_cash_report": true, "can_view_operators": true, "can_view_attendance": true}'::jsonb)
      RETURNING id INTO operator_id;
    END IF;
    
    -- Get active cash register or create one
    SELECT id INTO register_id FROM pdv_cash_registers WHERE closed_at IS NULL LIMIT 1;
    
    IF register_id IS NULL THEN
      -- Create a new register
      INSERT INTO pdv_cash_registers (opening_amount, opened_at, operator_id)
      VALUES (100.00, now(), operator_id)
      RETURNING id INTO register_id;
    END IF;
    
    -- Insert test entries
    -- Cash sales
    INSERT INTO pdv_cash_entries (register_id, type, amount, description, payment_method, created_at)
    VALUES 
      (register_id, 'income', 29.89, 'Venda #14', 'dinheiro', now()),
      (register_id, 'income', 5.50, 'Venda #13', 'dinheiro', now() - interval '1 hour'),
      (register_id, 'income', 6.99, 'Venda #12', 'dinheiro', now() - interval '2 hours');
    
    -- Card sales
    INSERT INTO pdv_cash_entries (register_id, type, amount, description, payment_method, created_at)
    VALUES 
      (register_id, 'income', 35.50, 'Venda #11', 'cartao_credito', now() - interval '3 hours'),
      (register_id, 'income', 42.75, 'Venda #10', 'cartao_debito', now() - interval '4 hours');
    
    -- PIX sales
    INSERT INTO pdv_cash_entries (register_id, type, amount, description, payment_method, created_at)
    VALUES 
      (register_id, 'income', 27.50, 'Venda #9', 'pix', now() - interval '5 hours');
    
    -- Delivery orders
    INSERT INTO pdv_cash_entries (register_id, type, amount, description, payment_method, created_at)
    VALUES 
      (register_id, 'income', 55.00, 'Delivery #abcd1234', 'dinheiro', now() - interval '6 hours'),
      (register_id, 'income', 42.90, 'Delivery #efgh5678', 'pix', now() - interval '7 hours');
    
    -- Other income
    INSERT INTO pdv_cash_entries (register_id, type, amount, description, payment_method, created_at)
    VALUES 
      (register_id, 'income', 10.00, 'Depósito em caixa', 'dinheiro', now() - interval '8 hours'),
      (register_id, 'income', 15.00, 'Pagamento de cliente', 'dinheiro', now() - interval '9 hours');
    
    -- Expenses
    INSERT INTO pdv_cash_entries (register_id, type, amount, description, payment_method, created_at)
    VALUES 
      (register_id, 'expense', 5.50, 'Compra de material de limpeza', 'dinheiro', now() - interval '10 hours'),
      (register_id, 'expense', 12.75, 'Pagamento de entregador', 'dinheiro', now() - interval '11 hours');
    
    RAISE NOTICE 'Test cash entries inserted successfully';
  ELSE
    RAISE NOTICE 'Skipping test data insertion, entries already exist';
  END IF;
END $$;

-- Run the function to insert test data
SELECT insert_test_cash_entries();

-- Function to insert test sales data
CREATE OR REPLACE FUNCTION insert_test_sales_data()
RETURNS void 
LANGUAGE plpgsql
AS $$
DECLARE
  operator_id uuid;
  sales_count integer;
  product_id uuid;
  sale_id uuid;
BEGIN
  -- Check if we already have sales data
  SELECT COUNT(*) INTO sales_count FROM pdv_sales;
  
  -- Only insert test data if we have no sales
  IF sales_count = 0 THEN
    -- Get or create operator
    SELECT id INTO operator_id FROM pdv_operators WHERE code = 'ADMIN' LIMIT 1;
    
    IF operator_id IS NULL THEN
      INSERT INTO pdv_operators (name, code, password_hash, is_active, permissions)
      VALUES ('Administrador', 'ADMIN', crypt('elite2024', gen_salt('bf')), true, 
        '{"can_discount": true, "can_cancel": true, "can_manage_products": true, "can_view_sales": true, "can_view_cash_register": true, "can_view_products": true, "can_view_orders": true, "can_view_reports": true, "can_view_sales_report": true, "can_view_cash_report": true, "can_view_operators": true, "can_view_attendance": true}'::jsonb)
      RETURNING id INTO operator_id;
    END IF;
    
    -- Get a product ID or create one
    SELECT id INTO product_id FROM pdv_products LIMIT 1;
    
    IF product_id IS NULL THEN
      INSERT INTO pdv_products (code, name, category, is_weighable, unit_price, description)
      VALUES ('ACAI300', 'Açaí 300ml', 'acai', false, 15.90, 'Açaí tradicional 300ml')
      RETURNING id INTO product_id;
    END IF;
    
    -- Insert test sales (last 7 days)
    -- Day 1
    INSERT INTO pdv_sales (operator_id, customer_name, subtotal, discount_amount, total_amount, payment_type, created_at)
    VALUES 
      (operator_id, 'Maria Silva', 29.80, 0, 29.80, 'dinheiro', now() - interval '7 days'),
      (operator_id, 'João Santos', 45.50, 5.00, 40.50, 'cartao_credito', now() - interval '7 days'),
      (operator_id, 'Ana Oliveira', 22.90, 0, 22.90, 'pix', now() - interval '7 days');
    
    -- Day 2
    INSERT INTO pdv_sales (operator_id, customer_name, subtotal, discount_amount, total_amount, payment_type, created_at)
    VALUES 
      (operator_id, 'Carlos Pereira', 35.80, 0, 35.80, 'dinheiro', now() - interval '6 days'),
      (operator_id, 'Fernanda Costa', 18.50, 0, 18.50, 'cartao_debito', now() - interval '6 days'),
      (operator_id, 'Roberto Alves', 52.90, 3.00, 49.90, 'pix', now() - interval '6 days');
    
    -- Day 3
    INSERT INTO pdv_sales (operator_id, customer_name, subtotal, discount_amount, total_amount, payment_type, created_at)
    VALUES 
      (operator_id, 'Juliana Lima', 42.80, 0, 42.80, 'dinheiro', now() - interval '5 days'),
      (operator_id, 'Marcos Souza', 31.50, 0, 31.50, 'cartao_credito', now() - interval '5 days'),
      (operator_id, 'Patricia Gomes', 27.90, 0, 27.90, 'pix', now() - interval '5 days');
    
    -- Day 4
    INSERT INTO pdv_sales (operator_id, customer_name, subtotal, discount_amount, total_amount, payment_type, created_at)
    VALUES 
      (operator_id, 'Luciana Ferreira', 39.80, 0, 39.80, 'dinheiro', now() - interval '4 days'),
      (operator_id, 'Ricardo Martins', 25.50, 0, 25.50, 'cartao_debito', now() - interval '4 days'),
      (operator_id, 'Camila Rodrigues', 33.90, 0, 33.90, 'pix', now() - interval '4 days');
    
    -- Day 5
    INSERT INTO pdv_sales (operator_id, customer_name, subtotal, discount_amount, total_amount, payment_type, created_at)
    VALUES 
      (operator_id, 'Eduardo Santos', 47.80, 5.00, 42.80, 'dinheiro', now() - interval '3 days'),
      (operator_id, 'Beatriz Almeida', 29.50, 0, 29.50, 'cartao_credito', now() - interval '3 days'),
      (operator_id, 'Gabriel Oliveira', 36.90, 0, 36.90, 'pix', now() - interval '3 days');
    
    -- Day 6
    INSERT INTO pdv_sales (operator_id, customer_name, subtotal, discount_amount, total_amount, payment_type, created_at)
    VALUES 
      (operator_id, 'Mariana Costa', 32.80, 0, 32.80, 'dinheiro', now() - interval '2 days'),
      (operator_id, 'Felipe Sousa', 41.50, 0, 41.50, 'cartao_debito', now() - interval '2 days'),
      (operator_id, 'Amanda Pereira', 28.90, 0, 28.90, 'pix', now() - interval '2 days');
    
    -- Day 7 (Today)
    INSERT INTO pdv_sales (operator_id, customer_name, subtotal, discount_amount, total_amount, payment_type, created_at)
    VALUES 
      (operator_id, 'Leonardo Silva', 37.80, 0, 37.80, 'dinheiro', now() - interval '1 hour'),
      (operator_id, 'Isabela Santos', 44.50, 4.50, 40.00, 'cartao_credito', now() - interval '2 hours'),
      (operator_id, 'Thiago Oliveira', 26.90, 0, 26.90, 'pix', now() - interval '3 hours');
    
    -- Get the last sale ID for sale items
    SELECT id INTO sale_id FROM pdv_sales ORDER BY created_at DESC LIMIT 1;
    
    -- Insert sale items for the last sale
    INSERT INTO pdv_sale_items (sale_id, product_id, product_code, product_name, quantity, unit_price, subtotal)
    VALUES 
      (sale_id, product_id, 'ACAI300', 'Açaí 300ml', 1, 15.90, 15.90),
      (sale_id, product_id, 'ACAI300', 'Açaí 300ml', 1, 15.90, 15.90);
    
    RAISE NOTICE 'Test sales data inserted successfully';
  ELSE
    RAISE NOTICE 'Skipping test sales data insertion, sales already exist';
  END IF;
END $$;

-- Run the function to insert test sales data
SELECT insert_test_sales_data();

-- Function to ensure cash register entries are linked to sales
CREATE OR REPLACE FUNCTION ensure_cash_entries_for_sales()
RETURNS void 
LANGUAGE plpgsql
AS $$
DECLARE
  register_id uuid;
  sale record;
BEGIN
  -- Get active cash register
  SELECT id INTO register_id FROM pdv_cash_registers WHERE closed_at IS NULL LIMIT 1;
  
  -- If no active register, create one
  IF register_id IS NULL THEN
    -- Get an operator ID
    DECLARE
      operator_id uuid;
    BEGIN
      SELECT id INTO operator_id FROM pdv_operators WHERE code = 'ADMIN' LIMIT 1;
      
      IF operator_id IS NULL THEN
        INSERT INTO pdv_operators (name, code, password_hash, is_active, permissions)
        VALUES ('Administrador', 'ADMIN', crypt('elite2024', gen_salt('bf')), true, 
          '{"can_discount": true, "can_cancel": true, "can_manage_products": true, "can_view_sales": true, "can_view_cash_register": true, "can_view_products": true, "can_view_orders": true, "can_view_reports": true, "can_view_sales_report": true, "can_view_cash_report": true, "can_view_operators": true, "can_view_attendance": true}'::jsonb)
        RETURNING id INTO operator_id;
      END IF;
      
      -- Create a new register
      INSERT INTO pdv_cash_registers (opening_amount, opened_at, operator_id)
      VALUES (100.00, now(), operator_id)
      RETURNING id INTO register_id;
    END;
  END IF;
  
  -- For each sale, ensure there's a corresponding cash entry
  FOR sale IN 
    SELECT * FROM pdv_sales 
    WHERE NOT EXISTS (
      SELECT 1 FROM pdv_cash_entries 
      WHERE description LIKE 'Venda #' || sale_number::text
    )
    AND is_cancelled = false
  LOOP
    -- Create cash entry for this sale
    INSERT INTO pdv_cash_entries (
      register_id, 
      type, 
      amount, 
      description, 
      payment_method, 
      created_at
    ) VALUES (
      register_id,
      'income',
      sale.total_amount,
      'Venda #' || sale.sale_number,
      sale.payment_type::text,
      sale.created_at
    );
    
    RAISE NOTICE 'Created cash entry for sale #%', sale.sale_number;
  END LOOP;
END $$;

-- Run the function to ensure cash entries exist for all sales
SELECT ensure_cash_entries_for_sales();

-- Update permissions for all operators to ensure they can view reports and cash register
UPDATE pdv_operators
SET permissions = jsonb_build_object(
  'can_discount', COALESCE((permissions->>'can_discount')::boolean, true),
  'can_cancel', COALESCE((permissions->>'can_cancel')::boolean, true),
  'can_manage_products', COALESCE((permissions->>'can_manage_products')::boolean, false),
  'can_view_sales', true,
  'can_view_cash_register', true,
  'can_view_products', true,
  'can_view_orders', true,
  'can_view_reports', true,
  'can_view_sales_report', true,
  'can_view_cash_report', true,
  'can_view_operators', COALESCE((permissions->>'can_view_operators')::boolean, false),
  'can_view_attendance', true
)
WHERE permissions IS NOT NULL;

-- Update the admin operator to have all permissions
UPDATE pdv_operators
SET permissions = jsonb_build_object(
  'can_discount', true,
  'can_cancel', true,
  'can_manage_products', true,
  'can_view_sales', true,
  'can_view_cash_register', true,
  'can_view_products', true,
  'can_view_orders', true,
  'can_view_reports', true,
  'can_view_sales_report', true,
  'can_view_cash_report', true,
  'can_view_operators', true,
  'can_view_attendance', true
)
WHERE code IN ('ADMIN', 'admin');