-- Migration 19: Add payment_type to staff_payments
-- 'commission' = regular commission payment (existing behaviour)
-- 'salary'     = fixed salary payment
ALTER TABLE staff_payments
  ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'commission'
    CHECK (payment_type IN ('commission', 'salary'));
