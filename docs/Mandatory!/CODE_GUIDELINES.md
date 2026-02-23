# CODE_GUIDELINES.md

> **Статус:** Закон. Не препоръка.  
> **Авторитет:** Всеки PR се reject-ва автоматично при нарушение на правилата в този документ.  
> **За агентите:** Четеш този файл преди да пишеш каквото и да е. Не интерпретираш — следваш.

---

## 1. TypeScript

### 1.1 Забранени конструкции

```typescript
// ❌ ЗАБРАНЕНО — навсякъде, без изключения
const x: any = something
function foo(arg: any) {}
as any

// ❌ ЗАБРАНЕНО — използвай точни типове
// @ts-ignore
// @ts-expect-error  (допустимо само с обяснение в коментар)

// ❌ ЗАБРАНЕНО — implicit returns в async
async function getData() {
  const res = await fetch(...)
  return res.json()  // типът е unknown — изрично го типизирай
}
```

### 1.2 Правилен стил

```typescript
// ✅ Всички типове са explicit
async function getData(): Promise<Chat[]> {
  const res = await fetch('/api/chats')
  if (!res.ok) throw new ApiError(res.status, 'Failed to fetch chats')
  return res.json() as Chat[]
}

// ✅ Използвай типовете от @brainbox/shared — не дефинирай свои
import type { Chat, Folder, Prompt } from '@brainbox/shared'

// ✅ Utility types когато е подходящо
type CreateChatInput = Omit<Chat, 'id' | 'created_at' | 'user_id'>
type UpdateChatInput = Partial<Pick<Chat, 'title' | 'folder_id' | 'is_archived'>>
```

### 1.3 Централизация на типовете

- Всички споделени типове → `packages/shared/src/types/index.ts`
- Dashboard-специфични типове → `apps/dashboard/src/types/`
- Extension-специфични типове → `apps/extension/src/types/`
- Никога не дефинирай тип, ако вече съществува в `@brainbox/shared`

---

## 2. Валидация (Zod)

**Правило:** Всяко входящо данни от externe source минава през Zod. Без изключения.

### 2.1 Кога се валидира

- API route body → `createChatSchema.parse(body)` **преди** всякакъв DB достъп
- Extension данни → `createChatSchema.parse(data)` в adapter **преди** изпращане
- URL параметри → `z.string().uuid().parse(params.id)`
- Environment variables → валидирани при startup (виж `src/lib/config.ts`)

### 2.2 Как се пишат schemas

```typescript
// ✅ В packages/validation/schemas/chat.ts
import { z } from 'zod'

export const createChatSchema = z.object({
  title: z.string().min(1).max(500).trim(),
  platform: z.enum(['chatgpt', 'claude', 'gemini', 'deepseek', 'grok', 'perplexity', 'qwen', 'lmarena']),
  source_id: z.string().min(1),
  messages: z.array(messageSchema),           // никога z.array(z.any())
  summary: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  folder_id: z.string().uuid().nullable().optional(),
  is_archived: z.boolean().optional().default(false),
})

export type CreateChatInput = z.infer<typeof createChatSchema>
```

### 2.3 Error handling при validation

```typescript
// ✅ В API route
const result = createChatSchema.safeParse(body)
if (!result.success) {
  return NextResponse.json(
    { error: 'Validation failed', details: result.error.flatten() },
    { status: 400 }
  )
}
const data = result.data  // TypeScript знае типа тук
```

---

## 3. Folder структура

### 3.1 Dashboard (`apps/dashboard/src/`)

```
app/
  (auth)/           # Route group — auth pages
  api/              # API routes само тук
    chats/route.ts
    folders/route.ts
  layout.tsx        # Само layout, нула логика
  page.tsx          # Само рендериране

components/
  ui/               # Generic UI (Button, Input, Modal) — без бизнес логика
  features/
    chats/          # Feature-specific компоненти
      ChatCard.tsx
      components/   # Sub-компоненти на ChatCard
        ChatBadges.tsx
        ChatActionMenu.tsx

store/
  useChatStore.ts   # Един файл = един store = един feature
  useFolderStore.ts

lib/
  supabase/
    client.ts       # Browser client
    server.ts       # Server client
  logger.ts         # Единственото място за logging
  config.ts         # Validated env variables

types/              # Dashboard-специфични типове (не споделени)
```

### 3.2 Extension (`apps/extension/src/`)

```
background/
  service-worker.ts       # Само координация, без логика
  modules/
    authManager.ts
    syncManager.ts
    dashboardApi.ts
    messageRouter.ts
    cacheManager.ts
    platformAdapters/
      chatgpt.adapter.ts  # Един файл = един адаптер = една платформа
      claude.adapter.ts

content/
  content-chatgpt.ts      # Един файл = един content script = една платформа
  content-claude.ts
  content-dashboard-auth.ts

lib/
  normalizers.ts
  rate-limiter.ts
  logger.ts
```

---

## 4. Компоненти

### 4.1 Правила

```typescript
// ✅ Компонентът само рендерира и делегира events
// Без fetch, без директен Supabase, без бизнес логика
export function ChatCard({ chat }: { chat: Chat }) {
  const { deleteChat } = useChatStore(
    useShallow(s => ({ deleteChat: s.deleteChat }))
  )
  
  return (
    <article className="glass-card">
      <ChatBadges tags={chat.tags} />
      <ChatActionMenu onDelete={() => deleteChat(chat.id)} />
    </article>
  )
}

// ❌ ЗАБРАНЕНО — fetch в компонент
export function ChatCard({ id }: { id: string }) {
  const [chat, setChat] = useState(null)
  useEffect(() => {
    fetch(`/api/chats/${id}`).then(r => r.json()).then(setChat)
  }, [id])
}
```

### 4.2 useShallow — задължително при четене от store

```typescript
// ✅ Правилно — useShallow предотвратява ненужни re-renders
const { chats, selectedChatId } = useChatStore(
  useShallow(s => ({ chats: s.chats, selectedChatId: s.selectedChatId }))
)

// ❌ Грешно — целият store се subscribe-ва, всяка промяна re-render-ира
const store = useChatStore()
```

### 4.3 Props

- Props интерфейсите са explicit TypeScript типове — не `object`, не `any`
- Default props се задават в destructuring: `function Foo({ size = 'md' }: Props)`
- Event handlers са `on<Action>`: `onDelete`, `onSelect`, `onClose`

---

## 5. State Management (Zustand)

### 5.1 Структура на store

```typescript
// ✅ Правилна структура
interface ChatStore {
  // State
  chats: Chat[]
  selectedChatId: string | null
  isLoading: boolean
  
  // Actions — всяка action е отделна функция
  setChats: (chats: Chat[]) => void
  addChat: (chat: Chat) => void
  updateChat: (id: string, updates: Partial<Chat>) => void
  deleteChat: (id: string) => void
  selectChat: (id: string | null) => void
}
```

### 5.2 Optimistic updates — задължителен pattern

```typescript
// ✅ Правилен optimistic update
deleteChat: async (id: string) => {
  // 1. Snapshot за rollback
  const previousChats = get().chats
  
  // 2. Optimistic update — веднага
  set(s => ({ chats: s.chats.filter(c => c.id !== id) }))
  
  // 3. API call
  const res = await fetch(`/api/chats/${id}`, { method: 'DELETE' })
  
  // 4. Rollback при грешка
  if (!res.ok) {
    set({ chats: previousChats })
    logger.error('ChatStore', 'Failed to delete chat', { id })
  }
}
```

### 5.3 Мутации на state

```typescript
// ✅ Store-ът мутира само чрез дефинирани actions
// Забранено е извикването на useChatStore.setState() отвън
// DataProvider.tsx например трябва да вика hydrate action:
setChats: (chats: Chat[]) => set({ chats })  // ✅ defined action
useChatStore.setState({ chats: [...] })        // ❌ external mutation
```

---

## 6. API Routes

### 6.1 Структура на всеки API route

```typescript
// apps/dashboard/src/app/api/chats/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { createChatSchema } from '@brainbox/validation'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  // 1. Auth — винаги първо
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse body
  const body = await request.json()

  // 3. Validation — винаги преди DB
  const result = createChatSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 400 }
    )
  }

  // 4. DB operation — само след успешна validation
  const { data, error } = await supabase
    .from('chats')
    .insert({ ...result.data, user_id: user.id })
    .select()
    .single()

  if (error) {
    logger.error('API:chats', 'Insert failed', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  // 5. Response
  return NextResponse.json(data, { status: 201 })
}
```

### 6.2 Правила за API routes

- Auth проверката е **първа** — преди parsing, преди validation
- `user.id` се добавя **server-side** — никога от клиента
- Никога не expose-вай вътрешни DB грешки към клиента
- Всички error response-и имат `{ error: string }` структура
- Supabase service role key → само в server-side код

---

## 7. Async функции и Error Handling

### 7.1 Правила

```typescript
// ✅ Всяка async функция има explicit return type
async function fetchChats(userId: string): Promise<Chat[]> { ... }

// ✅ try/catch само когато имаш какво да правиш с грешката
// Не swallow-вай грешки в празен catch
try {
  await syncChat(chat)
} catch (error) {
  logger.error('SyncManager', 'Sync failed', error)
  await addToRetryQueue(chat)  // имаш action
}

// ❌ ЗАБРАНЕНО — empty catch
try {
  await doSomething()
} catch (_) {}
```

### 7.2 Fetch wrapper

Използвай `logger.ts` за всяка мрежова грешка. Не `console.error`.

---

## 8. Logging

```typescript
// Единственото легитимно API за логиране
import { logger } from '@/lib/logger'  // Dashboard
import { logger } from '@/lib/logger'  // Extension

logger.debug('ComponentName', 'Short message', { context: data })
logger.info('ComponentName', 'Something happened')
logger.warn('ComponentName', 'Possible issue', details)
logger.error('ComponentName', 'Failed to do X', error)

// ❌ ЗАБРАНЕНО в production код
console.log(...)
console.error(...)
console.debug(...)
```

Logger в production изпраща грешките към telemetry системата (Sentry). В development — само в конзолата.

---

## 9. Тестове

### 9.1 Структура

- Unit тестове: до файла който тестват — `authManager.test.ts` до `authManager.ts`
- E2E тестове: `tests/e2e/`
- Test файлове не се commit-ват с `.skip` без GitHub Issue reference в коментар

### 9.2 Правила за тестове

```typescript
// ✅ Тества публичния contract, не вътрешната имплементация
it('deleteChat removes chat from store and calls API', async () => {
  const store = createTestStore({ chats: [mockChat] })
  await store.getState().deleteChat(mockChat.id)
  expect(store.getState().chats).toHaveLength(0)
  expect(mockFetch).toHaveBeenCalledWith(`/api/chats/${mockChat.id}`, { method: 'DELETE' })
})

// ✅ Тества и happy path, и error path
it('deleteChat rolls back on API failure', async () => {
  mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
  const store = createTestStore({ chats: [mockChat] })
  await store.getState().deleteChat(mockChat.id)
  expect(store.getState().chats).toHaveLength(1)  // rollback
})

// ❌ ЗАБРАНЕНО — test, който само проверява дали функцията е извикана
it('calls deleteChat', () => {
  expect(vi.fn()).toHaveBeenCalled()  // тества нищо
})
```

### 9.3 Мокове

- Mock-овете връщат данни, съответстващи на `@brainbox/shared` типовете
- Не мокирай модула, който тестваш
- Rate limiters се mock-ват да са immediate в тестова среда

---

## 10. Naming Conventions

| Нещо | Конвенция | Пример |
|------|-----------|--------|
| React компонент | PascalCase | `ChatCard`, `FolderTree` |
| Hook | `use` prefix + PascalCase | `useChatStore`, `useShallow` |
| Zustand store файл | `use` + Feature + `Store` | `useChatStore.ts` |
| API route файл | `route.ts` в директория | `api/chats/route.ts` |
| Adapter файл | `platform.adapter.ts` | `chatgpt.adapter.ts` |
| Content script | `content-platform.ts` | `content-claude.ts` |
| Type/Interface | PascalCase | `Chat`, `CreateChatInput` |
| Zod schema | camelCase + `Schema` | `createChatSchema` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_FOLDER_DEPTH` |
| Env variable | `SCREAMING_SNAKE_CASE` | `NEXT_PUBLIC_SUPABASE_URL` |
| CSS class (custom) | kebab-case | `glass-card`, `btn-primary` |

---

## 11. Imports

```typescript
// Ред на imports (автоматично форматиран от ESLint)
// 1. External packages
import { z } from 'zod'
import { NextResponse } from 'next/server'

// 2. Internal packages (@brainbox/*)
import type { Chat } from '@brainbox/shared'
import { createChatSchema } from '@brainbox/validation'

// 3. Absolute imports от проекта
import { logger } from '@/lib/logger'
import { createServerClient } from '@/lib/supabase/server'

// 4. Relative imports
import { ChatBadges } from './components/ChatBadges'

// ❌ ЗАБРАНЕНО — относителни imports навлизащи в parent директории
import { something } from '../../../lib/utils'
// ✅ Използвай path aliases
import { something } from '@/lib/utils'
```
