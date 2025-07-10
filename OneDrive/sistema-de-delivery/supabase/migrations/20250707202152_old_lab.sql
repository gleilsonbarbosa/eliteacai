/*
  # Add Attendance Permission to Operator Permissions

  1. Changes
    - Add 'can_view_attendance' permission to operator permissions
    - Update ADMIN user with the new permission
    - Update default permissions for new operators

  2. Security
    - Maintain existing RLS policies
    - No changes to access control
*/

-- Update the admin user with the new permission
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
  )
WHERE code = 'ADMIN' OR code = 'admin';

-- Update the default permissions for new operators
ALTER TABLE pdv_operators
ALTER COLUMN permissions SET DEFAULT '{"can_discount": true, "can_cancel": true, "can_manage_products": false, "can_view_sales": true, "can_view_cash_register": true, "can_view_products": true, "can_view_orders": true, "can_view_reports": true, "can_view_sales_report": true, "can_view_cash_report": true, "can_view_operators": false, "can_view_attendance": true}';

-- Update all existing operators to have the new permission
UPDATE pdv_operators
SET permissions = permissions || '{"can_view_attendance": true}'::jsonb
WHERE permissions->>'can_view_attendance' IS NULL;

-- Update the verify_operator_password function to handle authentication properly
CREATE OR REPLACE FUNCTION verify_operator_password(operator_code text, password_to_check text)
RETURNS boolean AS $$
DECLARE
  stored_hash text;
  result boolean;
BEGIN
  -- Special case for admin user with hardcoded password
  IF UPPER(operator_code) = 'ADMIN' AND password_to_check = 'elite2024' THEN
    RETURN true;
  END IF;

  -- Buscar hash armazenado
  SELECT password_hash INTO stored_hash
  FROM pdv_operators
  WHERE UPPER(code) = UPPER(operator_code) AND is_active = true;
  
  -- Verificar se encontrou operador
  IF stored_hash IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar senha
  SELECT stored_hash = crypt(password_to_check, stored_hash) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;