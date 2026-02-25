# SECURITY.md

> **Статус:** Закон. Нарушение = блокиран PR, независимо от функционалността.  
> **Аудит основа:** RLS lipsa (blind_spots_audit.md §1), plain-text JWT (master_audit.md P0), no rate limiting (blind_spots_audit.md §3).

---

## Принципи

1. **Defense in depth:** Никой слой не разчита само на предишния. RLS защитава дори ако middleware пропусне.
2. **Least privilege:** Всеки компонент достъпва само данните, нужни за функцията му.
3. **Zero trust на вход:** Всичко идващо отвън е невалидно докато не се докаже обратното.
4. **Fail secure:** При неяснота — deny, не allow.

---

## 1. Row Level Security (RLS) — Задължително

Всяка таблица с потребителски данни трябва да има RLS. Това е последната линия на защита срещу директни Supabase REST API заявки.

### Задължителни политики за всяка user-owned таблица

```sql
-- Прилага се за: users (за профили), chats, folders, prompts, images, lists, list_items

ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

-- SELECT: само собствени данни
CREATE POLICY "<table>_select_own" ON <table_name>
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT: само с правилен user_id
CREATE POLICY "<table>_insert_own" ON <table_name>
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: само собствени данни
CREATE POLICY "<table>_update_own" ON <table_name>
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- DELETE: само собствени данни
CREATE POLICY "<table>_delete_own" ON <table_name>
  FOR DELETE USING (auth.uid() = user_id);
```

### Проверка

```sql
-- Провери дали RLS е активен за всички таблици
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- rowsecurity трябва да е TRUE за всяка таблица
```

**Правило за агентите:** Всяка нова таблица изисква migration с RLS политики. Миграция без RLS → reject.

---

## 2. Authentication

### Dashboard

- Auth се управлява от Supabase Auth
- `middleware.ts` проверява сесията на всеки route
- API routes проверяват `user` обекта независимо от middleware:

```typescript
// Задължително в НАЧАЛОТО на всеки API route
const { data: { user }, error } = await supabase.auth.getUser()
if (error || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
// Никога не използвай user id от request body — само от auth.getUser()
```

### Extension

- JWT токенът се съхранява в `chrome.storage.local`
- Токенът се предава към Dashboard API като `Authorization: Bearer <token>`
- Токенът трябва да е encrypt-нат в storage (P0 от master_audit.md):

```typescript
// authManager.ts — задължително
async function storeToken(token: string): Promise<void> {
  const encrypted = await encryptWithExtensionKey(token)
  await chrome.storage.local.set({ [TOKEN_KEY]: encrypted })
}

async function getToken(): Promise<string | null> {
  const { [TOKEN_KEY]: encrypted } = await chrome.storage.local.get(TOKEN_KEY)
  if (!encrypted) return null
  return decryptWithExtensionKey(encrypted)
}
```

---

## 3. Input Validation — Zod навсякъде

Вижте `CODE_GUIDELINES.md §2` за детайлни правила.

**Критични точки:**
- `user_id` никога не се приема от клиент — само от `auth.getUser()` server-side
- `id` полета се валидират като UUID: `z.string().uuid()`
- String inputs имат `max()` ограничение: `z.string().max(50000)` за messages, `z.string().max(500)` за titles
- SQL injection не е риск при Supabase SDK (parameterized queries) — но Zod validation е задължителна за data integrity

---

## 4. Rate Limiting

Всички AI endpoints са скъпи. Задължително за `/api/ai/*` и `/api/chats/extension`.

```typescript
// apps/dashboard/src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const aiRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 m'),  // 5 AI requests per minute
  analytics: true,
})

export const syncRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(30, '1 m'),  // 30 sync requests per minute
  analytics: true,
})

// Употреба в API route
const identifier = user.id  // per-user, не per-IP за auth routes
const { success, limit, remaining } = await aiRateLimit.limit(identifier)
if (!success) {
  return NextResponse.json(
    { error: 'Rate limit exceeded', retryAfter: 60 },
    { status: 429, headers: { 'Retry-After': '60' } }
  )
}
```

**Лимити по endpoint тип:**

| Endpoint | Лимит | Window | Identifier |
|----------|-------|--------|------------|
| `/api/ai/*` | 5 req | 1 минута | user.id |
| `/api/chats/extension` | 30 req | 1 минута | user.id |
| `/api/chats` (CRUD) | 100 req | 1 минута | user.id |
| `/api/auth/*` | 10 req | 5 минути | IP |

---

## 5. Secrets Management

### Environment Variables — класификация

| Variable | Тип | Достъпен в | Забележка |
|----------|-----|------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Клиент + Сървър | OK — public URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Клиент + Сървър | OK — RLS я защитава |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Само сървър | **Никога в клиент** |
| `AI_API_KEY` (Gemini, etc.) | Secret | Само сървър | **Никога в клиент** |
| `UPSTASH_REDIS_REST_URL` | Secret | Само сървър | |
| `UPSTASH_REDIS_REST_TOKEN` | Secret | Само сървър | |

**Правило:** Ако variable не е `NEXT_PUBLIC_` — тя е сървърна. Ако е сървърна — не се импортира в компоненти.

---

## 6. Content Security Policy

### Dashboard (Next.js)

```typescript
// next.config.js
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",  // Next.js изисква unsafe-inline
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "font-src 'self' https://fonts.gstatic.com",
    ].join('; ')
  },
]
```

### Extension

- `stripDevCSP` Vite plugin премахва `localhost` от manifest при production build
- Extension pages: `script-src 'self'` — без `unsafe-eval`, без `unsafe-inline`
- Content scripts не eval-ват код

---

## 7. Sanitization

Съдържание, уловено от AI платформи, е HTML/markdown от трета страна.

```typescript
// Задължително преди рендериране на raw HTML
import DOMPurify from 'dompurify'

const safeHtml = DOMPurify.sanitize(rawContent, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: [],  // Никакви attr — предотвратява event handlers
})
```

**Правило:** Никога `dangerouslySetInnerHTML={{ __html: userContent }}` без DOMPurify.

---

## 8. Access Logs

При P0/P1 security events логваме:

```typescript
logger.info('Security', 'Auth attempt', {
  userId: user.id,
  action: 'chat.delete',
  resourceId: chatId,
  ip: request.headers.get('x-forwarded-for'),
  userAgent: request.headers.get('user-agent'),
  timestamp: new Date().toISOString(),
})
```

**Задължителни за logging:** Неуспешни auth опити, rate limit hits, RLS violations (видими като Supabase errors), bulk operations (delete 10+ items).

---

## 9. Security Checklist за PR Review

- [ ] Новите API routes имат auth check в началото?
- [ ] `user_id` идва от `auth.getUser()`, не от request body?
- [ ] Новите таблици имат RLS migration?
- [ ] AI endpoints имат rate limiting?
- [ ] Input се валидира чрез Zod преди DB операция?
- [ ] Нови env variables са класифицирани и не са `NEXT_PUBLIC_` ако са secrets?
- [ ] Raw HTML/markdown минава през DOMPurify преди рендериране?
- [ ] Няма `console.log` с чувствителни данни (tokens, user data)?
