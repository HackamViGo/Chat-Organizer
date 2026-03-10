<!-- doc: DATABASE_SCHEMA.md | version: 1.0 | last-updated: 2026-02-28 -->
# 🗄️ DATABASE_SCHEMA.md

> For the comprehensive list of database types, please refer to `packages/shared/src/types/database.types.ts`.

## 📦 Tables Overview

### 1. `users`
Core user profile data tied to Supabase Auth.
- `id` (uuid, PK) - Maps directly to Supabase auth.users ID.
- `email` (string)
- `full_name` (string, null)
- `avatar_url` (string, null)
- `created_at` (timestamp, null)
- `updated_at` (timestamp, null)

### 2. `folders`
Hierarchical organization structure for various entities.
- `id` (uuid, PK)
- `name` (string)
- `parent_id` (uuid, FK to folders.id, null)
- `type` (enum: 'chat', 'list', 'image', 'prompt', null)
- `icon` (string, null)
- `color` (string, null)
- `user_id` (uuid, FK to users.id)
- `created_at` (timestamp, null)
- `updated_at` (timestamp, null)

### 3. `chats`
Stored conversation threads, originating from either the Dashboard or the Chrome Extension.
- `id` (uuid, PK)
- `title` (string)
- `content` (string, null) - Initial prompt/message text
- `summary` (string, null) - AI generated summary
- `messages` (jsonb, null) - Array of chat message objects
- `tasks` (jsonb, null) - Extracted tasks from the chat
- `platform` (string, null) - Origin platform (e.g., 'dashboard', 'extension', 'claude.ai')
- `url` (string, null) - Origin URL if from extension
- `source_id` (string, null) - External ID reference
- `is_archived` (boolean, null)
- `folder_id` (uuid, FK to folders.id, null)
- `user_id` (uuid, FK to users.id)
- `created_at` (timestamp, null)
- `updated_at` (timestamp, null)

### 4. `prompts`
Reusable text snippets for users.
- `id` (uuid, PK)
- `title` (string)
- `content` (text)
- `use_in_context_menu` (boolean, null) - Flag for inclusion in Extension context menu
- `color` (string, null)
- `folder_id` (uuid, FK to folders.id, null)
- `user_id` (uuid, FK to users.id)
- `created_at` (timestamp, null)
- `updated_at` (timestamp, null)

### 5. `images`
Stored image metadata.
- `id` (uuid, PK)
- `url` (string) - Public access URL
- `name` (string, null)
- `path` (string, null) - Storage bucket path
- `mime_type` (string, null)
- `size` (int, null)
- `source_url` (string, null) - Original source if extracted
- `folder_id` (uuid, FK to folders.id, null)
- `user_id` (uuid, FK to users.id)
- `created_at` (timestamp, null)

### 6. `lists`
Checklist or item list containers.
- `id` (uuid, PK)
- `title` (string)
- `color` (string, null)
- `folder_id` (uuid, FK to folders.id, null)
- `user_id` (uuid, FK to users.id)
- `created_at` (timestamp, null)
- `updated_at` (timestamp, null)

### 7. `list_items`
Individual nodes inside the lists.
- `id` (uuid, PK)
- `list_id` (uuid, FK to lists.id)
- `text` (string)
- `position` (int, null) - Ordering
- `completed` (boolean, null)
- `created_at` (timestamp, null)

## 🔐 Row Level Security (RLS)

All tables above adhere to strict **RLS rules**. Data is inherently isolated per `user_id`. Queries generally require an authenticated session context passed via `@supabase/ssr` or `createClient()`. Always refer strictly to the user validation policies configured directly on Supabase.
