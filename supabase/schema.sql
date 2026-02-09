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
  staff_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Delete job if staff is deleted
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
-- This function securely checks if the current user is an admin/manager without triggering recursive policy checks.
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

-- Users: Admin sees everyone
-- Uses the secure function to avoid infinite loops.
DROP POLICY IF EXISTS "Users: Admins View All" ON users;
CREATE POLICY "Users: Admins View All" ON users FOR SELECT
USING ( is_privileged() );

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
USING ( is_privileged() );

-- Configs: Admin manages
DROP POLICY IF EXISTS "Configs: Admin Manage" ON staff_service_configs;
CREATE POLICY "Configs: Admin Manage" ON staff_service_configs FOR ALL
USING ( is_privileged() );

-- Configs: Staff sees own
DROP POLICY IF EXISTS "Configs: Staff View Own" ON staff_service_configs;
CREATE POLICY "Configs: Staff View Own" ON staff_service_configs FOR SELECT
USING ( staff_id = auth.uid() );

-- Vendors: Admin manages
DROP POLICY IF EXISTS "Vendors: Admin Manage" ON vendors;
CREATE POLICY "Vendors: Admin Manage" ON vendors FOR ALL
USING ( is_privileged() );

-- Vendors: Staff views
DROP POLICY IF EXISTS "Vendors: Staff View" ON vendors;
CREATE POLICY "Vendors: Staff View" ON vendors FOR SELECT
USING ( true );

-- Jobs: Admin manages all
DROP POLICY IF EXISTS "Jobs: Admin Manage All" ON jobs;
CREATE POLICY "Jobs: Admin Manage All" ON jobs FOR ALL
USING ( is_privileged() );

-- Jobs: Staff sees assigned
DROP POLICY IF EXISTS "Jobs: Staff View Assigned" ON jobs;
CREATE POLICY "Jobs: Staff View Assigned" ON jobs FOR SELECT
USING ( auth.uid() = staff_id OR is_privileged() );

-- Jobs: Staff updates assigned (e.g. status)
DROP POLICY IF EXISTS "Jobs: Staff Update Assigned" ON jobs;
CREATE POLICY "Jobs: Staff Update Assigned" ON jobs FOR UPDATE
USING ( auth.uid() = staff_id OR is_privileged() );


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

