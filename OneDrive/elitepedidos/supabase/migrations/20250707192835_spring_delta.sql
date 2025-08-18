/*
  # Fix Admin User Permissions

  1. Changes
    - Ensure ADMIN user exists with correct permissions
    - Update password to 'elite2024'
    - Grant all permissions to ADMIN user
    - Fix any missing permissions in the permissions JSON structure

  2. Security
    - Maintain existing RLS policies
    - No changes to access control
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
WHERE code = 'ADMIN';

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
  SELECT 1 FROM pdv_operators WHERE code = 'ADMIN'
);

-- Update the admin user in the database
UPDATE pdv_operators
SET name = 'Administrador',
    is_active = true
WHERE code = 'ADMIN';

-- Update the admin user in the auth.users table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'auth') THEN
    UPDATE auth.users
    SET email = 'admin@example.com',
        email_confirmed_at = now(),
        confirmed_at = now(),
        last_sign_in_at = now(),
        raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', ARRAY['email'])
    WHERE email = 'admin@example.com';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors if auth schema doesn't exist
  NULL;
END $$;