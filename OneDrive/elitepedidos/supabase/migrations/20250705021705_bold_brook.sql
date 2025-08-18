/*
  # Fix PDV Sale Error

  1. Changes
    - Create a proper UUID for admin operator
    - Update PDV sales function to handle operator IDs correctly
    - Add error handling for sales process
*/

-- Create a proper UUID for admin operator
UPDATE pdv_operators
SET id = gen_random_uuid()
WHERE code = 'admin' AND id IS NULL;

-- Create a function to get default operator ID
CREATE OR REPLACE FUNCTION get_default_operator_id()
RETURNS uuid AS $$
DECLARE
  op_id uuid;
BEGIN
  -- Try to get admin operator ID
  SELECT id INTO op_id FROM pdv_operators WHERE code = 'admin' LIMIT 1;
  
  -- If not found, try ADMIN
  IF op_id IS NULL THEN
    SELECT id INTO op_id FROM pdv_operators WHERE code = 'ADMIN' LIMIT 1;
  END IF;
  
  -- If still not found, get any operator
  IF op_id IS NULL THEN
    SELECT id INTO op_id FROM pdv_operators LIMIT 1;
  END IF;
  
  -- If no operators exist, create a default one
  IF op_id IS NULL THEN
    INSERT INTO pdv_operators (
      name, 
      code, 
      password_hash, 
      is_active, 
      permissions
    ) VALUES (
      'Default Operator',
      'DEFAULT',
      crypt('123456', gen_salt('bf')),
      true,
      '{"can_discount": true, "can_cancel": true, "can_manage_products": true}'
    ) RETURNING id INTO op_id;
  END IF;
  
  RETURN op_id;
END;
$$ LANGUAGE plpgsql;

-- Create a function to safely process sales
CREATE OR REPLACE FUNCTION process_pdv_sale(
  sale_data jsonb,
  items_data jsonb
) RETURNS jsonb AS $$
DECLARE
  new_sale_id uuid;
  new_sale_number integer;
  operator_id uuid;
  result jsonb;
BEGIN
  -- Get operator ID or use default
  IF sale_data->>'operator_id' = 'admin-id' OR sale_data->>'operator_id' IS NULL THEN
    operator_id := get_default_operator_id();
  ELSE
    BEGIN
      operator_id := (sale_data->>'operator_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      operator_id := get_default_operator_id();
    END;
  END IF;
  
  -- Insert the sale
  INSERT INTO pdv_sales (
    operator_id,
    customer_name,
    customer_phone,
    subtotal,
    discount_amount,
    discount_percentage,
    total_amount,
    payment_type,
    payment_details,
    change_amount,
    notes,
    is_cancelled
  ) VALUES (
    operator_id,
    sale_data->>'customer_name',
    sale_data->>'customer_phone',
    (sale_data->>'subtotal')::decimal,
    (sale_data->>'discount_amount')::decimal,
    (sale_data->>'discount_percentage')::decimal,
    (sale_data->>'total_amount')::decimal,
    (sale_data->>'payment_type')::pdv_payment_type,
    sale_data->'payment_details',
    (sale_data->>'change_amount')::decimal,
    sale_data->>'notes',
    (sale_data->>'is_cancelled')::boolean
  )
  RETURNING id, sale_number INTO new_sale_id, new_sale_number;
  
  -- Insert sale items
  FOR i IN 0..jsonb_array_length(items_data) - 1 LOOP
    INSERT INTO pdv_sale_items (
      sale_id,
      product_id,
      product_code,
      product_name,
      quantity,
      weight_kg,
      unit_price,
      price_per_gram,
      discount_amount,
      subtotal
    ) VALUES (
      new_sale_id,
      (items_data->i->>'product_id')::uuid,
      items_data->i->>'product_code',
      items_data->i->>'product_name',
      (items_data->i->>'quantity')::decimal,
      (items_data->i->>'weight_kg')::decimal,
      (items_data->i->>'unit_price')::decimal,
      (items_data->i->>'price_per_gram')::decimal,
      (items_data->i->>'discount_amount')::decimal,
      (items_data->i->>'subtotal')::decimal
    );
  END LOOP;
  
  -- Return the result
  SELECT jsonb_build_object(
    'id', new_sale_id,
    'sale_number', new_sale_number,
    'success', true,
    'message', 'Sale created successfully'
  ) INTO result;
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- Log the error
  PERFORM log_pdv_error(SQLERRM, jsonb_build_object(
    'sale_data', sale_data,
    'items_data', items_data,
    'error', SQLERRM,
    'context', 'process_pdv_sale function'
  ));
  
  -- Return error
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql;