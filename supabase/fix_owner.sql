-- Fix owner account credentials (run in Supabase SQL Editor)
-- This ensures the main account exists and has the correct password/role

-- Update password for the account
-- (If the account doesn't exist, you should first sign up with this email)
UPDATE auth.users
SET encrypted_password = crypt('OwnerShop@9191', gen_salt('bf')),
    email_confirmed_at = now(),
    raw_user_meta_data = '{"role":"owner","full_name":"Main Owner"}'::jsonb,
    updated_at = now()
WHERE email = 'ownermauli@gnail.com';

-- Ensure profile is correct and linked
INSERT INTO profiles (id, full_name, role, is_approved)
SELECT id, 'Main Owner', 'owner', true
FROM auth.users WHERE email = 'ownermauli@gnail.com'
ON CONFLICT (id) DO UPDATE
  SET role = 'owner', is_approved = true, full_name = 'Main Owner';

-- Verify setup
SELECT id, email, created_at, email_confirmed_at FROM auth.users WHERE email = 'ownermauli@gnail.com';
SELECT * FROM profiles WHERE id IN (SELECT id FROM auth.users WHERE email = 'ownermauli@gnail.com');
