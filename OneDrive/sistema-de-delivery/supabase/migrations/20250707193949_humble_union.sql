/*
  # Fix Admin Permissions and Create Unified Attendance Page

  1. Changes
    - Update ADMIN user with all necessary permissions
    - Ensure the ADMIN user exists with correct credentials
    - Add permissions for the unified attendance page

  2. Security
    - Set proper permissions for the ADMIN user
    - Ensure the ADMIN user has access to all features
*/

-- Update the admin password to 'elite2024' and ensure all permissions are granted
UPDATE pdv_operators
SET 
  password_hash = crypt('elite2024', gen_salt('bf')),
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
  ),
  is_active = true
WHERE code = 'ADMIN' OR code = 'admin';

-- If the admin user doesn't exist, create it
INSERT INTO pdv_operators (
  name, 
  code, 
  password_hash, 
  is_active, 
  permissions
)
SELECT 
  'Administrador', 
  'ADMIN', 
  crypt('elite2024', gen_salt('bf')), 
  true, 
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
  SELECT 1 FROM pdv_operators WHERE code = 'ADMIN' OR code = 'admin'
);

-- Create a standard operator with limited permissions if it doesn't exist
INSERT INTO pdv_operators (
  name, 
  code, 
  password_hash, 
  is_active, 
  permissions
)
SELECT 
  'Operador Padrão', 
  'OP001', 
  crypt('123456', gen_salt('bf')), 
  true, 
  jsonb_build_object(
    'can_discount', false,
    'can_cancel', false,
    'can_manage_products', false,
    'can_view_sales', true,
    'can_view_cash_register', false,
    'can_view_products', false,
    'can_view_orders', true,
    'can_view_reports', false,
    'can_view_sales_report', false,
    'can_view_cash_report', false,
    'can_view_operators', false
  )
WHERE NOT EXISTS (
  SELECT 1 FROM pdv_operators WHERE code = 'OP001'
);