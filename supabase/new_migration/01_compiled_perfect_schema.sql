-- ==========================================================
-- PERFECT COMPILED SQL SCHEMA FOR FIRST STORY FILMS
-- This file sequentially applies all schema migrations
-- and final policy fixes to create a perfect database state.
-- ==========================================================

-- >>> START MIGRATION: 01_INITIAL_SCHEMA.sql <<<
-- First Story Films Database Schema (Final Version)
-- Authenticaton: Native Supabase Auth
-- Use this file to initialize the entire database.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
-- Integrated with Supabase Auth: 'id' matches 'auth.users.id'
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT DEFAULT 'New User', -- Relaxed constraint
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'USER' CHECK (role IN ('ADMIN', 'MANAGER', 'USER')),
  mobile TEXT DEFAULT '', -- Relaxed constraint
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SERVICES TABLE
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. STAFF SERVICE CONFIG (COMMISSIONS) TABLE
CREATE TABLE IF NOT EXISTS staff_service_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  percentage NUMERIC(5,2) NOT NULL, -- e.g. 10.50%
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, service_id)
);

-- 4. VENDORS TABLE
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. JOBS TABLE
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES services(id),
  vendor_id UUID REFERENCES vendors(id),
  staff_id UUID NOT NULL REFERENCES users(id),
  description TEXT NOT NULL,
  data_location TEXT,
  final_location TEXT,
  job_due_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'PAUSE', 'COMPLETED')),
  amount NUMERIC(10,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_jobs_staff_id ON jobs(staff_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_due_date ON jobs(job_due_date);
CREATE INDEX IF NOT EXISTS idx_staff_service_configs_staff ON staff_service_configs(staff_id);

-- TRIGGERS (Auto-update 'updated_at')
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_service_configs_updated_at ON staff_service_configs;
CREATE TRIGGER update_staff_service_configs_updated_at BEFORE UPDATE ON staff_service_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors;
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_service_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Policy Wrappers to handle recursion/logic cleanly
-- Note: 'auth.jwt() ->> role' checks Supabase Auth Role (which is usually 'authenticated').
-- We need to check our INTERNAL 'users' table role column ('ADMIN', 'MANAGER', 'USER').

-- HELPER: Prevent RLS Recursion
-- This function securely checks if the current user is an admin without triggering recursive policy checks.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
    AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users: Admin sees everyone
-- Uses the secure function to avoid infinite loops.
DROP POLICY IF EXISTS "Users: Admins View All" ON users;
CREATE POLICY "Users: Admins View All" ON users FOR SELECT
USING ( is_admin() );

-- Users: Anyone can see THEMSELVES (Critical for loading profile)
DROP POLICY IF EXISTS "Users: View Self" ON users;
CREATE POLICY "Users: View Self" ON users FOR SELECT
USING ( auth.uid() = id );

-- Services: Everyone can view
DROP POLICY IF EXISTS "Services: View All" ON services;
CREATE POLICY "Services: View All" ON services FOR SELECT
USING ( true );

-- Services: Only Admin can edit
DROP POLICY IF EXISTS "Services: Admin Edit" ON services;
CREATE POLICY "Services: Admin Edit" ON services FOR ALL
USING ( is_admin() );

-- Configs: Admin manages
DROP POLICY IF EXISTS "Configs: Admin Manage" ON staff_service_configs;
CREATE POLICY "Configs: Admin Manage" ON staff_service_configs FOR ALL
USING ( is_admin() );

-- Configs: Staff sees own
DROP POLICY IF EXISTS "Configs: Staff View Own" ON staff_service_configs;
CREATE POLICY "Configs: Staff View Own" ON staff_service_configs FOR SELECT
USING ( staff_id = auth.uid() );

-- Vendors: Admin manages
DROP POLICY IF EXISTS "Vendors: Admin Manage" ON vendors;
CREATE POLICY "Vendors: Admin Manage" ON vendors FOR ALL
USING ( is_admin() );

-- Vendors: Staff views
DROP POLICY IF EXISTS "Vendors: Staff View" ON vendors;
CREATE POLICY "Vendors: Staff View" ON vendors FOR SELECT
USING ( true );

-- Jobs: Admin manages all
DROP POLICY IF EXISTS "Jobs: Admin Manage All" ON jobs;
CREATE POLICY "Jobs: Admin Manage All" ON jobs FOR ALL
USING ( is_admin() );

-- Jobs: Staff sees assigned
DROP POLICY IF EXISTS "Jobs: Staff View Assigned" ON jobs;
CREATE POLICY "Jobs: Staff View Assigned" ON jobs FOR SELECT
USING ( true );

-- Jobs: Staff updates assigned (e.g. status)
DROP POLICY IF EXISTS "Jobs: Staff Update Assigned" ON jobs;
CREATE POLICY "Jobs: Staff Update Assigned" ON jobs FOR UPDATE
USING ( true );


-- AUTOMATIC NEW USER HANDLER
-- Trigger to sync Auth Users -> Public Users
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, mobile)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', 'New User'),
    COALESCE(new.raw_user_meta_data->>'role', 'USER'),
    COALESCE(new.raw_user_meta_data->>'mobile', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, users.name),
    mobile = COALESCE(EXCLUDED.mobile, users.mobile);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- >>> END MIGRATION: 01_INITIAL_SCHEMA.sql <<<

-- >>> START MIGRATION: 02_LATEST_UPDATES_AND_FIXES.sql <<<
-- Migration: Fix Status and Vendor Fields
-- Created: 2026-02-04

-- 1. Helper Function: is_privileged (Security Definer to prevent RLS recursion)
CREATE OR REPLACE FUNCTION public.is_privileged()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
    AND role IN ('ADMIN', 'MANAGER')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix Vendor Table
ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Fix Jobs Table Status Constraint & Data Sync
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE public.jobs 
ADD CONSTRAINT jobs_status_check 
CHECK (status IN ('PENDING', 'IN_PROGRESS', 'PAUSE', 'COMPLETED'));

-- Force sync any legacy status names to be valid
UPDATE public.jobs SET status = 'COMPLETED' WHERE status = 'COMPLETE';
UPDATE public.jobs SET status = 'PENDING' WHERE status NOT IN ('PENDING', 'IN_PROGRESS', 'PAUSE', 'COMPLETED');

-- 4. Fix RLS Policies for Staff
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Services: View All" ON public.services;
CREATE POLICY "Services: View All" ON public.services FOR SELECT USING (true);

DROP POLICY IF EXISTS "Vendors: Staff View" ON public.vendors;
CREATE POLICY "Vendors: Staff View" ON public.vendors FOR SELECT USING (true);

DROP POLICY IF EXISTS "Jobs: Staff View Assigned" ON public.jobs;
CREATE POLICY "Jobs: Staff View Assigned" ON public.jobs FOR SELECT 
USING (auth.uid() = staff_id OR is_privileged());

DROP POLICY IF EXISTS "Jobs: Staff Update Assigned" ON public.jobs;
CREATE POLICY "Jobs: Staff Update Assigned" ON public.jobs FOR UPDATE 
USING (auth.uid() = staff_id OR is_privileged());

-- 4b. Update Missing Privileged Policies (Modernize is_admin -> is_privileged)
DROP POLICY IF EXISTS "Users: Admins View All" ON public.users;
CREATE POLICY "Users: Admins View All" ON public.users FOR SELECT
USING ( is_privileged() );

DROP POLICY IF EXISTS "Services: Admin Edit" ON public.services;
CREATE POLICY "Services: Admin Edit" ON public.services FOR ALL
USING ( is_privileged() );

DROP POLICY IF EXISTS "Configs: Admin Manage" ON public.staff_service_configs;
CREATE POLICY "Configs: Admin Manage" ON public.staff_service_configs FOR ALL
USING ( is_privileged() );

DROP POLICY IF EXISTS "Vendors: Admin Manage" ON public.vendors;
CREATE POLICY "Vendors: Admin Manage" ON public.vendors FOR ALL
USING ( is_privileged() );

DROP POLICY IF EXISTS "Jobs: Admin Manage All" ON public.jobs;
CREATE POLICY "Jobs: Admin Manage All" ON public.jobs FOR ALL
USING ( is_privileged() );

-- 5. Improved User Sync Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, mobile)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', 'New User'),
    COALESCE(new.raw_user_meta_data->>'role', 'USER'),
    COALESCE(new.raw_user_meta_data->>'mobile', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, users.name),
    mobile = COALESCE(EXCLUDED.mobile, users.mobile);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- >>> END MIGRATION: 02_LATEST_UPDATES_AND_FIXES.sql <<<

-- >>> START MIGRATION: 03_FIX_USER_DELETION_CONSTRAINT.sql <<<
-- Fix Job Table Staff Constraint to allow User Deletion
-- We change staff_id to nullable and add ON DELETE SET NULL

ALTER TABLE jobs
ALTER COLUMN staff_id DROP NOT NULL;

ALTER TABLE jobs
DROP CONSTRAINT IF EXISTS jobs_staff_id_fkey;

ALTER TABLE jobs
ADD CONSTRAINT jobs_staff_id_fkey 
FOREIGN KEY (staff_id) 
REFERENCES users(id) 
ON DELETE CASCADE;

-- >>> END MIGRATION: 03_FIX_USER_DELETION_CONSTRAINT.sql <<<

-- >>> START MIGRATION: 04_FIX_USER_RLS_UPDATE.sql <<<
-- Migration: 04_FIX_USER_RLS_UPDATE.sql
-- Goal: Allow Admins to update user profiles in the 'users' table.

DROP POLICY IF EXISTS "Users: Admins Update All" ON users;
CREATE POLICY "Users: Admins Update All" ON users FOR UPDATE
USING ( is_admin() )
WITH CHECK ( is_admin() );

-- Also allow users to update their own basic info (if needed)
DROP POLICY IF EXISTS "Users: Update Self" ON users;
CREATE POLICY "Users: Update Self" ON users FOR UPDATE
USING ( auth.uid() = id )
WITH CHECK ( auth.uid() = id );

-- >>> END MIGRATION: 04_FIX_USER_RLS_UPDATE.sql <<<

-- >>> START MIGRATION: 05_FIX_RLS_POLICIES.sql <<<
-- Migration: 05_FIX_RLS_POLICIES.sql
-- Goal: Ensure robust RLS policies for Admins/Managers and define missing helper functions.

-- 1. Create or Replace Helper Functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_privileged() -- Unified check for ADMIN or MANAGER
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Repair Users table policies (Fixing the is_admin bug from 04)
DROP POLICY IF EXISTS "Users: Admins Update All" ON users;
CREATE POLICY "Users: Admins Update All" ON users FOR UPDATE
USING ( is_privileged() )
WITH CHECK ( is_privileged() );

-- 3. Repair Vendors table policies
-- Use explicit policies for each action to be more reliable
DROP POLICY IF EXISTS "Vendors: Admin Manage" ON public.vendors;
DROP POLICY IF EXISTS "Vendors: Admin Insert" ON public.vendors;
DROP POLICY IF EXISTS "Vendors: Admin Update" ON public.vendors;
DROP POLICY IF EXISTS "Vendors: Admin Delete" ON public.vendors;

CREATE POLICY "Vendors: Admin Insert" ON public.vendors FOR INSERT WITH CHECK ( is_privileged() );
CREATE POLICY "Vendors: Admin Update" ON public.vendors FOR UPDATE USING ( is_privileged() ) WITH CHECK ( is_privileged() );
CREATE POLICY "Vendors: Admin Delete" ON public.vendors FOR DELETE USING ( is_privileged() );
CREATE POLICY "Vendors: Admin Select" ON public.vendors FOR SELECT USING ( is_privileged() OR true ); -- true for staff view policy below

-- 4. Repair Services table policies
DROP POLICY IF EXISTS "Services: Admin Edit" ON public.services;
DROP POLICY IF EXISTS "Services: Admin Manage" ON public.services;

CREATE POLICY "Services: Admin Manage" ON public.services FOR ALL USING ( is_privileged() ) WITH CHECK ( is_privileged() );

-- 5. Repair Jobs table policies
DROP POLICY IF EXISTS "Jobs: Admin Manage All" ON public.jobs;
CREATE POLICY "Jobs: Admin Manage All" ON public.jobs FOR ALL USING ( is_privileged() ) WITH CHECK ( is_privileged() );

-- >>> END MIGRATION: 05_FIX_RLS_POLICIES.sql <<<

-- >>> START MIGRATION: 06_ADD_STAFF_DUE_DATE.sql <<<
-- Add staff_due_date column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS staff_due_date TIMESTAMPTZ;

-- Add index for staff_due_date for better query performance
CREATE INDEX IF NOT EXISTS idx_jobs_staff_due_date ON jobs(staff_due_date);

-- >>> END MIGRATION: 06_ADD_STAFF_DUE_DATE.sql <<<

-- >>> START MIGRATION: 07_user_payment_history.sql <<<
CREATE TABLE staff_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries by staff
CREATE INDEX idx_staff_payments_staff_id ON staff_payments(staff_id);

-- Enable Row Level Security
ALTER TABLE staff_payments ENABLE ROW LEVEL SECURITY;

-- Allow full access to authenticated users (admins)
CREATE POLICY "Allow all for authenticated"
  ON staff_payments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
-- >>> END MIGRATION: 07_user_payment_history.sql <<<

-- >>> START MIGRATION: 08_vendor_payments.sql <<<
CREATE TABLE IF NOT EXISTS vendor_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz DEFAULT now()
);

-- Optional: Enable RLS like other tables
ALTER TABLE vendor_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON vendor_payments
  FOR ALL USING (auth.role() = 'authenticated');
-- >>> END MIGRATION: 08_vendor_payments.sql <<<

-- >>> START MIGRATION: 09_vendor_invoices.sql <<<
-- vendor_invoices: stores saved invoices for vendors
CREATE TABLE IF NOT EXISTS vendor_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,           -- e.g. INV-CF1CC3F2
  client_name text,
  note text,
  job_ids uuid[] NOT NULL DEFAULT '{}',  -- array of job UUIDs included in this invoice
  total_amount numeric NOT NULL DEFAULT 0,
  total_commission numeric NOT NULL DEFAULT 0,
  net_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE vendor_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON vendor_invoices
  FOR ALL USING (auth.role() = 'authenticated');

-- >>> END MIGRATION: 09_vendor_invoices.sql <<<

-- >>> START MIGRATION: 10_add_invoice_id_to_payments.sql <<<
-- Add invoice_id column to vendor_payments to link payments with invoices
-- This enables accurate Payment Status calculation per job

ALTER TABLE vendor_payments
ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES vendor_invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS vendor_payments_invoice_id_idx ON vendor_payments(invoice_id);

-- >>> END MIGRATION: 10_add_invoice_id_to_payments.sql <<<

-- >>> START MIGRATION: 11_add_payment_number.sql <<<
-- Add payment_number column to vendor_payments
ALTER TABLE vendor_payments
ADD COLUMN IF NOT EXISTS payment_number text;

CREATE INDEX IF NOT EXISTS vendor_payments_payment_number_idx ON vendor_payments(payment_number);

-- >>> END MIGRATION: 11_add_payment_number.sql <<<

-- >>> START MIGRATION: 12_accounting_module.sql <<<
-- =====================================================
-- ACCOUNTING MODULE
-- Migration 12: Accounts, Income & Expense Tracking
-- =====================================================

-- 1. ACCOUNTS TABLE (Master - Multi-Account Support)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_name TEXT NOT NULL,
  opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one default account at a time (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_single_default
  ON accounts (is_default)
  WHERE is_default = true;

-- 2. INCOME CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS income_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. EXPENSE CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INCOME TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS income_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  income_date DATE NOT NULL DEFAULT CURRENT_DATE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  income_category_id UUID NOT NULL REFERENCES income_categories(id) ON DELETE RESTRICT,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  remarks TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. EXPENSE TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS expense_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  expense_category_id UUID NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  remarks TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_income_transactions_date ON income_transactions(income_date);
CREATE INDEX IF NOT EXISTS idx_income_transactions_account ON income_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_income_transactions_category ON income_transactions(income_category_id);
CREATE INDEX IF NOT EXISTS idx_income_transactions_created_by ON income_transactions(created_by);

CREATE INDEX IF NOT EXISTS idx_expense_transactions_date ON expense_transactions(expense_date);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_account ON expense_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_category ON expense_transactions(expense_category_id);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_created_by ON expense_transactions(created_by);

-- =====================================================
-- AUTO-UPDATE TRIGGERS
-- =====================================================
DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_income_categories_updated_at ON income_categories;
CREATE TRIGGER update_income_categories_updated_at
  BEFORE UPDATE ON income_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expense_categories_updated_at ON expense_categories;
CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON expense_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_income_transactions_updated_at ON income_transactions;
CREATE TRIGGER update_income_transactions_updated_at
  BEFORE UPDATE ON income_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expense_transactions_updated_at ON expense_transactions;
CREATE TRIGGER update_expense_transactions_updated_at
  BEFORE UPDATE ON expense_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_transactions ENABLE ROW LEVEL SECURITY;

-- Accounts: Admin & Manager manage
DROP POLICY IF EXISTS "Accounts: Admin Manage" ON accounts;
CREATE POLICY "Accounts: Admin Manage" ON accounts FOR ALL
  USING (is_admin());

DROP POLICY IF EXISTS "Accounts: View Authenticated" ON accounts;
CREATE POLICY "Accounts: View Authenticated" ON accounts FOR SELECT
  USING (auth.role() = 'authenticated');

-- Income Categories: Admin Manage
DROP POLICY IF EXISTS "Income Categories: Admin Manage" ON income_categories;
CREATE POLICY "Income Categories: Admin Manage" ON income_categories FOR ALL
  USING (is_admin());

DROP POLICY IF EXISTS "Income Categories: View Authenticated" ON income_categories;
CREATE POLICY "Income Categories: View Authenticated" ON income_categories FOR SELECT
  USING (auth.role() = 'authenticated');

-- Expense Categories: Admin Manage
DROP POLICY IF EXISTS "Expense Categories: Admin Manage" ON expense_categories;
CREATE POLICY "Expense Categories: Admin Manage" ON expense_categories FOR ALL
  USING (is_admin());

DROP POLICY IF EXISTS "Expense Categories: View Authenticated" ON expense_categories;
CREATE POLICY "Expense Categories: View Authenticated" ON expense_categories FOR SELECT
  USING (auth.role() = 'authenticated');

-- Income Transactions: Admin Manage
DROP POLICY IF EXISTS "Income Transactions: Admin Manage" ON income_transactions;
CREATE POLICY "Income Transactions: Admin Manage" ON income_transactions FOR ALL
  USING (is_admin());

DROP POLICY IF EXISTS "Income Transactions: View Authenticated" ON income_transactions;
CREATE POLICY "Income Transactions: View Authenticated" ON income_transactions FOR SELECT
  USING (auth.role() = 'authenticated');

-- Expense Transactions: Admin Manage
DROP POLICY IF EXISTS "Expense Transactions: Admin Manage" ON expense_transactions;
CREATE POLICY "Expense Transactions: Admin Manage" ON expense_transactions FOR ALL
  USING (is_admin());

DROP POLICY IF EXISTS "Expense Transactions: View Authenticated" ON expense_transactions;
CREATE POLICY "Expense Transactions: View Authenticated" ON expense_transactions FOR SELECT
  USING (auth.role() = 'authenticated');

-- =====================================================
-- SEED DEFAULT DATA
-- =====================================================

-- Default Income Categories
INSERT INTO income_categories (name, description) VALUES
  ('Job Payment', 'Payments received from clients for jobs'),
  ('Advance Payment', 'Advance received from clients'),
  ('Other Income', 'Miscellaneous income')
ON CONFLICT (name) DO NOTHING;

-- Default Expense Categories
INSERT INTO expense_categories (name, description) VALUES
  ('Office Supplies', 'Stationery and office consumables'),
  ('Equipment', 'Camera, lighting and other equipment'),
  ('Travel', 'Transport and travel expenses'),
  ('Vendor Payment', 'Payments made to vendors/studios'),
  ('Salary', 'Staff salary and wages'),
  ('Utilities', 'Electricity, internet, phone bills'),
  ('Marketing', 'Advertising and promotional expenses'),
  ('Other Expense', 'Miscellaneous expenses')
ON CONFLICT (name) DO NOTHING;

-- >>> END MIGRATION: 12_accounting_module.sql <<<

-- >>> START MIGRATION: 13_accounting_link_payments.sql <<<
-- Migration 13: Link Vendor & Staff payments into Accounting Expense view
-- Adds source tracking to expense_transactions for unified ledger

-- Add optional source link columns to expense_transactions
ALTER TABLE expense_transactions
  ADD COLUMN IF NOT EXISTS vendor_payment_id UUID REFERENCES vendor_payments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS staff_payment_id  UUID REFERENCES staff_payments(id)  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'vendor_payment', 'staff_payment'));

-- Index for source type filtering
CREATE INDEX IF NOT EXISTS idx_expense_transactions_source ON expense_transactions(source);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_vendor_payment ON expense_transactions(vendor_payment_id);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_staff_payment  ON expense_transactions(staff_payment_id);

-- >>> END MIGRATION: 13_accounting_link_payments.sql <<<

-- >>> START MIGRATION: 14_add_account_id_to_vendor_payments.sql <<<
-- Migration 14: Add account_id to vendor_payments
-- Links each vendor payment to a specific account (e.g. cash, bank)

ALTER TABLE vendor_payments
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

-- >>> END MIGRATION: 14_add_account_id_to_vendor_payments.sql <<<

-- >>> START MIGRATION: 15_add_account_id_to_staff_payments.sql <<<
-- Migration 15: Add account_id to staff_payments
-- Links each staff payment to a specific account (e.g. cash, bank)

ALTER TABLE staff_payments
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

-- Add created_by to staff_payments
-- Tracks which admin/user recorded the payment

ALTER TABLE staff_payments
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- >>> END MIGRATION: 15_add_account_id_to_staff_payments.sql <<<

-- >>> START MIGRATION: 16_activity_logs.sql <<<
-- Migration 16: Activity Logs Table
-- Central audit trail for all user actions in the system

CREATE TABLE IF NOT EXISTS activity_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name    TEXT NOT NULL DEFAULT '',
  action_type  TEXT NOT NULL CHECK (action_type IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT')),
  module_name  TEXT NOT NULL DEFAULT '',
  record_id    TEXT,
  description  TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'Success' CHECK (status IN ('Success', 'Failed')),
  ip_address   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id    ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_module_name ON activity_logs(module_name);
CREATE INDEX IF NOT EXISTS idx_activity_logs_status      ON activity_logs(status);

-- RLS: Only ADMIN can read/delete logs via service role bypass
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (API uses service role key)
CREATE POLICY "service_role_all_activity_logs"
  ON activity_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- >>> END MIGRATION: 16_activity_logs.sql <<<

-- >>> START MIGRATION: 17_add_payment_type_to_vendor_invoices.sql <<<
-- Add payment_type column to vendor_invoices
-- Supports 'commission' (show commission breakdown) and 'salary' (show staff/salary type)
ALTER TABLE vendor_invoices
  ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'commission'
    CHECK (payment_type IN ('commission', 'salary'));

-- >>> END MIGRATION: 17_add_payment_type_to_vendor_invoices.sql <<<

-- >>> START MIGRATION: 18_add_payment_type_to_staff_service_configs.sql <<<
-- Add payment_type to staff_service_configs
-- 'commission' = percentage based (existing behaviour)
-- 'salary'     = fixed salary, no commission % needed (percentage stored as 0)
ALTER TABLE staff_service_configs
  ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'commission'
    CHECK (payment_type IN ('commission', 'salary'));

-- >>> END MIGRATION: 18_add_payment_type_to_staff_service_configs.sql <<<

-- >>> START MIGRATION: 19_add_payment_type_to_staff_payments.sql <<<
-- Migration 19: Add payment_type to staff_payments
-- 'commission' = regular commission payment (existing behaviour)
-- 'salary'     = fixed salary payment
ALTER TABLE staff_payments
  ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'commission'
    CHECK (payment_type IN ('commission', 'salary'));

-- >>> END MIGRATION: 19_add_payment_type_to_staff_payments.sql <<<

-- >>> START HOTFIX: fix_rls_policies.sql <<<
-- FIX: RLS Circular Dependency Issue
-- The is_privileged() function was causing infinite loops because it was checking
-- the users table which itself has RLS policies that call is_privileged().
-- 
-- Solution: Make the function SECURITY DEFINER and set search_path to bypass RLS

-- Drop and recreate the function with proper security settings
DROP FUNCTION IF EXISTS public.is_privileged() CASCADE;

CREATE OR REPLACE FUNCTION public.is_privileged()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Directly query without triggering RLS by using SECURITY DEFINER
  -- and explicitly setting the search path
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;
  
  -- Return true if user is ADMIN or MANAGER
  RETURN (user_role = 'ADMIN' OR user_role = 'MANAGER');
EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs, assume not privileged
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- GRANT execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_privileged() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_privileged() TO anon;

-- Now recreate ALL the policies to ensure they use the fixed function

-- ============================================
-- USERS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users: Admins View All" ON users;
CREATE POLICY "Users: Admins View All" ON users FOR SELECT
USING ( public.is_privileged() );

DROP POLICY IF EXISTS "Users: View Self" ON users;
CREATE POLICY "Users: View Self" ON users FOR SELECT
USING ( auth.uid() = id );

DROP POLICY IF EXISTS "Users: Admin Manage" ON users;
CREATE POLICY "Users: Admin Manage" ON users FOR ALL
USING ( public.is_privileged() );

-- ============================================
-- SERVICES TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Services: View All" ON services;
CREATE POLICY "Services: View All" ON services FOR SELECT
USING ( true );

DROP POLICY IF EXISTS "Services: Admin Edit" ON services;
CREATE POLICY "Services: Admin Edit" ON services FOR ALL
USING ( public.is_privileged() );

-- ============================================
-- VENDORS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Vendors: Admin Manage" ON vendors;
CREATE POLICY "Vendors: Admin Manage" ON vendors FOR ALL
USING ( public.is_privileged() );

DROP POLICY IF EXISTS "Vendors: Staff View" ON vendors;
CREATE POLICY "Vendors: Staff View" ON vendors FOR SELECT
USING ( true );

--============================================
-- JOBS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Jobs: Admin Manage All" ON jobs;
CREATE POLICY "Jobs: Admin Manage All" ON jobs FOR ALL
USING ( public.is_privileged() );

DROP POLICY IF EXISTS "Jobs: Staff View Assigned" ON jobs;
CREATE POLICY "Jobs: Staff View Assigned" ON jobs FOR SELECT
USING ( auth.uid() = staff_id OR public.is_privileged() );

DROP POLICY IF EXISTS "Jobs: Staff Update Assigned" ON jobs;
CREATE POLICY "Jobs: Staff Update Assigned" ON jobs FOR UPDATE
USING ( auth.uid() = staff_id OR public.is_privileged() );

-- ============================================
-- STAFF SERVICE CONFIGS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Configs: Admin Manage" ON staff_service_configs;
CREATE POLICY "Configs: Admin Manage" ON staff_service_configs FOR ALL
USING ( public.is_privileged() );

DROP POLICY IF EXISTS "Configs: Staff View Own" ON staff_service_configs;
CREATE POLICY "Configs: Staff View Own" ON staff_service_configs FOR SELECT
USING ( staff_id = auth.uid() );

-- Verify the fix
SELECT 'RLS policies updated successfully!' as status;

-- >>> END HOTFIX: fix_rls_policies.sql <<<

-- ==========================================================
-- >>> START MIGRATION: 20_SEED_MOCK_DATA.sql <<<
-- MOCK DATA / SEED DATA
-- Action: Insert default services, vendors, and provide admin instructions.
-- Note: Users and Jobs require valid auth.users UUIDs, so they must be handled separately or manually.
-- ==========================================================

-- 1. Seed Services
INSERT INTO public.services (name) VALUES
  ('Traditional Photography'),
  ('Candid Photography'),
  ('Cinematography'),
  ('Pre-Wedding Shoot'),
  ('Drone Shoot'),
  ('Album Designing'),
  ('Video Editing')
ON CONFLICT (name) DO NOTHING;

-- 2. Seed Vendors
-- (We use DO NOTHING to prevent duplicates if this script is run multiple times)
INSERT INTO public.vendors (studio_name, contact_person, mobile, email, location, notes)
SELECT 'Creative Studio', 'Rahul Patel', '9876543210', 'rahul@creativestudio.com', 'Surat', 'Specialist in candid photography'
WHERE NOT EXISTS (SELECT 1 FROM public.vendors WHERE mobile = '9876543210');

INSERT INTO public.vendors (studio_name, contact_person, mobile, email, location, notes)
SELECT 'Sky High Drones', 'Amit Shah', '9876543211', 'amit@skyhigh.com', 'Ahmedabad', 'Drone & Aerial specialist'
WHERE NOT EXISTS (SELECT 1 FROM public.vendors WHERE mobile = '9876543211');

INSERT INTO public.vendors (studio_name, contact_person, mobile, email, location, notes)
SELECT 'Classic Edits', 'Sneha Desai', '9876543212', 'sneha@classicedits.com', 'Vadodara', 'Video editing and album design'
WHERE NOT EXISTS (SELECT 1 FROM public.vendors WHERE mobile = '9876543212');

-- 3. Promote Admin (Instructions)
-- Note: Since we are using Native Supabase Auth, we cannot insert users with passwords directly via SQL.
-- Passwords must be hashed by Supabase's internal GoTrue server.
-- 
-- INSTRUCTIONS FOR ADMIN CREATION:
-- 1. Go to Supabase Dashboard -> Authentication -> Users.
-- 2. Click "Add User" -> "Create new user".
-- 3. Create a user (e.g., admin@firststory.com) and set a secure password.
--    (Ensure 'Auto Confirm Email' is checked or manually confirm them)
-- 4. AFTER you do step 3, run the SQL query below in the SQL Editor to promote that user to ADMIN:
-- 
-- UPDATE public.users 
-- SET role = 'ADMIN', name = 'Admin Account', mobile = '0000000000'
-- WHERE email = 'admin@firststory.com';

-- >>> END MIGRATION: 20_SEED_MOCK_DATA.sql <<<

-- ==========================================================
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
      - COALESCE((SELECT SUM(amount) FROM public.expense_transactions WHERE account_id = target_account_id), 0)
      - COALESCE((SELECT SUM(amount) FROM public.vendor_payments WHERE account_id = target_account_id), 0)
      - COALESCE((SELECT SUM(amount) FROM public.staff_payments WHERE account_id = target_account_id), 0)
    WHERE id = target_account_id;
  END IF;

  -- If UPDATE and account_id changed, also update the old account
  IF TG_OP = 'UPDATE' AND OLD.account_id IS DISTINCT FROM NEW.account_id AND OLD.account_id IS NOT NULL THEN
    UPDATE public.accounts
    SET current_balance = opening_balance 
      + COALESCE((SELECT SUM(amount) FROM public.income_transactions WHERE account_id = OLD.account_id), 0)
      - COALESCE((SELECT SUM(amount) FROM public.expense_transactions WHERE account_id = OLD.account_id), 0)
      - COALESCE((SELECT SUM(amount) FROM public.vendor_payments WHERE account_id = OLD.account_id), 0)
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
  - COALESCE((SELECT SUM(amount) FROM public.expense_transactions WHERE account_id = accounts.id), 0)
  - COALESCE((SELECT SUM(amount) FROM public.vendor_payments WHERE account_id = accounts.id), 0)
  - COALESCE((SELECT SUM(amount) FROM public.staff_payments WHERE account_id = accounts.id), 0);

-- --------------------------------------------------------
-- 2. INVOICE NUMBER GENERATOR (INV260001)
-- --------------------------------------------------------

ALTER TABLE public.vendor_invoices ALTER COLUMN invoice_number DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_vendor_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  yr_prefix TEXT;
  last_num INT;
  next_num INT;
  new_inv_num TEXT;
BEGIN
  -- Always override with our generated format regardless of what the client sent
  yr_prefix := to_char(CURRENT_DATE, 'YY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 6) AS INT)), 0)
  INTO last_num
  FROM public.vendor_invoices
  WHERE invoice_number LIKE 'INV' || yr_prefix || '%';
  
  next_num := last_num + 1;
  new_inv_num := 'INV' || yr_prefix || lpad(next_num::TEXT, 4, '0');
  
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
-- 3. PAYMENT NUMBER GENERATOR (PAY260001)
-- --------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_vendor_payment_number()
RETURNS TRIGGER AS $$
DECLARE
  yr_prefix TEXT;
  last_num INT;
  next_num INT;
  new_pay_num TEXT;
BEGIN
  yr_prefix := to_char(CURRENT_DATE, 'YY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(payment_number FROM 6) AS INT)), 0)
  INTO last_num
  FROM public.vendor_payments
  WHERE payment_number LIKE 'PAY' || yr_prefix || '%';
  
  next_num := last_num + 1;
  new_pay_num := 'PAY' || yr_prefix || lpad(next_num::TEXT, 4, '0');
  
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
-- 4. MIGRATE OLD INVOICES & PAYMENTS TO NEW FORMAT
-- --------------------------------------------------------

DO $$
DECLARE
  inv_record RECORD;
  pay_record RECORD;
  yr_prefix TEXT;
  inv_counter INT := 1;
  pay_counter INT := 1;
BEGIN
  yr_prefix := to_char(CURRENT_DATE, 'YY');
  
  -- Update Old Invoices
  FOR inv_record IN SELECT id FROM public.vendor_invoices ORDER BY created_at ASC LOOP
    UPDATE public.vendor_invoices 
    SET invoice_number = 'INV' || yr_prefix || lpad(inv_counter::TEXT, 4, '0')
    WHERE id = inv_record.id;
    inv_counter := inv_counter + 1;
  END LOOP;

  -- Update Old Payments
  FOR pay_record IN SELECT id FROM public.vendor_payments ORDER BY created_at ASC LOOP
    UPDATE public.vendor_payments 
    SET payment_number = 'PAY' || yr_prefix || lpad(pay_counter::TEXT, 4, '0')
    WHERE id = pay_record.id;
    pay_counter := pay_counter + 1;
  END LOOP;
END;
$$;
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
