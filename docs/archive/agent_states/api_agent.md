# API Agent - Personal Documentation

**Agent:** API_AGENT  
**Role:** Backend API Development  
**Log:** `docs/agents/logs/api_agent.log`

---

## What Works

### Authentication Check Pattern
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```
**Status:** WORKS - Used in all routes

---

### Supabase Query Pattern
```typescript
const { data, error } = await supabase
  .from('chats')
  .select('*')
  .eq('user_id', user.id);
```
**Status:** WORKS - RLS automatically filters

---

## What Doesn't Work

### Issue: CORS on extension requests
**Problem:** Extension couldn't send cookies  
**Solution:** Added `credentials: 'include'` in fetch

---

### Issue: Large request bodies
**Problem:** Image uploads fail for >1MB  
**Solution:** Increased body size limit in next.config.js

---

## API Endpoints Created

```
✓ GET  /api/chats
✓ POST /api/chats
✓ GET  /api/chats/extension
✓ GET  /api/folders
✓ POST /api/folders
✓ POST /api/ai/generate
```

---

## Error Handling Pattern

```typescript
try {
  // Operation
  return NextResponse.json({ success: true, data });
} catch (error) {
  console.error('[API] Error:', error);
  return NextResponse.json(
    { error: error.message || 'Internal error' },
    { status: 500 }
  );
}
```

---

*Last updated: 2025-01-15*
