/*
  # Remove Table Sales Menu from PDV

  1. Changes
    - Update all operators to remove the 'can_view_table_sales' permission
    - Ensure admin user has all other permissions except table_sales
    - Update default permissions for new operators
*/

-- Update all operators to remove the table_sales permission
UPDATE pdv_operators
SET permissions = permissions - 'can_view_table_sales';

-- Update the admin user with all permissions except table_sales
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

-- Update the default permissions for new operators
ALTER TABLE pdv_operators
ALTER COLUMN permissions SET DEFAULT '{"can_discount": true, "can_cancel": true, "can_manage_products": false, "can_view_sales": true, "can_view_cash_register": true, "can_view_products": true, "can_view_orders": true, "can_view_reports": true, "can_view_sales_report": true, "can_view_cash_report": true, "can_view_operators": false, "can_view_attendance": true}';