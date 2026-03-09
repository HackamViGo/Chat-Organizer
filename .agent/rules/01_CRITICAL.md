---
version: 5.0.0
priority: ABSOLUTE
override_allowed: EMERGENCY_ONLY
---

# Critical Rules — Non-Negotiable

> These rules protect security, data integrity, and system architecture.  
> Violations trigger automatic CI failure and require ARCHITECT review.

---

## 🔴 C1. Security

### C1.1 Authentication & Authorization

#### Rule: User ID Source

```typescript
// ❌ FORBIDDEN (user_id from client is NEVER trusted)
async function handler(req: Request) {
  const { user_id } = await req.json() // ❌ SECURITY VIOLATION
  const data = await supabase.from('chats').select('*').eq('user_id', user_id)
}

// ✅ CORRECT (user_id from server-side auth)
async function handler(req: Request) {
  const supabase = createServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await supabase.from('chats').select('*').eq('user_id', user.id) // ✅ Trusted source
}
```

#### Exception: Public Endpoints

```typescript
// Explicitly mark public endpoints
/**
 * @public
 * This endpoint is intentionally public (e.g., health check, public blog posts)
 */
export async function GET(req: Request) {
  // No auth required
}
```

---

### C1.2 Secrets Management

#### Rule: Environment Variables Only

```bash
# ✅ CORRECT
GEMINI_API_KEY=AIzaSy...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# ❌ FORBIDDEN in code
const API_KEY = "AIzaSy...";  // ❌ CRITICAL VIOLATION
```

#### Rule: Naming Convention

```bash
# Format: {SERVICE}_{TYPE}_KEY

GEMINI_API_KEY              ✅
SUPABASE_SERVICE_ROLE_KEY   ✅
UPSTASH_REDIS_REST_TOKEN    ✅

NEXT_PUBLIC_SUPABASE_URL    ✅ (Public prefix for client-exposed vars)
NEXT_PUBLIC_API_KEY         ❌ (Secrets should NEVER be public)
```

#### Rule: Storage Locations

```
✅ Server-side:
  - process.env.GEMINI_API_KEY
  - process.env.SUPABASE_SERVICE_ROLE_KEY

✅ Extension (encrypted):
  - chrome.storage.local (after AES-256-GCM encryption)

❌ FORBIDDEN:
  - localStorage (client-side)
  - sessionStorage (client-side)
  - Hardcoded in code
  - Git history
  - Client-side environment variables (NEXT_PUBLIC_*)
```

#### Detection Script

```bash
# Run in CI
pnpm run check:secrets

# checks/secrets.ts
const forbiddenPatterns = [
  /AIza[0-9A-Za-z-_]{35}/,        // Google API Key
  /sk-[0-9A-Za-z]{48}/,           // OpenAI API Key
  /eyJhbG[0-9A-Za-z-_]+\./,       // JWT tokens
];

// Scan all .ts, .tsx, .js files
// Fail build if match found
```

---

### C1.3 Row Level Security (RLS)

#### Rule: RLS Always On

```sql
-- ✅ CORRECT (every table must have RLS enabled)
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chats"
ON chats FOR SELECT
USING (auth.uid() = user_id);

-- ❌ FORBIDDEN
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;  -- CRITICAL VIOLATION
```

#### Rule: Service Role Usage

```typescript
// ✅ CORRECT (service_role only for admin operations, server-side)
// apps/dashboard/src/app/api/admin/route.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Server-side only
)

// MUST log in security_audit_log
await supabase.from('security_audit_log').insert({
  action: 'RLS_BYPASS',
  reason: 'Admin bulk delete',
  performed_by: adminUserId,
  timestamp: new Date().toISOString(),
})

// ❌ FORBIDDEN (service_role in client code)
// apps/dashboard/src/components/SomeComponent.tsx
const supabase = createClient(url, SERVICE_ROLE_KEY) // ❌ EXPOSED TO CLIENT
```

#### Bypass Allowlist

ONLY these operations can bypass RLS:

1. **Server-side admin operations** (with audit log)
2. **Background jobs** (cron, webhooks)
3. **Public read-only endpoints** (explicit policy: `USING (true)`)

---

### C1.4 Input Validation

#### Rule: Zod First, Always

```typescript
// ❌ WRONG (no validation)
export async function POST(req: Request) {
  const body = await req.json()
  const chat = await createChat(body) // ❌ Unvalidated input
}

// ✅ CORRECT
import { createChatSchema } from '@brainbox/validation'

export async function POST(req: Request) {
  const body = await req.json()

  const result = createChatSchema.safeParse(body)

  if (!result.success) {
    return Response.json(
      { error: 'Validation failed', issues: result.error.errors },
      { status: 400 }
    )
  }

  const chat = await createChat(result.data) // ✅ Type-safe, validated
}
```

#### Rule: Schema Location

```
✅ CORRECT:
  packages/validation/src/schemas/chat.ts
  packages/validation/src/schemas/folder.ts

❌ FORBIDDEN:
  apps/dashboard/src/app/api/chats/route.ts (inline schema)
  apps/extension/src/background/schemas.ts (duplicate schema)
```

#### Rule: XSS Protection

```typescript
// ❌ WRONG (raw HTML from user)
function MessageContent({ content }: { content: string }) {
  return <div dangerouslySetInnerHTML={{ __html: content }} />;  // ❌ XSS RISK
}

// ✅ CORRECT (sanitized)
import DOMPurify from 'isomorphic-dompurify';

function MessageContent({ content }: { content: string }) {
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOWED_URI_REGEXP: /^https?:\/\//,
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

---

## 🔴 C2. Type Safety

### C2.1 TypeScript Strict Mode

#### Rule: Compiler Config

```json
// tsconfig.json (all apps and packages)
{
  "compilerOptions": {
    "strict": true, // ✅ Required
    "noUncheckedIndexedAccess": true, // ✅ Required
    "noImplicitOverride": true, // ✅ Required
    "exactOptionalPropertyTypes": true, // ✅ Required
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

#### Rule: Build Errors

```javascript
// next.config.js
module.exports = {
  typescript: {
    ignoreBuildErrors: false,  // ✅ Must be false (or omitted)
  },
  eslint: {
    ignoreDuringBuilds: false,  // ✅ Must be false (or omitted)
  }
};

// ❌ FORBIDDEN
typescript: {
  ignoreBuildErrors: true,  // CRITICAL VIOLATION
}
```

---

### C2.2 Forbidden Types

#### Rule: No `any`

```typescript
// ❌ FORBIDDEN
function processData(data: any) { ... }
const result: any = await fetch('/api/data');
const items: any[] = [];

// ✅ CORRECT
function processData(data: unknown) {
  if (isValidData(data)) {
    // Type narrowed, safe to use
  }
}

const result: ApiResponse = await fetch('/api/data').then(r => r.json());
const items: Chat[] = [];
```

#### Rule: No `z.any()`

```typescript
// ❌ FORBIDDEN
const schema = z.object({
  data: z.any(), // VIOLATION
})

// ✅ CORRECT
const schema = z.object({
  data: z.union([z.string(), z.number(), z.null()]), // Explicit types
})
```

#### Rule: `@ts-ignore` vs `@ts-expect-error`

```typescript
// ❌ FORBIDDEN (silences all errors, no explanation)
// @ts-ignore
const value = complexLibrary.weirdMethod()

// ✅ CORRECT (documents expected error)
// @ts-expect-error — Library types are wrong, opened issue #123
const value = complexLibrary.weirdMethod()
```

#### Rule: Type Assertions

```typescript
// ❌ WRONG (unsafe cast)
const user = data as User

// ✅ CORRECT (runtime validation)
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string'
  )
}

if (isUser(data)) {
  const user = data // Type narrowed safely
}
```

---

### C2.3 Type Guards (Required Pattern)

#### Rule: All `unknown` Must Be Narrowed

```typescript
// Standard type guard template
function is{Type}(value: unknown): value is {Type} {
  return (
    typeof value === 'object' &&
    value !== null &&
    'requiredField' in value &&
    typeof value.requiredField === 'expectedType'
  );
}

// Example
function isChat(value: unknown): value is Chat {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'title' in value &&
    typeof value.title === 'string' &&
    'platform' in value &&
    ['chatgpt', 'claude', 'gemini'].includes(value.platform)
  );
}

// Usage
const data: unknown = await response.json();

if (isChat(data)) {
  console.log(data.title);  // ✅ TypeScript knows this is safe
} else {
  throw new Error('Invalid chat data');
}
```

#### Rule: Prefer Zod for Complex Types

```typescript
// ✅ BETTER (Zod handles validation + type inference)
import { chatSchema } from '@brainbox/validation'

const data: unknown = await response.json()
const chat = chatSchema.parse(data) // Throws if invalid, returns typed object
```

---

## 🔴 C3. Architecture Boundaries

### C3.1 Module Isolation

#### Rule: No Cross-App Imports

```typescript
// ❌ FORBIDDEN
// apps/extension/src/background/index.ts
import { useChatStore } from '../../../dashboard/src/store/useChatStore'

// apps/dashboard/src/components/Chat.tsx
import { AuthManager } from '../../../extension/src/background/AuthManager'

// ✅ CORRECT (shared logic in packages)
// apps/extension/src/background/index.ts
import { createChat } from '@brainbox/shared'

// apps/dashboard/src/components/Chat.tsx
import { createChat } from '@brainbox/shared'
```

#### Enforcement

```javascript
// eslint-config-custom/index.js
module.exports = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          '../../../dashboard/*', // Extension can't import Dashboard
          '../../../extension/*', // Dashboard can't import Extension
        ],
      },
    ],
  },
}
```

---

### C3.2 Shared Code Organization

#### Rule: Package Structure

```
packages/
├── shared/              ← Business logic, utilities
│   └── src/
│       ├── services/    ← AI, prompt management, sync
│       ├── utils/       ← Helpers, formatters
│       └── constants/   ← Shared constants
│
├── types/               ← TypeScript definitions
│   └── src/
│       ├── database.ts  ← Supabase generated types
│       ├── api.ts       ← API request/response types
│       └── extension.ts ← Extension-specific types
│
├── validation/          ← Zod schemas
│   └── src/
│       └── schemas/     ← One file per entity
│
└── ui/                  ← React components
    └── src/
        └── components/  ← Shadcn/ui components
```

#### Rule: Import Paths

```typescript
// ✅ CORRECT (use package aliases)
import { createChatSchema } from '@brainbox/validation'
import { Chat } from '@brainbox/types'
import { Button } from '@brainbox/ui'
import { logger } from '@brainbox/shared'

// ❌ FORBIDDEN (relative imports across packages)
import { createChatSchema } from '../../../packages/validation/src/schemas/chat'
```

---

### C3.3 New Architectural Layer Approval

#### Rule: RFC Required

Before creating:

- New package in `packages/`
- New app in `apps/`
- New shared service
- New database schema

Create RFC: `docs/rfcs/ARCH_{YYYYMMDD}_{NAME}.md`

**Template:**

```markdown
# RFC: Add {Package/Service} Layer

**Author:** {ROLE}
**Date:** {DATE}

## Problem

What problem does this solve?

## Proposed Solution

What new layer/package is needed?

## Structure
```

packages/new-package/
├── src/
│ └── index.ts
├── package.json
└── tsconfig.json

```

## Dependencies
What will this import/export?

**Imports:**
- @brainbox/types
- @brainbox/validation

**Exports:**
- `function doSomething()`

## Impact
- [ ] Update `turbo.json` pipeline
- [ ] Update `docs/Guides/ARCHITECTURE.md`
- [ ] Update import maps in `tsconfig.json`

## Approval
- [ ] ARCHITECT: {name}
- [ ] Affected roles: {list}
```

---

## 🔴 C4. Data Integrity

### C4.1 Database Migrations

#### Rule: Migration-Only Changes

```sql
-- ✅ CORRECT (all changes via migrations)
-- supabase/migrations/005_add_tags_column.sql
ALTER TABLE chats ADD COLUMN tags TEXT[];

-- ❌ FORBIDDEN (manual changes in Supabase dashboard)
-- Direct SQL in production database
```

#### Rule: Naming Convention

```
Format: {timestamp}_{description}.sql

✅ Examples:
20260225143000_initial_schema.sql
20260225150000_add_vector_search.sql
20260225160000_create_security_audit_log.sql

❌ Wrong:
migration1.sql
update.sql
fix_bug.sql
```

#### Rule: Rollback Scripts

For destructive changes (DROP, ALTER TYPE, etc.), include rollback:

```sql
-- Migration: 20260225143000_remove_deprecated_field.sql

-- Forward
ALTER TABLE chats DROP COLUMN deprecated_field;

-- Rollback (in comments for reference)
-- ALTER TABLE chats ADD COLUMN deprecated_field TEXT;
-- UPDATE chats SET deprecated_field = '' WHERE deprecated_field IS NULL;
```

**Store rollback in:** `supabase/rollbacks/{timestamp}_rollback.sql`

---

### C4.2 Optimistic Updates

#### Rule: Always Implement Rollback

```typescript
// ✅ CORRECT Pattern
const previousState = get().items // 1. Snapshot

set({ items: [...previousState, newItem] }) // 2. Optimistic update

try {
  await api.createItem(newItem) // 3. API call
} catch (error) {
  set({ items: previousState }) // 4. Rollback on error
  toast.error('Failed to create item')
  throw error
}

// ❌ WRONG (no rollback)
set({ items: [...get().items, newItem] })
await api.createItem(newItem) // If this fails, UI is out of sync
```

#### Advanced Pattern (with Loading States)

```typescript
const createChat = async (data: CreateChatInput) => {
  const tempId = `temp-${Date.now()}`
  const tempChat = { ...data, id: tempId, created_at: new Date() }

  // 1. Add with loading state
  set((state) => ({
    chats: [...state.chats, { ...tempChat, _loading: true }],
  }))

  try {
    // 2. API call
    const realChat = await api.createChat(data)

    // 3. Replace temp with real
    set((state) => ({
      chats: state.chats.map((c) => (c.id === tempId ? realChat : c)),
    }))
  } catch (error) {
    // 4. Remove temp on error
    set((state) => ({
      chats: state.chats.filter((c) => c.id !== tempId),
    }))
    throw error
  }
}
```

---

### C4.3 Storage Keys (Zustand Persist)

#### Rule: Naming Convention

```typescript
// ✅ CORRECT
const useChatStore = create(
  persist(
    (set, get) => ({ ... }),
    {
      name: 'brainbox-chat-store',  // ✅ Correct format
    }
  )
);

// ❌ FORBIDDEN (legacy names)
{
  name: 'promptmaster-chat-store',  // ❌ Old naming
  name: 'chat-store',                // ❌ Missing prefix
  name: 'brainbox_chat_store',       // ❌ Wrong separator
}
```

#### Migration Script

```typescript
// scripts/migrate-storage-keys.ts
const migrations = [
  { from: 'promptmaster-chat-store', to: 'brainbox-chat-store' },
  { from: 'promptmaster-auth-store', to: 'brainbox-auth-store' },
]

migrations.forEach(({ from, to }) => {
  const oldData = localStorage.getItem(from)
  if (oldData) {
    localStorage.setItem(to, oldData)
    localStorage.removeItem(from)
    console.log(`Migrated ${from} → ${to}`)
  }
})
```

---

## 🔴 C5. Package Management

### C5.1 pnpm Only

#### Rule: Exclusive Package Manager

```bash
# ✅ CORRECT
pnpm install
pnpm add react
pnpm remove lodash

# ❌ FORBIDDEN
npm install    # ❌ VIOLATION
yarn add react # ❌ VIOLATION
```

#### Detection

```bash
# .husky/pre-commit
if [ -f "package-lock.json" ]; then
  echo "❌ ERROR: package-lock.json detected (npm was used)"
  echo "   Delete it and use 'pnpm install' instead"
  exit 1
fi

if [ -f "yarn.lock" ]; then
  echo "❌ ERROR: yarn.lock detected"
  exit 1
fi
```

---

### C5.2 Lock File Discipline

#### Rule: Single Source of Truth

```
✅ CORRECT:
  pnpm-lock.yaml (in root only)

❌ FORBIDDEN:
  apps/dashboard/pnpm-lock.yaml
  packages/shared/pnpm-lock.yaml
  package-lock.json (anywhere)
  yarn.lock (anywhere)
```

#### Rule: Never Manually Edit

```yaml
# pnpm-lock.yaml

# ❌ FORBIDDEN (manual edit)
# dependencies:
#   react: 18.2.0  // Changed manually

# ✅ CORRECT (via pnpm command)
# pnpm add react@18.3.0
```

---

### C5.3 Dependency Updates

#### Rule: Security First

```bash
# Check for security vulnerabilities (run weekly)
pnpm audit

# Update vulnerable packages immediately
pnpm update {package-name}
```

#### Rule: Major Version Bumps Need Approval

```bash
# Minor/Patch (auto-approved)
pnpm update react@18.3.1  # 18.2.0 → 18.3.1 ✅

# Major (needs RFC)
pnpm update react@19.0.0  # 18.x → 19.x ❌ Need ARCHITECT approval
```

**Process:**

1. Create RFC: `docs/rfcs/DEP_{YYYYMMDD}_{PACKAGE}_v{NEW_VERSION}.md`
2. Test in isolated branch
3. Document breaking changes
4. Get ARCHITECT approval
5. Update

---

## 🚨 Violation Response Protocol

### Automatic (CI/CD)

```yaml
# .github/workflows/critical-check.yml
name: Critical Rules Check

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - name: Check for hardcoded secrets
        run: pnpm check:secrets

      - name: Check for `any` types
        run: pnpm check:types

      - name: Verify RLS policies
        run: pnpm check:rls

      - name: Check package manager
        run: |
          if [ -f "package-lock.json" ]; then
            echo "❌ npm detected"
            exit 1
          fi
```

### Manual (Code Review)

- [ ] Reviewer checks file ownership matrix
- [ ] Reviewer verifies no CRITICAL rule violations
- [ ] Reviewer confirms approval chain (if needed)

### On Violation Detected

1. **Block merge** (PR cannot be merged)
2. **Notify ARCHITECT** (automated Slack/Discord message)
3. **Log in audit trail** (`.agent/violations.log`)
4. **Require fix** (no override without emergency protocol)

---

## 📚 Related Documents

- **00_META.md** — Rule hierarchy and amendment process
- **02_WORKFLOW.md** — Git, deployment, environment management
- **03_CODE_STANDARDS.md** — TypeScript, React conventions
- **docs/Guides/SECURITY.md** — Detailed security guidelines

---

**END OF CRITICAL RULES**
