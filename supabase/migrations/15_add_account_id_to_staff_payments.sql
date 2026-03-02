-- Migration 15: Add account_id to staff_payments
-- Links each staff payment to a specific account (e.g. cash, bank)

ALTER TABLE staff_payments
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

-- Add created_by to staff_payments
-- Tracks which admin/user recorded the payment

ALTER TABLE staff_payments
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
