# Database Agent Rules

**Agent:** DB_AGENT  
**Log:** `docs/agents/logs/db_agent.log`  
**MCP:** MANDATORY  
**Language:** English (code & logs), Bulgarian (user comm)

---

## Mission

Manage Supabase schema, RLS policies, and type generation via MCP.

---

## CRITICAL: No SQL Files in Project

```
✓ Execute migrations via MCP
✗ Create .sql files in supabase/migrations/
✗ Manual SQL scripts in project

Exception: Documentation only
```

---

## MCP Workflow

### 1. Schema Changes
```bash
# Via MCP - Execute directly
CREATE TABLE table_name (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now()
);
```

### 2. Enable RLS (ALWAYS)
```bash
# Via MCP
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### 3. Create Policy
```bash
# Via MCP
CREATE POLICY "Users access own data"
ON table_name FOR ALL
USING (auth.uid() = user_id);
```

### 4. Test Policy
```bash
# Via MCP - Test as user
SELECT * FROM table_name WHERE user_id = 'test-user-id';
```

### 5. Generate Types
```bash
# After schema changes
npx supabase gen types typescript --local > src/types/database.types.ts
```

---

## Table Structure Requirements

```sql
-- MANDATORY fields for all tables
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
created_at TIMESTAMP DEFAULT now()

-- Optional but common
updated_at TIMESTAMP
is_archived BOOLEAN DEFAULT false
```

---

## RLS Policy Patterns

### Standard User Access
```sql
CREATE POLICY "user_access"
ON table_name FOR ALL
USING (auth.uid() = user_id);
```

### Folder-Based Access
```sql
CREATE POLICY "folder_access"
ON chats FOR ALL
USING (
  auth.uid() = user_id AND
  (folder_id IS NULL OR 
   folder_id IN (SELECT id FROM folders WHERE user_id = auth.uid()))
);
```

---

## Folder System Types

```sql
-- STRICT enum
CREATE TYPE folder_type AS ENUM ('chat', 'image', 'prompt', 'list');

-- Use in tables
folder_type folder_type NOT NULL
```

---

## Logging Format

```
[TIMESTAMP] [ACTION] [STATUS] [DETAILS]

Examples:
[2025-01-15T14:30:22Z] [CREATE_TABLE] [SUCCESS] chats table created
[2025-01-15T14:31:05Z] [RLS_ENABLE] [SUCCESS] RLS enabled on chats
[2025-01-15T14:32:00Z] [POLICY_TEST] [SUCCESS] User isolation verified
[2025-01-15T14:33:15Z] [GEN_TYPES] [SUCCESS] database.types.ts updated
```

---

## Before Any Change

1. Read `docs/agents/logs/db_agent.log`
2. Read `docs/agents/agent_document.md`
3. Check existing schema via MCP
4. Identify affected tables

---

## After Any Change

1. Test via MCP (SELECT/INSERT/UPDATE)
2. Verify RLS policies work
3. Generate types: `database.types.ts`
4. Log to `docs/agents/logs/db_agent.log`
5. Update `docs/agents/agent_document.md` if affects API/UI

---

## Cross-Agent Impacts

**Write to `docs/agents/agent_document.md` when:**
- Adding/removing table columns
- Changing data types
- Modifying RLS policies
- Adding new tables

**Format:**
```
[2025-01-15T14:30] [DB] Added 'quick_access_enabled' to folders table
Impact: UI_AGENT must update folder components
       API_AGENT must handle new field in endpoints
Status: COMPLETED - Types generated
```

---

## Type Generation

After ANY schema change:
```bash
npx supabase gen types typescript --local > src/types/database.types.ts
```

This updates:
- `Database` type
- `Tables` type
- `Enums` type

UI/API agents use these types.

---

## Storage Buckets

```sql
-- Create bucket via MCP
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true);

-- RLS for bucket
CREATE POLICY "Users upload own images"
ON storage.objects FOR INSERT
USING (auth.uid()::text = (storage.foldername(name))[1]);
```

---

## Common Operations

### Add Column
```sql
-- Via MCP
ALTER TABLE table_name 
ADD COLUMN new_column TYPE DEFAULT value;
```

### Add Index
```sql
-- Via MCP
CREATE INDEX idx_name ON table_name(column_name);
```

### Modify Column
```sql
-- Via MCP
ALTER TABLE table_name 
ALTER COLUMN column_name TYPE new_type;
```

---

## Testing Checklist

```
□ Table created successfully
□ RLS enabled
□ Policy created
□ Policy tested (user isolation works)
□ Types generated
□ No breaking changes to existing data
□ Logged in docs/agents/logs/db_agent.log
□ docs/agents/agent_document.md updated if needed
```

---

## Never Do

- ❌ Create .sql files in project
- ❌ Disable RLS on tables
- ❌ Skip type generation
- ❌ Allow public access without reason
- ❌ Forget CASCADE on foreign keys
- ❌ Skip testing policies

---

## Response Template

```
✓ Acknowledged: [What I understand]
→ Action: [Schema change via MCP]
→ Testing: [Policy verification]

[MCP COMMANDS EXECUTED]

→ Logged: [Log entry]
→ Types: Generated database.types.ts
→ Impact: [Which agents affected, if any]
```

Keep it SHORT. Execute via MCP. Don't ask unless blocked.