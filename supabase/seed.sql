-- Seed File for First Story Films
-- Action: Run THIS after running schema.sql

-- Note: Since we are using Native Supabase Auth, we cannot insert users with passwords directly via SQL.
-- Passwords must be hashed by Supabase's internal GoTrue server.

-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard -> Authentication -> Users.
-- 2. Click "Add User".
-- 3. Create a user:
--    Email: admin@firststory.com
--    Password: admin123
--    (Ensure 'Auto Confirm Email' is checked)

-- 4. AFTER you do step 3, run the SQL below to promote that user to ADMIN.

UPDATE public.users 
SET role = 'ADMIN', name = 'Admin Account', mobile = '0000000000'
WHERE email = 'admin@firststory.com';

-- Why? 
-- The 'handle_new_user' trigger (in schema.sql) automatically inserted the user 
-- into the 'users' table when you clicked 'Add User'. 
-- But it defaulted their role to 'USER'. This script upgrades them to 'ADMIN'.
