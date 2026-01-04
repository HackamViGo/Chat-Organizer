# Avatar Bucket Public Access Check

## Problem
Avatar images are uploaded successfully but cannot be loaded in the browser. The RLS policy "Public can read avatars" is created, but images still fail to load.

## Solution

### Step 1: Verify Bucket is Public

1. Go to **Supabase Dashboard → Storage**
2. Click on the **`avatars`** bucket
3. Check the **"Public bucket"** toggle - it should be **ON** (enabled)
4. If it's OFF, toggle it ON

### Step 2: Test the URL Directly

Copy one of the avatar URLs from the console (e.g., `https://biwiicspmrdecsebcdfp.supabase.co/storage/v1/object/public/avatars/cc02f86e-dca2-41a8-88b7-0e17037ad7a7/1767560273402.png`) and paste it directly in your browser's address bar.

**Expected behavior:**
- ✅ If the image loads → Bucket is public, but there might be a CORS or timing issue
- ❌ If you get 403 Forbidden → Bucket is NOT public, toggle it ON
- ❌ If you get 404 Not Found → File doesn't exist or path is wrong

### Step 3: Verify RLS Policies

Run this SQL to verify all policies exist:

```sql
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND policyname LIKE '%avatar%';
```

You should see:
- `Public can read avatars` with `roles = {public}` and `cmd = SELECT`

### Step 4: Check CORS Settings

If the bucket is public and policies are correct, check CORS settings:

1. Go to **Supabase Dashboard → Storage → Settings**
2. Check if CORS is configured for your domain
3. If not, add your domain to allowed origins

### Common Issues

1. **Bucket not public**: Toggle "Public bucket" ON in Storage settings
2. **RLS policy missing**: Re-run the SQL from `fix_avatar_public_access.sql`
3. **CORS issue**: Add your domain to CORS allowed origins
4. **File doesn't exist**: Check if the file was actually uploaded (go to Storage → avatars bucket → check files)

### Quick Fix

If everything else is correct, try making the bucket public via SQL:

```sql
UPDATE storage.buckets 
SET public = true 
WHERE id = 'avatars';
```

Then verify:
```sql
SELECT id, name, public FROM storage.buckets WHERE id = 'avatars';
```

The `public` column should be `true`.


