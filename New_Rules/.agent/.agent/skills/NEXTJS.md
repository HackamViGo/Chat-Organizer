# Next.js 14 App Router Skills

## Route Organization

```
app/
├── (auth)/              # Route group (doesn't affect URL)
│   ├── layout.tsx       # Shared auth layout
│   ├── login/
│   └── signup/
├── (dashboard)/         # Protected routes
│   ├── layout.tsx       # Dashboard layout
│   ├── chats/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   └── settings/
└── api/
    ├── chats/
    │   ├── route.ts     # GET, POST /api/chats
    │   └── [id]/
    │       └── route.ts # GET, PUT, DELETE /api/chats/:id
```

## API Route Handlers

```typescript
// app/api/chats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  // 1. Rate limiting
  const identifier = req.ip ?? 'anonymous'
  const { success } = await rateLimit.limit(identifier)

  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // 2. Authentication
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 3. Business logic
  const { data: chats, error } = await supabase.from('chats').select('*').eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  // 4. Response with caching
  return NextResponse.json(chats, {
    headers: {
      'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=120',
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = createChatSchema.parse(body)

    // ... create chat

    return NextResponse.json(chat, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', issues: error.errors },
        { status: 400 }
      )
    }

    throw error
  }
}
```

## Server Actions (Alternative to API Routes)

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createChat(formData: FormData) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('chats')
    .insert({
      title: formData.get('title'),
      content: formData.get('content'),
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/chats')
  return { data }
}
```

## Data Fetching Patterns

### 1. Server Component (Recommended)

```tsx
async function ChatsPage() {
  const chats = await fetchChats() // Direct async
  return <ChatList chats={chats} />
}
```

### 2. Client Component (Interactive)

```tsx
'use client'

function ChatsPage() {
  const { data: chats, isLoading } = useSWR('/api/chats', fetcher)

  if (isLoading) return <Skeleton />
  return <ChatList chats={chats} />
}
```

### 3. Parallel Data Fetching

```tsx
async function DashboardPage() {
  const [chats, folders, prompts] = await Promise.all([
    fetchChats(),
    fetchFolders(),
    fetchPrompts(),
  ])

  return (
    <>
      <ChatList chats={chats} />
      <FolderTree folders={folders} />
      <PromptLibrary prompts={prompts} />
    </>
  )
}
```

## Caching Strategies

```typescript
// Static (Build time)
export const dynamic = 'force-static'

// Dynamic (Every request)
export const dynamic = 'force-dynamic'

// ISR (Incremental Static Regeneration)
export const revalidate = 3600 // Revalidate every hour

// On-demand revalidation
revalidatePath('/chats')
revalidateTag('chats')
```

## Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Check authentication
  const token = request.cookies.get('sb-access-token')

  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
```

## References

- [App Router Docs](https://nextjs.org/docs/app)
- [Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
