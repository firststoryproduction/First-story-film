-- Add payment_type column to vendor_invoices
-- Supports 'commission' (show commission breakdown) and 'salary' (show staff/salary type)
ALTER TABLE vendor_invoices
  ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'commission'
    CHECK (payment_type IN ('commission', 'salary'));
