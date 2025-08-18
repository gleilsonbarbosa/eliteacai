/*
  # Update Admin Password

  1. Changes
    - Update the ADMIN user password to 'elite2024'
    - Ensure the password is properly hashed
    - Update permissions to grant full access

  2. Security
    - Password is securely hashed using bcrypt
    - Full permissions are granted to the admin user
*/

-- Update the admin password to 'elite2024'
UPDATE pdv_operators
SET password_hash = crypt('elite2024', gen_salt('bf')),
    permissions = jsonb_build_object(
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
      'can_view_operators', true
    )
WHERE code = 'ADMIN';

-- If the admin user doesn't exist, create it
INSERT INTO pdv_operators (name, code, password_hash, is_active, permissions)
SELECT 'Administrador', 'ADMIN', crypt('elite2024', gen_salt('bf')), true, 
  jsonb_build_object(
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
    'can_view_operators', true
  )
WHERE NOT EXISTS (
  SELECT 1 FROM pdv_operators WHERE code = 'ADMIN'
);

-- Update the admin user in the database
UPDATE pdv_operators
SET name = 'Administrador',
    is_active = true
WHERE code = 'ADMIN';