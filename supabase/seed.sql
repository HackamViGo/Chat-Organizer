-- ============================================================
-- Seed Data for Local Development
-- ============================================================

-- Create a Test User in Supabase Auth
-- Email: test@brainbox.ai
-- Password: password123

-- Note: This UUID and fixed password hash are based on standard local Supabase expectations.
-- We use a known UUID so references elsewhere in the seed can be consistent.

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '7b6e9273-0000-4000-a000-000000000000', -- Test User UUID
  'authenticated',
  'authenticated',
  'test@brainbox.ai',
  -- Hashed 'password123' using standard local bcrypt logic
  crypt('password123', gen_salt('bf')), -- Valid bcrypt hash for local development
  now(),
  NULL,
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Test User"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- Identity for the user
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES (
  '7b6e9273-0000-4000-a000-000000000000',
  '7b6e9273-0000-4000-a000-000000000000',
  jsonb_build_object('sub', '7b6e9273-0000-4000-a000-000000000000', 'email', 'test@brainbox.ai'),
  'email',
  now(),
  now(),
  now()
)
ON CONFLICT (id, provider) DO NOTHING;

-- (Optional) Add this user to public.users if there's no trigger
INSERT INTO public.users (id, email, full_name, created_at, updated_at)
VALUES (
  '7b6e9273-0000-4000-a000-000000000000',
  'test@brainbox.ai',
  'Test User',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;
