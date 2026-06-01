-- ==========================================================
-- MIGRATION: 21_fix_accounting_invoices.sql
-- Action: 
-- 1. Add current_balance to accounts and triggers to auto-update
-- 2. Create trigger to auto-generate Invoice Numbers (INV260001)
-- 3. Create trigger to auto-generate Payment Numbers (PAY260001)
-- ==========================================================

-- --------------------------------------------------------
-- 1. ACCOUNT BALANCE FIX
-- --------------------------------------------------------

-- Add current_balance column to accounts
ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS current_balance NUMERIC(15,2) DEFAULT 0;

-- Function to update the account balance whenever a transaction happens
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
  target_account_id UUID;
BEGIN
  -- Determine which account to update based on operation
  IF TG_OP = 'DELETE' THEN
    target_account_id := OLD.account_id;
  ELSE
    target_account_id := NEW.account_id;
  END IF;

  IF target_account_id IS NOT NULL THEN
    UPDATE public.accounts
    SET current_balance = opening_balance 
      + COALESCE((SELECT SUM(amount) FROM public.income_transactions WHERE account_id = target_account_id), 0)
      + COALESCE((SELECT SUM(amount) FROM public.vendor_payments WHERE account_id = target_account_id), 0)
      - COALESCE((SELECT SUM(amount) FROM public.expense_transactions WHERE account_id = target_account_id), 0)
      - COALESCE((SELECT SUM(amount) FROM public.staff_payments WHERE account_id = target_account_id), 0)
    WHERE id = target_account_id;
  END IF;

  -- If UPDATE and account_id changed, also update the old account
  IF TG_OP = 'UPDATE' AND OLD.account_id IS DISTINCT FROM NEW.account_id AND OLD.account_id IS NOT NULL THEN
    UPDATE public.accounts
    SET current_balance = opening_balance 
      + COALESCE((SELECT SUM(amount) FROM public.income_transactions WHERE account_id = OLD.account_id), 0)
      + COALESCE((SELECT SUM(amount) FROM public.vendor_payments WHERE account_id = OLD.account_id), 0)
      - COALESCE((SELECT SUM(amount) FROM public.expense_transactions WHERE account_id = OLD.account_id), 0)
      - COALESCE((SELECT SUM(amount) FROM public.staff_payments WHERE account_id = OLD.account_id), 0)
    WHERE id = OLD.account_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers to all 4 tables
DROP TRIGGER IF EXISTS trigger_update_account_balance_income ON public.income_transactions;
CREATE TRIGGER trigger_update_account_balance_income
AFTER INSERT OR UPDATE OR DELETE ON public.income_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_account_balance();

DROP TRIGGER IF EXISTS trigger_update_account_balance_expense ON public.expense_transactions;
CREATE TRIGGER trigger_update_account_balance_expense
AFTER INSERT OR UPDATE OR DELETE ON public.expense_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_account_balance();

DROP TRIGGER IF EXISTS trigger_update_account_balance_vendor_payment ON public.vendor_payments;
CREATE TRIGGER trigger_update_account_balance_vendor_payment
AFTER INSERT OR UPDATE OR DELETE ON public.vendor_payments
FOR EACH ROW EXECUTE FUNCTION public.update_account_balance();

DROP TRIGGER IF EXISTS trigger_update_account_balance_staff_payment ON public.staff_payments;
CREATE TRIGGER trigger_update_account_balance_staff_payment
AFTER INSERT OR UPDATE OR DELETE ON public.staff_payments
FOR EACH ROW EXECUTE FUNCTION public.update_account_balance();

-- Initialize existing account balances
UPDATE public.accounts
SET current_balance = opening_balance 
  + COALESCE((SELECT SUM(amount) FROM public.income_transactions WHERE account_id = accounts.id), 0)
  + COALESCE((SELECT SUM(amount) FROM public.vendor_payments WHERE account_id = accounts.id), 0)
  - COALESCE((SELECT SUM(amount) FROM public.expense_transactions WHERE account_id = accounts.id), 0)
  - COALESCE((SELECT SUM(amount) FROM public.staff_payments WHERE account_id = accounts.id), 0);

-- --------------------------------------------------------
-- 2. INVOICE NUMBER GENERATOR (INV-2606-0001)
-- --------------------------------------------------------

ALTER TABLE public.vendor_invoices ALTER COLUMN invoice_number DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_vendor_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  yymm_prefix TEXT;
  last_num INT;
  next_num INT;
  new_inv_num TEXT;
BEGIN
  -- Format: INV-YYMM-0001
  yymm_prefix := to_char(CURRENT_DATE, 'YYMM');
  
  -- INV-YYMM- has 9 characters, number starts at index 10
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 10) AS INT)), 0)
  INTO last_num
  FROM public.vendor_invoices
  WHERE invoice_number LIKE 'INV-' || yymm_prefix || '-%';
  
  next_num := last_num + 1;
  new_inv_num := 'INV-' || yymm_prefix || '-' || lpad(next_num::TEXT, 4, '0');
  
  NEW.invoice_number := new_inv_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_vendor_invoice_number ON public.vendor_invoices;
CREATE TRIGGER trigger_generate_vendor_invoice_number
BEFORE INSERT ON public.vendor_invoices
FOR EACH ROW
EXECUTE FUNCTION public.generate_vendor_invoice_number();

-- --------------------------------------------------------
-- 3. PAYMENT NUMBER GENERATOR (PAY-2606-0001)
-- --------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_vendor_payment_number()
RETURNS TRIGGER AS $$
DECLARE
  yymm_prefix TEXT;
  last_num INT;
  next_num INT;
  new_pay_num TEXT;
BEGIN
  -- Format: PAY-YYMM-0001
  yymm_prefix := to_char(CURRENT_DATE, 'YYMM');
  
  -- PAY-YYMM- has 9 characters, number starts at index 10
  SELECT COALESCE(MAX(CAST(SUBSTRING(payment_number FROM 10) AS INT)), 0)
  INTO last_num
  FROM public.vendor_payments
  WHERE payment_number LIKE 'PAY-' || yymm_prefix || '-%';
  
  next_num := last_num + 1;
  new_pay_num := 'PAY-' || yymm_prefix || '-' || lpad(next_num::TEXT, 4, '0');
  
  NEW.payment_number := new_pay_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_vendor_payment_number ON public.vendor_payments;
CREATE TRIGGER trigger_generate_vendor_payment_number
BEFORE INSERT ON public.vendor_payments
FOR EACH ROW
EXECUTE FUNCTION public.generate_vendor_payment_number();

-- --------------------------------------------------------
-- 4. MIGRATE OLD INVOICES & PAYMENTS TO YYMM FORMAT
-- --------------------------------------------------------

DO $$
DECLARE
  inv_record RECORD;
  pay_record RECORD;
  current_month_prefix TEXT := '';
  record_month_prefix TEXT;
  inv_counter INT := 1;
  pay_counter INT := 1;
BEGIN
  -- Update Old Invoices (Reset counter per month)
  FOR inv_record IN SELECT id, created_at FROM public.vendor_invoices ORDER BY created_at ASC LOOP
    record_month_prefix := to_char(inv_record.created_at, 'YYMM');
    
    IF record_month_prefix != current_month_prefix THEN
      current_month_prefix := record_month_prefix;
      inv_counter := 1;
    END IF;

    UPDATE public.vendor_invoices 
    SET invoice_number = 'INV-' || current_month_prefix || '-' || lpad(inv_counter::TEXT, 4, '0')
    WHERE id = inv_record.id;
    
    inv_counter := inv_counter + 1;
  END LOOP;

  -- Reset variables for payments
  current_month_prefix := '';

  -- Update Old Payments (Reset counter per month)
  FOR pay_record IN SELECT id, created_at FROM public.vendor_payments ORDER BY created_at ASC LOOP
    record_month_prefix := to_char(pay_record.created_at, 'YYMM');
    
    IF record_month_prefix != current_month_prefix THEN
      current_month_prefix := record_month_prefix;
      pay_counter := 1;
    END IF;

    UPDATE public.vendor_payments 
    SET payment_number = 'PAY-' || current_month_prefix || '-' || lpad(pay_counter::TEXT, 4, '0')
    WHERE id = pay_record.id;
    
    pay_counter := pay_counter + 1;
  END LOOP;
END;
$$;
