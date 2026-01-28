# Avatar Storage Setup Guide

## Problem
When uploading avatars, you get this error:
```
StorageApiError: new row violates row-level security policy
```

This happens because the `avatars` Storage bucket doesn't have RLS policies configured.

## Solution

### Step 1: Ensure the bucket exists

1. Go to Supabase Dashboard → Storage
2. Check if `avatars` bucket exists
3. If not, create it with these settings:
   - **Name:** `avatars`
   - **Public:** `true` (or `false` if you want private avatars)
   - **File size limit:** `1MB`
   - **Allowed MIME types:** `image/*`

### Step 2: Apply RLS Policies

Execute the following SQL in Supabase SQL Editor:

**Via Supabase Dashboard:**
1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy and paste the SQL below
4. Click "Run"

```sql
-- Drop existing policies if they exist (safe to run multiple times)
DROP POLICY IF EXISTS "Users can upload avatars to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can read avatars" ON storage.objects;

-- Policy: Users can INSERT (upload) files only to their own folder
CREATE POLICY "Users can upload avatars to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  name LIKE (auth.uid()::text || '/%')
);

-- Policy: Users can SELECT (read) their own avatars
CREATE POLICY "Users can read their own avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars' AND
  name LIKE (auth.uid()::text || '/%')
);

-- Policy: Users can UPDATE (replace) their own avatars
CREATE POLICY "Users can update their own avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  name LIKE (auth.uid()::text || '/%')
)
WITH CHECK (
  bucket_id = 'avatars' AND
  name LIKE (auth.uid()::text || '/%')
);

-- Policy: Users can DELETE their own avatars
CREATE POLICY "Users can delete their own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  name LIKE (auth.uid()::text || '/%')
);

-- Policy: Public can read avatars (for browser image loading)
-- This allows anyone to read avatar images via public URL
CREATE POLICY "Public can read avatars"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'avatars'
);
```

### Step 3: Verify Policies

After applying, verify the policies exist:
```sql
SELECT * FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND policyname LIKE '%avatar%';
```

You should see 5 policies:
1. `Users can upload avatars to their own folder` (INSERT)
2. `Users can read their own avatars` (SELECT) - for authenticated users
3. `Public can read avatars` (SELECT) - for public access (browser image loading)
4. `Users can update their own avatars` (UPDATE)
5. `Users can delete their own avatars` (DELETE)

## How It Works

The policies check that the file path starts with the user's ID:
- Path format: `{user_id}/{timestamp}.{ext}`
- Example: `550e8400-e29b-41d4-a716-446655440000/1704067200000.jpg`

The policies use `name LIKE (auth.uid()::text || '/%')` to check if the file path starts with the authenticated user's ID followed by a slash. This ensures users can only access files in their own folder.

## Testing

After applying the policies, try uploading an avatar again. It should work now!

## Notes

- If the bucket is **public**, avatars will be accessible via public URL
- If the bucket is **private**, only authenticated users can access their own avatars
- The policies ensure users can only manage files in their own folder (`{user_id}/`)

