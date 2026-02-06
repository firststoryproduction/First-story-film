-- Add the missing user to public.users table
-- This user exists in auth.users but not in public.users

INSERT INTO public.users (id, email, name, role, mobile, created_at)
VALUES (
    'b215764a-1506-471b-817e-5e1d8252c5b2',
    'admin@firststory.com',
    'Admin User',
    'ADMIN',
    '9999999999',
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    role = 'ADMIN',
    email = 'admin@firststory.com';
