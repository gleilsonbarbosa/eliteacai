/*
  # Add Test Data for Reports and Sales History

  1. New Features
    - Add test sales data spanning the last 7 days
    - Add test cash register entries with various payment methods
    - Add test delivery orders with different statuses
    - Add test cash movements (income and expenses)

  2. Purpose
    - Populate reports and sales history with realistic test data
    - Enable testing of cash register summary functionality
    - Provide data for sales reports and charts
*/

-- Function to insert test data for reports
CREATE OR REPLACE FUNCTION insert_test_report_data()
RETURNS void 
LANGUAGE plpgsql
AS $$
DECLARE
  register_id uuid;
  operator_id uuid;
  entries_count integer;
  sale_id uuid;
  product_id uuid;
BEGIN
  -- Check if we already have sales data
  SELECT COUNT(*) INTO entries_count FROM pdv_sales;
  
  -- Only insert test data if we have no sales
  IF entries_count = 0 THEN
    -- Get or create operator
    SELECT id INTO operator_id FROM pdv_operators WHERE code = 'ADMIN' LIMIT 1;
    
    IF operator_id IS NULL THEN
      INSERT INTO pdv_operators (name, code, password_hash, is_active, permissions)
      VALUES ('Administrador', 'ADMIN', crypt('elite2024', gen_salt('bf')), true, 
        '{"can_discount": true, "can_cancel": true, "can_manage_products": true}'::jsonb)
      RETURNING id INTO operator_id;
    END IF;
    
    -- Get active cash register or create one
    SELECT id INTO register_id FROM pdv_cash_registers WHERE closed_at IS NULL LIMIT 1;
    
    IF register_id IS NULL THEN
      -- Create a new register
      INSERT INTO pdv_cash_registers (opening_amount, opened_at, operator_id)
      VALUES (100.00, now() - interval '3 days', operator_id)
      RETURNING id INTO register_id;
      
      -- Create a closed register for history
      INSERT INTO pdv_cash_registers (opening_amount, opened_at, closed_at, closing_amount, difference, operator_id)
      VALUES (200.00, now() - interval '7 days', now() - interval '6 days', 350.00, 0.00, operator_id);
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
    
    -- Insert cash entries for the active register
    INSERT INTO pdv_cash_entries (register_id, type, amount, description, payment_method, created_at)
    VALUES 
      (register_id, 'income', 37.80, 'Venda #1001', 'dinheiro', now() - interval '1 hour'),
      (register_id, 'income', 40.00, 'Venda #1002', 'cartao_credito', now() - interval '2 hours'),
      (register_id, 'income', 26.90, 'Venda #1003', 'pix', now() - interval '3 hours'),
      (register_id, 'income', 55.00, 'Delivery #abcd1234', 'dinheiro', now() - interval '4 hours'),
      (register_id, 'income', 42.90, 'Delivery #efgh5678', 'pix', now() - interval '5 hours'),
      (register_id, 'income', 10.00, 'Depósito em caixa', 'dinheiro', now() - interval '6 hours'),
      (register_id, 'expense', 5.50, 'Compra de material de limpeza', 'dinheiro', now() - interval '7 hours');
    
    -- Insert orders for delivery
    INSERT INTO orders (
      customer_name, 
      customer_phone, 
      customer_address, 
      customer_neighborhood, 
      payment_method, 
      items, 
      total_price, 
      status, 
      created_at
    )
    VALUES 
      (
        'Maria Silva', 
        '85999998888', 
        'Rua A, 123', 
        'Centro', 
        'money', 
        '[{"product_name":"Açaí 300ml","quantity":2,"unit_price":15.90,"total_price":31.80,"complements":[]}]'::jsonb, 
        31.80, 
        'delivered', 
        now() - interval '1 day'
      ),
      (
        'João Santos', 
        '85999997777', 
        'Rua B, 456', 
        'Aldeota', 
        'card', 
        '[{"product_name":"Açaí 500ml","quantity":1,"unit_price":22.90,"total_price":22.90,"complements":[]}]'::jsonb, 
        22.90, 
        'delivered', 
        now() - interval '2 days'
      ),
      (
        'Ana Oliveira', 
        '85999996666', 
        'Rua C, 789', 
        'Meireles', 
        'pix', 
        '[{"product_name":"Açaí 700ml","quantity":1,"unit_price":31.90,"total_price":31.90,"complements":[]}]'::jsonb, 
        31.90, 
        'delivered', 
        now() - interval '3 days'
      );
    
    RAISE NOTICE 'Test data inserted successfully';
  ELSE
    RAISE NOTICE 'Skipping test data insertion, sales already exist';
  END IF;
END $$;

-- Run the function to insert test data
SELECT insert_test_report_data();