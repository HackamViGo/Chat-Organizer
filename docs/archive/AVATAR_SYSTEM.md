# 👤 Avatar Management & Fixes

## Overview
Documentation for the Avatar upload and Google account sync system.

## Data Structure
- **Storage Bucket**: `avatars` (Public access regulated by RLS).
- **SQL Triggers**:
  - `on_auth_user_created`: Automatically creates a profile and fetches Google avatar.
  - `fix_google_avatar_trigger.sql`: Specific fix for updating existing users.

## Security Fixes (Applied)
- **Public Access**: `fix_avatar_public_access.sql` ensures that avatar URLs are accessible via public links without Supabase tokens.
- **RLS Permissions**: Profiles are editable only by the owner.

## History
- Implementation reviewed and tested on 2025-01.
- Current status: ✅ Operational.
