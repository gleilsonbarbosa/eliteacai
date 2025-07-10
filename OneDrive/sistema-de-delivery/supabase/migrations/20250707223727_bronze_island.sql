/*
  # Add Attendance Permission to Operators

  1. Changes
    - Adds the 'can_view_attendance' permission to all operators
    - Ensures all operators have this permission set to true
    - Updates the admin user with all permissions including attendance
  
  2. Security
    - Maintains existing permissions while adding the new one
*/

-- Update all operators to have the attendance permission
UPDATE pdv_operators
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{can_view_attendance}',
  'true'::jsonb
)
WHERE permissions->>'can_view_attendance' IS NULL;

-- Update the admin user with ALL permissions
UPDATE pdv_operators
SET 
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
    'can_view_operators', true,
    'can_view_attendance', true
  ),
  is_active = true,
  name = 'Administrador'
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
    'can_view_operators', true,
    'can_view_attendance', true
  )
WHERE NOT EXISTS (
  SELECT 1 FROM pdv_operators WHERE code = 'ADMIN' OR code = 'admin'
);

-- Create a standard operator with attendance permission if it doesn't exist
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
    'can_view_operators', false,
    'can_view_attendance', true
  )
WHERE NOT EXISTS (
  SELECT 1 FROM pdv_operators WHERE code = 'OP001'
);