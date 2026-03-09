# Supabase Skills for BrainBox

## Client Initialization

```typescript
// lib/supabase/client.ts (Client-side)
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// lib/supabase/server.ts (Server-side)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}
```

## Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own chats
CREATE POLICY "Users can view own chats"
ON chats
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own chats
CREATE POLICY "Users can create own chats"
ON chats
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own chats
CREATE POLICY "Users can update own chats"
ON chats
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own chats
CREATE POLICY "Users can delete own chats"
ON chats
FOR DELETE
USING (auth.uid() = user_id);
```

## Query Patterns

### 1. Basic CRUD

```typescript
// Create
const { data, error } = await supabase
  .from('chats')
  .insert({ title: 'New Chat', user_id: user.id })
  .select()
  .single()

// Read
const { data, error } = await supabase
  .from('chats')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })

// Update
const { data, error } = await supabase
  .from('chats')
  .update({ title: 'Updated Title' })
  .eq('id', chatId)
  .select()

// Delete
const { error } = await supabase.from('chats').delete().eq('id', chatId)
```

### 2. Relations (Joins)

```typescript
const { data } = await supabase
  .from('chats')
  .select(
    `
    *,
    folder:folders(id, name, color),
    user:users(id, name, avatar_url)
  `
  )
  .eq('user_id', user.id)
```

### 3. Filters

```typescript
// Multiple conditions (AND)
.eq('platform', 'chatgpt')
.gte('created_at', '2024-01-01')
.is('deleted_at', null)

// OR conditions
.or('platform.eq.chatgpt,platform.eq.claude')

// Text search
.textSearch('title', 'ai assistant')

// Array contains
.contains('tags', ['javascript', 'react'])
```

### 4. Aggregations

```typescript
const { count } = await supabase
  .from('chats')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id)
```

## Real-time Subscriptions

```typescript
'use client'

useEffect(() => {
  const channel = supabase
    .channel('chats-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chats',
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          addChat(payload.new)
        } else if (payload.eventType === 'UPDATE') {
          updateChat(payload.new)
        } else if (payload.eventType === 'DELETE') {
          removeChat(payload.old.id)
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [user.id])
```

## Storage (File Uploads)

```typescript
// Upload
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${user.id}/avatar.png`, file, {
    cacheControl: '3600',
    upsert: true,
  })

// Get public URL
const {
  data: { publicUrl },
} = supabase.storage.from('avatars').getPublicUrl(`${user.id}/avatar.png`)

// Delete
await supabase.storage.from('avatars').remove([`${user.id}/avatar.png`])
```

## Error Handling

```typescript
const { data, error } = await supabase.from('chats').select('*')

if (error) {
  // Check error code
  if (error.code === 'PGRST116') {
    // No rows found
    return []
  }

  if (error.code === '42501') {
    // Permission denied (RLS)
    throw new Error('Unauthorized')
  }

  // Log and rethrow
  console.error('[Supabase Error]', error)
  throw error
}
```

## Vector Search (pgvector)

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column
ALTER TABLE chats ADD COLUMN embedding vector(768);

-- Create index
CREATE INDEX ON chats USING ivfflat (embedding vector_cosine_ops);
```

```typescript
// Generate embedding (using Gemini API)
const embedding = await generateEmbedding(query)

// Search
const { data } = await supabase.rpc('search_chats', {
  query_embedding: embedding,
  match_threshold: 0.7,
  match_count: 10,
})
```

## References

- [Supabase Docs](https://supabase.com/docs)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
