/*
  # Fix Admin Password for PDV Module

  1. Updates
    - Update the ADMIN user password to '123456'
    - Ensure the password is properly hashed
*/

-- Update the admin password to '123456'
UPDATE pdv_operators
SET password_hash = crypt('123456', gen_salt('bf'))
WHERE code = 'ADMIN';

-- If the admin user doesn't exist, create it
INSERT INTO pdv_operators (name, code, password_hash, permissions)
SELECT 'Administrador', 'ADMIN', crypt('123456', gen_salt('bf')), '{"can_discount": true, "can_cancel": true, "can_manage_products": true}'
WHERE NOT EXISTS (
  SELECT 1 FROM pdv_operators WHERE code = 'ADMIN'
);