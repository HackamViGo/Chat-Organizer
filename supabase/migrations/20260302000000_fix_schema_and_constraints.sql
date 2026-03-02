-- Enable pgcrypto for secure password hashing in seeds and other ops
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- Add unique constraint to chats table to support UPSERT operations
-- The Dashboard API relies on this constraint for: onConflict: 'user_id, source_id'
ALTER TABLE public.chats
ADD CONSTRAINT chats_user_id_source_id_key UNIQUE (user_id, source_id);

-- Verify and fix RLS policies if needed (ensure they are permissive enough for the upsert)
-- The existing policies check auth.uid() = user_id which is correct for the upsert logic
-- providing the user_id in the payload matches the auth.uid().

