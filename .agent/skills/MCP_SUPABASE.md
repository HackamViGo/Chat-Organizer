# Skill: MCP Supabase — Database Operations

## Purpose
Query database, verify RLS policies, and manage migrations.

## BrainBox Tables

### Quick Reference
```
chats     → Saved conversations from AI platforms
folders   → Organization hierarchy
prompts   → User prompt library
users     → Extended user profiles
images    → Saved images (future)
lists     → Todo/task lists
list_items → List entries
```

### Common Queries

#### Verify chat was saved
```sql
SELECT id, title, platform, created_at
FROM chats
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;
```

#### Check folder structure
```sql
SELECT id, name, type, parent_id
FROM folders
WHERE user_id = auth.uid()
ORDER BY name;
```

#### Verify prompts sync
```sql
SELECT id, title, use_in_context_menu, updated_at
FROM prompts
WHERE user_id = auth.uid()
AND use_in_context_menu = true;
```

### RLS Verification
```sql
-- Every table MUST have RLS enabled
-- Verify:
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Every row must be scoped to user_id = auth.uid()
-- Policy pattern:
CREATE POLICY "Users can only access own data"
ON chats FOR ALL
USING (user_id = auth.uid());
```

### Migration Protocol
```
1. Create migration:
   supabase migration new <name>

2. Write SQL in supabase/migrations/<timestamp>_<name>.sql

3. Test locally:
   supabase db reset

4. Apply:
   supabase db push

RULES:
  ✅ Always add RLS policy with new table
  ✅ Always add user_id column with FK to auth.users
  ✅ Never drop columns in production
  ✅ Use IF NOT EXISTS for safety
```

### Environment
```
Local:      postgresql://postgres:postgres@localhost:54321/postgres
Production: Via SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY

Extension uses:
  POST /api/chats → Supabase insert via server-side route
  GET /api/folders → Supabase select via server-side route
  
Extension NEVER connects to Supabase directly.
All DB access goes through Dashboard API routes.
```
