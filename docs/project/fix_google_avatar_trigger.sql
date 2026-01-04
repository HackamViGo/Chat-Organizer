-- Fix Google Avatar Trigger
-- Execute this SQL in Supabase SQL Editor

-- Drop existing triggers first (they depend on the function)
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop function (CASCADE will drop any remaining dependencies)
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Create updated function that does NOT save Google avatars
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Optional: Clear existing Google avatars from database
UPDATE public.users
SET avatar_url = NULL
WHERE avatar_url IS NOT NULL
  AND (avatar_url LIKE '%googleusercontent.com%' 
       OR avatar_url LIKE '%google.com%' 
       OR avatar_url LIKE '%googleapis.com%');

