/*
  # Add New PDV Products

  1. New Products
    - 1Kg de Açai (R$ 44,99)
    - 1Kg de Açai - Quinta Promocional (R$ 37,99)
    - PROMOÇÃO COPO SEM PESO 300ML (R$ 9,99)
    - PROMOÇÃO DO DIA - COPO DE 500ML SEM PESO - 15,99 (R$ 15,99)
    - Taxa de 3,00 - Pedidos pelo WhatsApp (R$ 3,00)
    - PROMOÇÃO DO DIA - COPO DE 400ML SEM PESO - 12,99 (R$ 12,99)
    - Taxa de 4,00 - Pedidos pelo WhatsApp (R$ 4,00)
    - COMBO CASAL (R$ 49,99)
    - Taxa de 5,00 - Pedidos pelo WhatsApp (R$ 5,00)
    - Copo de 200ml (R$ 6,99)
*/

-- Insert new products
INSERT INTO pdv_products (code, name, category, is_weighable, unit_price, price_per_gram, description, is_active)
VALUES
  ('ACAI1KG', '1Kg de Açai', 'acai', false, 44.99, NULL, 'Açaí tradicional 1kg', true),
  ('ACAI1KGQUI', '1Kg de Açai - Quinta Promocional', 'acai', false, 37.99, NULL, 'Açaí tradicional 1kg - Promoção de quinta-feira', true),
  ('PROMO300ML', 'PROMOÇÃO COPO SEM PESO 300ML', 'acai', false, 9.99, NULL, 'Promoção copo 300ml sem peso', true),
  ('PROMO500ML', 'PROMOÇÃO DO DIA - COPO DE 500ML SEM PESO - 15,99', 'acai', false, 15.99, NULL, 'Promoção copo 500ml sem peso', true),
  ('TAXA3', 'Taxa de 3,00 - Pedidos pelo WhatsApp', 'outros', false, 3.00, NULL, 'Taxa de entrega R$ 3,00', true),
  ('PROMO400ML', 'PROMOÇÃO DO DIA - COPO DE 400ML SEM PESO - 12,99', 'acai', false, 12.99, NULL, 'Promoção copo 400ml sem peso', true),
  ('TAXA4', 'Taxa de 4,00 - Pedidos pelo WhatsApp', 'outros', false, 4.00, NULL, 'Taxa de entrega R$ 4,00', true),
  ('COMBOCASAL', 'COMBO CASAL', 'acai', false, 49.99, NULL, 'Combo especial para casal', true),
  ('TAXA5', 'Taxa de 5,00 - Pedidos pelo WhatsApp', 'outros', false, 5.00, NULL, 'Taxa de entrega R$ 5,00', true),
  ('COPO200ML', 'Copo de 200ml', 'acai', false, 6.99, NULL, 'Açaí copo 200ml', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  description = EXCLUDED.description,
  is_active = true,
  updated_at = now();