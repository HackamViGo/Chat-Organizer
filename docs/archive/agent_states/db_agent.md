# Database Agent - Personal Documentation

**Agent:** DB_AGENT  
**Role:** Database Architecture & Management via MCP  
**Log:** `docs/agents/logs/db_agent.log`

---

## What Works

### RLS Policies
- User isolation: `auth.uid() = user_id` - WORKS
- Cascade deletes: `ON DELETE CASCADE` - WORKS

### Type Generation
- Command: `npx supabase gen types` - WORKS
- Auto-updates database.types.ts

---

## What Doesn't Work

### Issue: Circular foreign keys
**Problem:** Can't reference folders.parent_id to itself during creation  
**Solution:** Create table first, add constraint after

---

## MCP Commands Used

```sql
-- Create table
CREATE TABLE ...

-- Enable RLS
ALTER TABLE ... ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY ...

-- Test query
SELECT * FROM ... WHERE user_id = ...;
```

---

## Schema Decisions

- All tables have `user_id` for RLS
- All timestamps use `timezone('utc'::text, now())`
- Soft delete via `is_archived` where needed

---

## Recent Audits

### 2025-12-27 - Schema Verification
**Status:** ✅ All migrations executed, SQL files removed

**Tables Verified:**
- chats (with is_archived, summary, tasks)
- folders (with type TEXT, icon)
- images (with folder_id, name, mime_type, size)
- users (with trigger)
- lists, list_items, prompts
- storage.buckets (images)

**Issues Found:**
- folders.type is TEXT (should be ENUM per rules)
- No Zod validation for folder.type

**Actions Taken:**
- Deleted all 4 SQL files from supabase/migrations/
- Verified database.types.ts is current
- Logged recommendations for future improvements

---

*Last updated: 2025-12-27*
