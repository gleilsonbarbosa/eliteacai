/*
  # Add default PDV admin operator

  1. New Data
    - Insert default 'admin' operator into `pdv_operators` table
    - Set up with full permissions for system administration
    - Default password will be hashed by the trigger function

  2. Security
    - Password will be automatically hashed by existing trigger
    - Full permissions granted for administrative tasks
*/

INSERT INTO pdv_operators (
  code,
  name,
  password_hash,
  is_active,
  permissions
) VALUES (
  'admin',
  'Administrador',
  '123456',
  true,
  '{"can_discount": true, "can_cancel": true, "can_manage_products": true}'::jsonb
) ON CONFLICT (code) DO NOTHING;