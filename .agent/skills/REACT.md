# React 19 Skills for BrainBox

## Component Patterns

### 1. Server Components (Default)

```tsx
// app/chats/page.tsx
import { createClient } from '@/lib/supabase/server'

export default async function ChatsPage() {
  const supabase = createClient()
  const { data: chats } = await supabase
    .from('chats')
    .select('*')
    .order('created_at', { ascending: false })

  return <ChatList chats={chats} />
}
```

### 2. Client Components (Interactive)

```tsx
'use client'

import { useState, useTransition } from 'react'

export function ChatCard({ chat }: { chat: Chat }) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      await deleteChat(chat.id)
    })
  }

  return (
    <div className={isPending ? 'opacity-50' : ''}>
      <h3>{chat.title}</h3>
      <button onClick={handleDelete}>Delete</button>
    </div>
  )
}
```

### 3. Error Boundaries

```tsx
'use client'

import { useEffect } from 'react'

export function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('[ErrorBoundary]', error)
  }, [error])

  return (
    <div className="glass-panel p-8">
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

## Hooks Best Practices

### useMemo (Heavy Computations)

```tsx
const sortedChats = useMemo(() => {
  return chats
    .filter((c) => c.platform === selectedPlatform)
    .sort((a, b) => b.created_at - a.created_at)
}, [chats, selectedPlatform])
```

### useCallback (Stable References)

```tsx
const handleSelect = useCallback((id: string) => {
  setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
}, [])
```

### useTransition (Non-blocking Updates)

```tsx
const [isPending, startTransition] = useTransition()

const handleFilter = (platform: string) => {
  startTransition(() => {
    setFilter(platform) // Low priority update
  })
}
```

## Performance Optimization

### 1. React.memo (Prevent Unnecessary Renders)

```tsx
export const ChatCard = memo<ChatCardProps>(({ chat, onSelect }) => {
  return <div onClick={() => onSelect(chat.id)}>{chat.title}</div>
})
```

### 2. Lazy Loading

```tsx
const ChatStudio = lazy(() => import('@/components/features/chats/ChatStudio'))

;<Suspense fallback={<Skeleton />}>
  <ChatStudio chatId={id} />
</Suspense>
```

### 3. Virtualization (Large Lists)

```tsx
import { useVirtualizer } from '@tanstack/react-virtual'

function ChatList({ chats }: { chats: Chat[] }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: chats.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
  })

  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      {virtualizer.getVirtualItems().map((virtualRow) => (
        <div key={virtualRow.key} style={{ transform: `translateY(${virtualRow.start}px)` }}>
          <ChatCard chat={chats[virtualRow.index]} />
        </div>
      ))}
    </div>
  )
}
```

## Forbidden Patterns

```tsx
// ❌ Direct DOM manipulation in React
useEffect(() => {
  document.getElementById('chat').innerHTML = content
}, [content])

// ✅ Use state and JSX
const [content, setContent] = useState('')
return <div dangerouslySetInnerHTML={{ __html: sanitize(content) }} />

// ❌ Modifying props
function ChatCard({ chat }) {
  chat.title = 'Modified' // NEVER!
}

// ✅ Use local state or callbacks
function ChatCard({ chat, onUpdate }) {
  const [title, setTitle] = useState(chat.title)
  const handleSave = () => onUpdate({ ...chat, title })
}
```

## References

- [React 19 Docs](https://react.dev/)
- [Server Components Guide](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
