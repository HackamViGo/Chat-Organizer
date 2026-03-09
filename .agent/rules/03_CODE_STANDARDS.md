---
version: 5.0.0
priority: MEDIUM
override_allowed: YES_WITH_REASON
---

# Code Standards — TypeScript, React, Styling

> These rules ensure consistent, maintainable, and performant code.

---

## 🟢 S1. TypeScript Standards

### S1.1 Naming Conventions

#### Rule: Consistent Naming

```typescript
// Variables & Functions — camelCase
const userName = 'John'
const isActive = true
function fetchUserData() {}
async function createChat() {}

// Constants — UPPER_SNAKE_CASE
const MAX_RETRIES = 3
const API_BASE_URL = 'https://api.example.com'
const DEFAULT_TIMEOUT_MS = 5000

// Types & Interfaces — PascalCase
interface UserProfile {}
type ChatMessage = {}
enum ChatPlatform {}
class AuthManager {}

// Type Parameters — Single uppercase letter or PascalCase
function map<T>(items: T[]): T[] {}
function filter<TItem extends BaseItem>(items: TItem[]): TItem[] {}

// Private class members — prefix with _
class Store {
  private _internalState: State
  private _cache: Map<string, any>

  public getState() {
    return this._internalState
  }
}

// Boolean variables — start with is/has/should/can
const isLoading = true
const hasPermission = false
const shouldRetry = true
const canEdit = false
```

#### File Naming

```
kebab-case.ts           ✅ Utilities, services, hooks
PascalCase.tsx          ✅ React components
route.ts                ✅ Next.js API routes
layout.tsx              ✅ Next.js layouts
page.tsx                ✅ Next.js pages
[id].tsx                ✅ Dynamic routes
[...slug].tsx           ✅ Catch-all routes

camelCase.ts            ❌ Inconsistent
UserProfile.ts          ❌ Non-component file in PascalCase
api-route.ts            ❌ Use route.ts for Next.js
```

---

### S1.2 Type Declarations

#### Rule: Explicit Return Types for Exported Functions

```typescript
// ✅ CORRECT (explicit return type)
export function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0)
}

export async function fetchChats(userId: string): Promise<Chat[]> {
  const response = await fetch(`/api/chats?userId=${userId}`)
  return response.json()
}

// ⚠️ ACCEPTABLE (obvious return type)
function isEven(n: number) {
  // TypeScript infers boolean
  return n % 2 === 0
}

// ❌ BAD (exported function without explicit type)
export function processData(data) {
  // What does this return?
  // ... complex logic ...
  return result
}
```

#### Rule: Interface vs Type

```typescript
// ✅ Use INTERFACE for objects (can be extended)
interface User {
  id: string
  name: string
  email: string
}

interface AdminUser extends User {
  role: 'admin'
  permissions: string[]
}

// ✅ Use TYPE for unions, intersections, primitives
type ChatPlatform = 'chatgpt' | 'claude' | 'gemini'
type Status = 'idle' | 'loading' | 'success' | 'error'
type Id = string

type UserWithTimestamps = User & {
  created_at: Date
  updated_at: Date
}

// ⚠️ ACCEPTABLE (complex conditional types)
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}
```

---

### S1.3 Imports & Exports

#### Rule: Import Order

```typescript
// 1. External packages (React, libraries)
import { useState, useEffect } from 'react'
import { z } from 'zod'
import { create } from 'zustand'

// 2. Internal packages (@brainbox/*)
import { createChatSchema } from '@brainbox/validation'
import { Chat } from '@brainbox/types'
import { logger } from '@brainbox/shared'

// 3. Components (UI library, then local)
import { Button } from '@brainbox/ui'
import { ChatCard } from '@/components/features/chats/ChatCard'

// 4. Hooks & Utils
import { useChatStore } from '@/store/useChatStore'
import { cn } from '@/lib/utils'

// 5. Types (separate import for types only)
import type { User } from '@brainbox/types'
import type { ReactNode } from 'react'

// 6. Styles (last)
import '@/styles/chat.css'
```

#### Rule: Named Exports (Preferred)

```typescript
// ✅ PREFERRED (named exports)
export function createChat() {}
export function updateChat() {}
export const ChatCard = () => {};

// Usage
import { createChat, ChatCard } from './chat';

// ⚠️ ACCEPTABLE (default export for React components)
export default function ChatPage() {
  return <div>Chat</div>;
}

// Usage
import ChatPage from './ChatPage';

// ❌ BAD (mixing default and named in confusing way)
export default ChatCard;
export { ChatList, ChatHeader };  // Inconsistent
```

---

### S1.4 Utility Types

#### Rule: Built-in Utility Types

```typescript
// ✅ Use TypeScript utility types

// Partial — Make all fields optional
type PartialUser = Partial<User>

// Required — Make all fields required
type RequiredUser = Required<PartialUser>

// Pick — Select specific fields
type UserPreview = Pick<User, 'id' | 'name' | 'avatar_url'>

// Omit — Exclude specific fields
type UserWithoutPassword = Omit<User, 'password_hash'>

// Record — Create object type with specific keys
type ChatsByPlatform = Record<ChatPlatform, Chat[]>

// Extract — Extract matching types from union
type AIProvider = Extract<ChatPlatform, 'chatgpt' | 'claude' | 'gemini'>

// Exclude — Remove types from union
type NonAIProvider = Exclude<ChatPlatform, AIProvider>

// ReturnType — Get function return type
type ChatResponse = ReturnType<typeof createChat>

// Parameters — Get function parameters
type CreateChatParams = Parameters<typeof createChat>
```

---

## 🟢 S2. React Standards

### S2.1 Component Structure

#### Rule: Standard Component Template

```typescript
'use client';  // Only if needed (interactivity, hooks)

import { memo, useState, useCallback, useEffect, useMemo } from 'react';
import type { FC, ReactNode } from 'react';

// 1. Props interface (always define, even if empty)
interface ChatCardProps {
  chat: Chat;
  onSelect?: (id: string) => void;
  className?: string;
  children?: ReactNode;
}

// 2. Component (use memo for list items)
export const ChatCard: FC<ChatCardProps> = memo(({
  chat,
  onSelect,
  className,
  children
}) => {
  // 3. Hooks (top-level, same order every render)
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // 4. Derived state (useMemo for expensive calculations)
  const formattedDate = useMemo(
    () => formatDate(chat.created_at),
    [chat.created_at]
  );

  // 5. Event handlers (useCallback for stable references)
  const handleClick = useCallback(() => {
    onSelect?.(chat.id);
  }, [chat.id, onSelect]);

  const handleToggle = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // 6. Effects (if needed)
  useEffect(() => {
    // Side effects
    return () => {
      // Cleanup
    };
  }, []);

  // 7. Early returns (for conditional rendering)
  if (!chat) {
    return null;
  }

  // 8. Render
  return (
    <div
      className={cn('glass-card', className)}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h3>{chat.title}</h3>
      {isExpanded && <p>{chat.content}</p>}
      {children}
    </div>
  );
});

// 9. Display name (required for memo components)
ChatCard.displayName = 'ChatCard';

// 10. Default props (if needed)
ChatCard.defaultProps = {
  className: '',
};
```

---

### S2.2 Hooks Guidelines

#### Rule: Custom Hooks Pattern

```typescript
// ✅ CORRECT (custom hook)
function useChatData(chatId: string) {
  const [chat, setChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchChat() {
      try {
        setIsLoading(true);
        const data = await api.getChat(chatId);

        if (!cancelled) {
          setChat(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchChat();

    return () => {
      cancelled = true;  // Cleanup flag
    };
  }, [chatId]);

  return { chat, isLoading, error };
}

// Usage
function ChatView({ chatId }: { chatId: string }) {
  const { chat, isLoading, error } = useChatData(chatId);

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!chat) return <NotFound />;

  return <ChatCard chat={chat} />;
}
```

#### Rule: useCallback Dependencies

```typescript
// ✅ CORRECT (all dependencies listed)
const handleSubmit = useCallback(
  (data: FormData) => {
    api.createChat(data)
    onSuccess?.(data)
    logger.info('Chat created', { data })
  },
  [onSuccess]
) // onSuccess is external, must be in deps

// ⚠️ WARNING (missing dependency)
const handleSubmit = useCallback((data: FormData) => {
  api.createChat(data)
  onSuccess?.(data) // onSuccess not in deps — will use stale version
}, [])

// ✅ CORRECT (intentionally omitting stable ref)
const handleSubmit = useCallback((data: FormData) => {
  api.createChat(data)
  // onSuccess is from props but guaranteed stable (e.g., from context)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

---

### S2.3 Performance Optimization

#### Rule: When to Use memo

```typescript
// ✅ GOOD USE CASES for memo:
// 1. List items (prevents re-render of unchanged items)
export const ChatCard = memo(({ chat }: { chat: Chat }) => {
  return <div>{chat.title}</div>;
});

// 2. Expensive components (complex calculations)
export const DataVisualization = memo(({ data }: { data: number[] }) => {
  const chart = useMemo(() => generateChart(data), [data]);
  return <Canvas>{chart}</Canvas>;
});

// ❌ BAD USE CASES for memo:
// 1. Simple components (overhead > benefit)
export const Label = memo(({ text }: { text: string }) => {
  return <span>{text}</span>;  // Too simple to benefit from memo
});

// 2. Components that always re-render anyway
export const LiveClock = memo(() => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <div>{time.toLocaleTimeString()}</div>;  // Updates every second
});
```

#### Rule: When to Use useMemo

```typescript
// ✅ GOOD (expensive calculation)
const sortedAndFilteredChats = useMemo(() => {
  return chats
    .filter((chat) => chat.platform === selectedPlatform)
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, 100)
}, [chats, selectedPlatform])

// ✅ GOOD (stable object reference for dependency)
const config = useMemo(
  () => ({
    apiUrl: process.env.API_URL,
    timeout: 5000,
  }),
  []
) // Empty deps — object is created once

// ❌ BAD (premature optimization)
const fullName = useMemo(() => `${firstName} ${lastName}`, [firstName, lastName]) // String concat is cheap, no need for useMemo

// ❌ BAD (wrong use case)
const [count, setCount] = useState(0)
const doubled = useMemo(() => count * 2, [count])
// Better: const doubled = count * 2; (no useMemo needed)
```

---

### S2.4 Server vs Client Components

#### Rule: Server Components by Default

```typescript
// ✅ CORRECT (Server Component — no 'use client')
// app/chats/page.tsx
import { createServerClient } from '@/lib/supabase/server';
import { ChatList } from '@/components/features/chats/ChatList';

export default async function ChatsPage() {
  const supabase = createServerClient();
  const { data: chats } = await supabase.from('chats').select('*');

  return <ChatList chats={chats} />;
}

// ✅ CORRECT (Client Component — with 'use client')
// components/features/chats/ChatCard.tsx
'use client';

import { useState } from 'react';

export function ChatCard({ chat }: { chat: Chat }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div onClick={() => setIsExpanded(!isExpanded)}>
      {/* ... */}
    </div>
  );
}
```

#### When to Use 'use client'

```
✅ Use 'use client' when:
- Using React hooks (useState, useEffect, etc.)
- Event handlers (onClick, onChange, etc.)
- Browser APIs (localStorage, window, document)
- Third-party libraries that use hooks

❌ Don't use 'use client' for:
- Static content
- Data fetching (use Server Components + async)
- SEO-critical content
- Components that don't need interactivity
```

---

## 🟢 S3. Styling Standards (Tailwind CSS)

### S3.1 Class Organization

#### Rule: Class Order

```tsx
// ✅ CORRECT (logical grouping)
<div
  className={cn(
    // 1. Layout
    'flex items-center justify-between',
    'w-full h-12',
    'p-4 gap-2',

    // 2. Visual
    'bg-white/10 backdrop-blur-md',
    'border border-white/20 rounded-lg',
    'shadow-lg',

    // 3. Typography
    'text-sm font-medium text-white',

    // 4. Interactive states
    'hover:bg-white/20 hover:scale-105',
    'active:scale-95',
    'transition-all duration-200',

    // 5. Responsive
    'md:w-1/2 lg:w-1/3',

    // 6. Conditional/custom
    isActive && 'ring-2 ring-blue-500',
    className
  )}
>
```

---

### S3.2 Design System Classes

#### Rule: Use Design System Classes

```css
/* globals.css — Design system */
.glass-panel {
  @apply rounded-xl border border-white/20 bg-white/10 shadow-xl backdrop-blur-md;
}

.glass-card {
  @apply glass-panel p-6 transition-all duration-200 hover:bg-white/20;
}

.glass-input {
  @apply glass-panel px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none;
}

.glass-button {
  @apply glass-panel px-6 py-3 font-medium transition-transform hover:scale-105 active:scale-95;
}
```

```tsx
// ✅ CORRECT (use design system classes)
<div className="glass-card">
  <input className="glass-input" />
  <button className="glass-button">Submit</button>
</div>

// ❌ BAD (reinventing the wheel)
<div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl p-6 hover:bg-white/20 transition-all duration-200">
  {/* Duplicating glass-card styles */}
</div>
```

---

### S3.3 Dynamic Classes (FORBIDDEN)

#### Rule: No String Interpolation

```tsx
// ❌ FORBIDDEN (Tailwind can't detect these)
<div className={`bg-${color}-500`} />
<div className={`text-${size}`} />
<div className={isActive ? `text-blue-500` : `text-gray-500`} />

// ✅ CORRECT (full class names)
<div className={color === 'red' ? 'bg-red-500' : 'bg-blue-500'} />

// ✅ BETTER (class map)
const colorClasses = {
  chatgpt: 'bg-green-500 text-white',
  claude: 'bg-orange-500 text-white',
  gemini: 'bg-blue-500 text-white',
} as const;

<div className={colorClasses[platform]} />

// ✅ BEST (CSS variables for truly dynamic values)
<div
  className="bg-[var(--platform-color)]"
  style={{ '--platform-color': platformColor } as React.CSSProperties}
/>
```

---

### S3.4 Platform Colors

#### Rule: Use CSS Variables

```css
/* globals.css */
:root {
  --color-chatgpt: #22c55e;
  --color-claude: #f97316;
  --color-gemini: #3b82f6;
  --color-deepseek: #a855f7;
  --color-perplexity: #ec4899;
  --color-grok: #8b5cf6;
  --color-qwen: #f59e0b;
  --color-lmarena: #06b6d4;
}
```

```tsx
// ✅ CORRECT
const platformClasses = {
  chatgpt: 'bg-[var(--color-chatgpt)]',
  claude: 'bg-[var(--color-claude)]',
  gemini: 'bg-[var(--color-gemini)]',
  // ...
} as const;

<div className={platformClasses[platform]} />

// Or with inline style for complex cases
<div style={{ backgroundColor: `var(--color-${platform})` }} />
```

---

## 🟢 S4. Error Handling

### S4.1 Try-Catch Pattern

#### Rule: Structured Error Handling

```typescript
// ✅ CORRECT (specific error handling)
async function fetchChat(id: string): Promise<Chat> {
  try {
    const response = await fetch(`/api/chats/${id}`)

    if (!response.ok) {
      if (response.status === 404) {
        throw new NotFoundError(`Chat ${id} not found`)
      }
      if (response.status === 401) {
        throw new UnauthorizedError('Please log in')
      }
      throw new APIError(`API error: ${response.statusText}`)
    }

    const data = await response.json()
    return chatSchema.parse(data) // Validation
  } catch (error) {
    // Re-throw custom errors
    if (error instanceof NotFoundError || error instanceof UnauthorizedError) {
      throw error
    }

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      logger.error('Chat validation failed', { error, id })
      throw new ValidationError('Invalid chat data', error)
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      logger.error('Network error', { error, id })
      throw new NetworkError('Failed to connect to server')
    }

    // Unknown errors
    logger.error('Unexpected error fetching chat', { error, id })
    throw error
  }
}
```

#### Custom Error Classes

```typescript
// lib/errors.ts
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export class NotFoundError extends APIError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends APIError {
  constructor(message: string) {
    super(message, 401, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public zodError?: z.ZodError
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}
```

---

### S4.2 React Error Boundaries

#### Rule: Error Boundary for Each Feature

```typescript
// components/ErrorBoundary.tsx
'use client';

import { Component, ReactNode } from 'react';
import { logger } from '@brainbox/shared';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('React Error Boundary caught error', { error, errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="glass-panel p-8 text-center">
          <h2 className="text-xl font-bold mb-4">Something went wrong</h2>
          <p className="text-gray-400 mb-4">{this.state.error?.message}</p>
          <button
            className="glass-button"
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
<ErrorBoundary fallback={<ChatErrorFallback />}>
  <ChatList />
</ErrorBoundary>
```

---

## 🟢 S5. Performance Best Practices

### S5.1 Lazy Loading

#### Rule: Code Splitting for Routes

```typescript
// ✅ CORRECT (lazy load heavy components)
import dynamic from 'next/dynamic';

const ChatStudio = dynamic(
  () => import('@/components/features/chats/ChatStudio'),
  {
    loading: () => <ChatStudioSkeleton />,
    ssr: false  // Client-side only
  }
);

const MarkdownEditor = dynamic(
  () => import('@/components/features/prompts/MarkdownEditor'),
  { ssr: false }
);

// ❌ BAD (importing everything upfront)
import ChatStudio from '@/components/features/chats/ChatStudio';
import MarkdownEditor from '@/components/features/prompts/MarkdownEditor';
```

---

### S5.2 Image Optimization

#### Rule: Always Use Next.js Image

```tsx
import Image from 'next/image';

// ✅ CORRECT
<Image
  src={chat.preview_image}
  alt={chat.title}
  width={800}
  height={400}
  loading="lazy"
  placeholder="blur"
  blurDataURL={chat.blur_data_url}
  quality={85}
/>

// ❌ BAD (unoptimized)
<img src={chat.preview_image} alt={chat.title} />
```

---

### S5.3 Debouncing & Throttling

#### Rule: Use for Expensive Operations

```typescript
import { useDebouncedCallback } from 'use-debounce';

// ✅ CORRECT (debounce search)
const handleSearch = useDebouncedCallback(
  (query: string) => {
    api.searchChats(query);
  },
  500  // Wait 500ms after user stops typing
);

<input onChange={(e) => handleSearch(e.target.value)} />

// Throttle scroll events
import { useThrottle } from '@/hooks/useThrottle';

const handleScroll = useThrottle(() => {
  console.log('Scrolled');
}, 200);  // Max once per 200ms
```

---

## 🟢 S6. Testing Standards

### S6.1 Test File Naming

#### Rule: Co-location

```
src/
├── components/
│   ├── ChatCard.tsx
│   └── ChatCard.test.tsx        ✅ Co-located

tests/
├── unit/
│   └── chat-card.test.ts        ⚠️ Acceptable (centralized)
├── integration/
│   └── chat-api.test.ts
└── e2e/
    └── auth-flow.spec.ts
```

---

### S6.2 Test Structure

#### Rule: AAA Pattern (Arrange, Act, Assert)

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatCard } from './ChatCard';

describe('ChatCard', () => {
  // Arrange (setup)
  const mockChat: Chat = {
    id: '123',
    title: 'Test Chat',
    platform: 'chatgpt',
    created_at: new Date('2024-01-01'),
  };

  const mockOnSelect = vi.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  it('should render chat title', () => {
    // Arrange
    render(<ChatCard chat={mockChat} onSelect={mockOnSelect} />);

    // Act (implicit — component rendered)

    // Assert
    expect(screen.getByText('Test Chat')).toBeInTheDocument();
  });

  it('should call onSelect when clicked', () => {
    // Arrange
    render(<ChatCard chat={mockChat} onSelect={mockOnSelect} />);

    // Act
    fireEvent.click(screen.getByText('Test Chat'));

    // Assert
    expect(mockOnSelect).toHaveBeenCalledWith('123');
    expect(mockOnSelect).toHaveBeenCalledTimes(1);
  });
});
```

---

## 🔴 S8. Debug & Logging Rules (from core-rules v4)

> Migrated from core-rules.md §ПРАВИЛО #5 — no conflicts with v5.

### S8.1 No console.log in Production

```typescript
// ❌ FORBIDDEN in production
console.log('debug', data)
console.warn('deprecated')

// ✅ CORRECT
import { logger } from '@brainbox/shared'
logger.info('event', { data })
logger.warn('deprecated usage')
```

**`DEBUG_MODE` must be `false` before every commit to `main`.**  
Exception: `logger.ts` itself may use `console.*` internally — that is OK.

---

## 🔴 S9. Zustand — useShallow Rule (from core-rules v4)

> Migrated from core-rules.md §ПРАВИЛО #6.

```typescript
// ❌ FORBIDDEN (object selector without useShallow = re-render on every state change)
const { chats, isLoading } = useChatStore((state) => ({
  chats: state.chats,
  isLoading: state.isLoading,
}))

// ✅ CORRECT
import { useShallow } from 'zustand/react/shallow'

const { chats, isLoading } = useChatStore(
  useShallow((state) => ({
    chats: state.chats,
    isLoading: state.isLoading,
  }))
)
```

**`useShallow` is mandatory whenever destructuring multiple values from a Zustand store.**

---

## 🔴 S10. Extension Specifics (from core-rules v4)

> Migrated from core-rules.md §ПРАВИЛО #7.

- **MV3 only** — Service Worker, never background page.
- **No `localhost`** in production manifest — `stripDevCSP` is active.
- **`brainbox_master.js` is deprecated** — do not modify it.
- **`DEBUG_MODE = true` is forbidden** in production builds.

---

## 🟡 S11. Forbidden Changes Without Approval (from core-rules v4)

> Migrated from core-rules.md §ПРАВИЛО #9.

The following files/paths require **explicit user approval** before modification:

| Path                               | Reason                                             |
| ---------------------------------- | -------------------------------------------------- |
| `packages/shared/src/types/`       | Shared types — breaking changes cascade everywhere |
| `packages/validation/schemas/`     | Zod schemas — API contracts                        |
| `apps/extension/manifest.json`     | Extension permissions — Store review impact        |
| `apps/dashboard/src/middleware.ts` | Auth logic — security critical                     |
| `turbo.json`                       | Pipeline — affects all build steps                 |
| New npm dependencies               | Bundle size + supply chain risk                    |
| RLS policies in Supabase           | Data access control — security critical            |

---

## 🟡 S12. Graph Protocol (from core-rules v4)

> Context graphs are now in `.agent/context/`. Paths updated for v5.

**START task:** Read relevant nodes from:

- `context/ProjectGraph.json` — which files are affected
- `context/knowledge_graph.json` — business logic + domain constraints for scope

**END task:** Update/add nodes in both graphs if:

- Files were created, deleted, or significantly modified
- New business logic was discovered
- New dependencies between modules were identified

---

## 📚 Related Documents

- **00_META.md** — Rule hierarchy
- **01_CRITICAL.md** — Security, architecture
- **02_WORKFLOW.md** — Git, deployment
- **04_AGENT_PROTOCOL.md** — Agent state management

---

**END OF CODE STANDARDS**
