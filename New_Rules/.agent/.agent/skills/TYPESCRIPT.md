# TypeScript Skills for BrainBox

## Core Principles

1. **Zero `any` tolerance** – Use `unknown` and narrow with Type Guards
2. **Strict mode enabled** – All compiler checks active
3. **Type inference first** – Explicit types only when necessary

## Type Guard Pattern

```typescript
function isChat(value: unknown): value is Chat {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'title' in value &&
    typeof value.title === 'string'
  )
}

// Usage
if (isChat(data)) {
  console.log(data.title) // TypeScript knows this is safe
}
```

## Discriminated Unions

```typescript
type ApiResponse<T> = { success: true; data: T } | { success: false; error: string }

function handleResponse<T>(response: ApiResponse<T>) {
  if (response.success) {
    return response.data // Type: T
  } else {
    throw new Error(response.error) // Type: string
  }
}
```

## Utility Types

```typescript
// Pick specific fields
type ChatPreview = Pick<Chat, 'id' | 'title' | 'platform'>

// Make all fields optional
type PartialChat = Partial<Chat>

// Make all fields required
type RequiredChat = Required<PartialChat>

// Omit fields
type ChatWithoutContent = Omit<Chat, 'content' | 'messages'>
```

## Generic Constraints

```typescript
function findById<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id)
}
```

## Forbidden Patterns

```typescript
// ❌ NEVER DO THIS
const data: any = await fetch('/api/data')

// ✅ DO THIS
const response = await fetch('/api/data')
const data: Chat[] = await response.json()
// Or better: validate with Zod
const data = chatArraySchema.parse(await response.json())
```

## Zod Integration

```typescript
import { z } from 'zod'

const chatSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  platform: z.enum(['chatgpt', 'claude', 'gemini']),
  created_at: z.string().datetime(),
})

type Chat = z.infer<typeof chatSchema> // Automatic type derivation
```

## References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zod Documentation](https://zod.dev/)
