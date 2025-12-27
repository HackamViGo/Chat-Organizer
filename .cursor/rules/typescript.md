# TypeScript Rules

**Applies to:** UI_AGENT, API_AGENT  
**Language:** English (code & logs), Bulgarian (user comm)

---

## Strict Mode - NON-NEGOTIABLE

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true
  }
}
```

**Never use `any` type.**

---

## Type Sources

### 1. Database Types (Primary)
```typescript
import { Database } from '@/types/database.types';

type Chat = Database['public']['Tables']['chats']['Row'];
type ChatInsert = Database['public']['Tables']['chats']['Insert'];
type ChatUpdate = Database['public']['Tables']['chats']['Update'];
```

### 2. Custom Types
```typescript
// src/types/index.ts
export interface ChatWithFolder extends Chat {
  folder?: Folder | null;
}

export type Platform = 'chatgpt' | 'claude' | 'gemini' | 'lmarena';
export type FolderType = 'chat' | 'image' | 'prompt' | 'list';
```

---

## Component Props

```typescript
// ✓ Interface for props
interface ChatCardProps {
  chat: Chat;
  onUpdate?: (chat: Chat) => void;
  className?: string;
}

export function ChatCard({ chat, onUpdate, className }: ChatCardProps) {
  // Implementation
}

// ✗ Wrong - no types
export function ChatCard(props) {
  // NO!
}
```

---

## API Route Types

```typescript
// src/app/api/chats/route.ts
import { NextResponse } from 'next/server';
import { Database } from '@/types/database.types';

type ChatInsert = Database['public']['Tables']['chats']['Insert'];

export async function POST(request: Request) {
  const body: ChatInsert = await request.json();
  
  // TypeScript knows all fields
  const { title, content, platform } = body;
  
  return NextResponse.json({ success: true });
}
```

---

## Zod Validation

```typescript
import { z } from 'zod';

const chatSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  platform: z.enum(['chatgpt', 'claude', 'gemini', 'lmarena']),
  folder_id: z.string().uuid().optional()
});

type ChatFormData = z.infer<typeof chatSchema>;

// In component
const validated = chatSchema.parse(formData);
```

---

## Async Functions

```typescript
// ✓ Explicit return type
async function fetchChats(): Promise<Chat[]> {
  const response = await fetch('/api/chats');
  const data = await response.json();
  return data.chats;
}

// ✗ No return type
async function fetchChats() {
  // TypeScript can't help you here
}
```

---

## Null Safety

```typescript
// ✓ Handle null/undefined
function displayFolder(folder: Folder | null) {
  if (!folder) {
    return <div>No folder</div>;
  }
  
  return <div>{folder.name}</div>;
}

// ✗ Unsafe
function displayFolder(folder: Folder) {
  return <div>{folder.name}</div>; // Crashes if null
}
```

---

## Type Guards

```typescript
function isChatFolder(folder: Folder): folder is Folder & { type: 'chat' } {
  return folder.type === 'chat';
}

// Usage
if (isChatFolder(folder)) {
  // TypeScript knows folder.type is 'chat'
}
```

---

## Generics

```typescript
// Zustand store pattern
interface Store<T> {
  items: T[];
  loading: boolean;
  fetch: () => Promise<void>;
  add: (item: T) => void;
}

export const useChatStore = create<Store<Chat>>((set) => ({
  items: [],
  loading: false,
  fetch: async () => { /* ... */ },
  add: (chat) => set((state) => ({ items: [...state.items, chat] }))
}));
```

---

## React Hook Types

```typescript
// useState
const [chats, setChats] = useState<Chat[]>([]);

// useEffect
useEffect(() => {
  // No return type needed for cleanup
  return () => {
    // Cleanup
  };
}, [dependency]);

// Custom hook
function useChats(): {
  chats: Chat[];
  loading: boolean;
  error: Error | null;
} {
  // Implementation
  return { chats, loading, error };
}
```

---

## Event Handlers

```typescript
// Form events
function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  // ...
}

// Click events
function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
  // ...
}

// Input change
function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
  const value = e.target.value;
}
```

---

## Never Use

```typescript
// ❌ 'any' type
const data: any = await fetch();

// ❌ Type assertions without reason
const chat = data as Chat;

// ❌ Non-null assertion operator (!)
const name = folder!.name;

// ❌ @ts-ignore
// @ts-ignore
const x = somethingBroken;
```

---

## When to Use

```typescript
// ✓ Type assertions (when you know better than TS)
const error = e as Error;

// ✓ Non-null when guaranteed
const user = await getUser();
if (!user) throw new Error('No user');
const name = user!.name; // OK - checked above

// ✓ Unknown (better than any)
catch (error: unknown) {
  if (error instanceof Error) {
    console.error(error.message);
  }
}
```

---

## Type Imports

```typescript
// ✓ Import types separately
import type { Chat, Folder } from '@/types';
import { fetchChats } from '@/lib/api';

// ✓ Inline type import
import { type Chat, fetchChats } from '@/lib/api';
```

---

## Testing Types

```typescript
// Type-only test (compiles, doesn't run)
import { expectType } from 'tsd';

expectType<Chat[]>(await fetchChats());
```

---

## Common Patterns

### API Response
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function apiCall<T>(): Promise<ApiResponse<T>> {
  try {
    const data = await fetch();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### Discriminated Unions
```typescript
type FolderChat = Folder & { type: 'chat' };
type FolderImage = Folder & { type: 'image' };
type FolderPrompt = Folder & { type: 'prompt' };
type FolderList = Folder & { type: 'list' };

type AnyFolder = FolderChat | FolderImage | FolderPrompt | FolderList;

function handleFolder(folder: AnyFolder) {
  switch (folder.type) {
    case 'chat':
      // TypeScript knows it's FolderChat
      break;
  }
}
```

---

## Before Commit

```bash
# MUST pass
npm run build

# Check types explicitly
npx tsc --noEmit
```

---

## Response Template

When fixing TypeScript errors:

```
✓ Error: [What TS complained about]
→ Fix: [Type added/corrected]

[CODE]

→ Verified: npx tsc --noEmit passes
```

Keep it SHORT.