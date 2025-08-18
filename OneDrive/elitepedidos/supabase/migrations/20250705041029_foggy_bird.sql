/*
  # Update PDV Operator Permissions

  1. Changes
    - Add new permission fields to the operator permissions JSON structure
    - Add permissions for viewing different menu sections
    - Ensure backward compatibility with existing operators

  2. Security
    - No changes to existing RLS policies needed
    - Maintains existing security model
*/

-- Update the default permissions structure for new operators
UPDATE pdv_operators
SET permissions = jsonb_build_object(
  'can_discount', COALESCE((permissions->>'can_discount')::boolean, true),
  'can_cancel', COALESCE((permissions->>'can_cancel')::boolean, true),
  'can_manage_products', COALESCE((permissions->>'can_manage_products')::boolean, false),
  'can_view_sales', true,
  'can_view_cash_register', true,
  'can_view_products', true,
  'can_view_orders', true,
  'can_view_reports', true,
  'can_view_sales_report', true,
  'can_view_cash_report', true,
  'can_view_operators', COALESCE((permissions->>'can_manage_products')::boolean, false)
)
WHERE permissions IS NOT NULL;

-- Update the admin operator to have all permissions
UPDATE pdv_operators
SET permissions = jsonb_build_object(
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
WHERE code IN ('ADMIN', 'admin');

-- Update the default permissions for new operators
ALTER TABLE pdv_operators
ALTER COLUMN permissions SET DEFAULT '{"can_discount": true, "can_cancel": true, "can_manage_products": false, "can_view_sales": true, "can_view_cash_register": true, "can_view_products": true, "can_view_orders": true, "can_view_reports": true, "can_view_sales_report": true, "can_view_cash_report": true, "can_view_operators": false}';