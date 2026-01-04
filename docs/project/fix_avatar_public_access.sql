-- Fix Avatar Public Access
-- Execute this SQL in Supabase SQL Editor

-- Step 1: Make the bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'avatars';

-- Step 2: Add policy for public read access to avatars
-- This allows anyone (including browsers) to read avatar images via public URL
DROP POLICY IF EXISTS "Public can read avatars" ON storage.objects;

CREATE POLICY "Public can read avatars"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'avatars'
);

-- Step 3: Verify the bucket is public
SELECT id, name, public FROM storage.buckets WHERE id = 'avatars';

-- Step 4: Verify the policy was created
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND policyname LIKE '%avatar%';

