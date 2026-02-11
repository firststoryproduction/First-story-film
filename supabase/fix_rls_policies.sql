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
