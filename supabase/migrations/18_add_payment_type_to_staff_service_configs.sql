-- Add payment_type to staff_service_configs
-- 'commission' = percentage based (existing behaviour)
-- 'salary'     = fixed salary, no commission % needed (percentage stored as 0)
ALTER TABLE staff_service_configs
  ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'commission'
    CHECK (payment_type IN ('commission', 'salary'));
