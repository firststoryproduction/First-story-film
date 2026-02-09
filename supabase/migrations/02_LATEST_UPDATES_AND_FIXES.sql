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
