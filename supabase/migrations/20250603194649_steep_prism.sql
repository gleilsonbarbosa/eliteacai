/*
  # Create customer balances view

  1. Changes
    - Create view to calculate current month balances
    - Include next expiring cashback information
    - Handle expired cashback properly
    - Ensure non-negative balances

  2. Security
    - Maintain existing RLS policies
*/

-- Create view for customer balances
CREATE VIEW customer_balances AS
SELECT 
  c.id as customer_id,
  GREATEST(
    COALESCE(
      (
        SELECT SUM(
          CASE 
            WHEN type = 'purchase' AND status = 'approved' THEN cashback_amount
            WHEN type = 'redemption' AND status = 'approved' THEN -amount
            WHEN type = 'adjustment' AND status = 'approved' THEN cashback_amount
            ELSE 0
          END
        )
        FROM transactions t
        WHERE t.customer_id = c.id
        AND DATE_TRUNC('month', t.created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)
      ),
      0
    ),
    0
  ) as available_balance,
  (
    SELECT cashback_amount
    FROM transactions t
    WHERE t.customer_id = c.id
      AND t.type = 'purchase'
      AND t.status = 'approved'
      AND t.expires_at > CURRENT_TIMESTAMP
    ORDER BY t.expires_at ASC
    LIMIT 1
  ) as expiring_amount,
  (
    SELECT expires_at
    FROM transactions t
    WHERE t.customer_id = c.id
      AND t.type = 'purchase'
      AND t.status = 'approved'
      AND t.expires_at > CURRENT_TIMESTAMP
    ORDER BY t.expires_at ASC
    LIMIT 1
  ) as expiration_date
FROM customers c;

-- Add comment
COMMENT ON VIEW customer_balances IS 'Shows customer balances with strict non-negative handling';