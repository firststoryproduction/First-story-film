-- ==========================================================
-- >>> START MIGRATION: 22_update_invoice_payment_format.sql <<<
-- Action: 
-- 1. Change Invoice Number format to INV-YYYYMM-XXXX
-- 2. Change Payment Number format to PAY-YYYYMM-XXXX
-- 3. Reset sequences to 1 at the start of every month
-- ==========================================================

-- --------------------------------------------------------
-- 1. INVOICE NUMBER GENERATOR (INV-YYYYMM-0001)
-- --------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_vendor_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  ym_prefix TEXT;
  last_num INT;
  next_num INT;
  new_inv_num TEXT;
BEGIN
  -- Format: INV-YYYYMM- (e.g. INV-202606-)
  ym_prefix := 'INV-' || to_char(CURRENT_DATE, 'YYYYMM') || '-';
  
  -- Extract the last 4 digits to find the sequence number
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 12) AS INT)), 0)
  INTO last_num
  FROM public.vendor_invoices
  WHERE invoice_number LIKE ym_prefix || '%';
  
  next_num := last_num + 1;
  new_inv_num := ym_prefix || lpad(next_num::TEXT, 4, '0');
  
  NEW.invoice_number := new_inv_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------
-- 2. PAYMENT NUMBER GENERATOR (PAY-YYYYMM-0001)
-- --------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_vendor_payment_number()
RETURNS TRIGGER AS $$
DECLARE
  ym_prefix TEXT;
  last_num INT;
  next_num INT;
  new_pay_num TEXT;
BEGIN
  -- Format: PAY-YYYYMM- (e.g. PAY-202606-)
  ym_prefix := 'PAY-' || to_char(CURRENT_DATE, 'YYYYMM') || '-';
  
  -- Extract the last 4 digits to find the sequence number
  SELECT COALESCE(MAX(CAST(SUBSTRING(payment_number FROM 12) AS INT)), 0)
  INTO last_num
  FROM public.vendor_payments
  WHERE payment_number LIKE ym_prefix || '%';
  
  next_num := last_num + 1;
  new_pay_num := ym_prefix || lpad(next_num::TEXT, 4, '0');
  
  NEW.payment_number := new_pay_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------
-- 3. MIGRATE OLD INVOICES & PAYMENTS TO NEW FORMAT
-- --------------------------------------------------------
DO $$
DECLARE
  inv_record RECORD; pay_record RECORD; ym_prefix TEXT;
  inv_counter INT := 1; pay_counter INT := 1;
BEGIN
  -- We'll just reset all existing records to the current month's format
  -- so they are consistent.
  ym_prefix := to_char(CURRENT_DATE, 'YYYYMM');
  
  FOR inv_record IN SELECT id FROM public.vendor_invoices ORDER BY created_at ASC LOOP
    UPDATE public.vendor_invoices 
    SET invoice_number = 'INV-' || ym_prefix || '-' || lpad(inv_counter::TEXT, 4, '0') 
    WHERE id = inv_record.id;
    inv_counter := inv_counter + 1;
  END LOOP;
  
  FOR pay_record IN SELECT id FROM public.vendor_payments ORDER BY created_at ASC LOOP
    UPDATE public.vendor_payments 
    SET payment_number = 'PAY-' || ym_prefix || '-' || lpad(pay_counter::TEXT, 4, '0') 
    WHERE id = pay_record.id;
    pay_counter := pay_counter + 1;
  END LOOP;
END;
$$;
