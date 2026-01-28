# Fix Google Avatar Trigger

## Problem
The `handle_new_user()` trigger currently saves Google avatar URLs to `users.avatar_url` table. We want to completely ignore Google avatars - only user-uploaded avatars should be stored and displayed.

## Solution

**Copy the SQL from `fix_google_avatar_trigger.sql` file and execute it in Supabase SQL Editor.**

The SQL file is located at: `docs/project/fix_google_avatar_trigger.sql`

**Steps:**
1. Open `docs/project/fix_google_avatar_trigger.sql`
2. Copy ALL the SQL code (without markdown formatting)
3. Go to Supabase Dashboard → SQL Editor
4. Paste and execute

## What Changed
- Removed `avatar_url` from INSERT statement
- Google avatars are completely ignored - not shown, not stored
- Only user-uploaded avatars (from Supabase Storage) are stored in `users.avatar_url` and displayed
- The SQL also includes cleanup of existing Google avatars from the database

