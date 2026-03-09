---
version: 5.0.0
priority: MEDIUM
override_allowed: YES
---

# Agent Protocol — State Management & Communication

> Defines how AI agents track work, communicate, and maintain project state.

---

## 🟢 A1. Unified State System

### A1.1 State File Format

#### Rule: Single JSON File per Role

```
Location: .agent/state/{ROLE}_state.json

Format:
{
  "agent": "ROLE_NAME",
  "version": "1.0.0",
  "status": "IDLE" | "ACTIVE" | "BLOCKED",
  "current_task": TaskObject | null,
  "history": TaskObject[],
  "stats": StatsObject
}
```

#### Full Schema

```typescript
// .agent/types/state.ts
interface AgentState {
  agent: AgentRole
  version: string
  status: 'IDLE' | 'ACTIVE' | 'BLOCKED'
  current_task: CurrentTask | null
  history: CompletedTask[]
  stats: AgentStats
}

interface CurrentTask {
  id: string // UUID
  started_at: string // ISO-8601
  task: string // Brief description
  scope: string[] // Files to be modified
  estimated_duration_minutes?: number
}

interface CompletedTask {
  id: string
  date: string // ISO-8601
  task: string
  scope: string[]
  changes: FileChange[]
  verify_score: number // 0-100
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED'
  duration_minutes: number
  blocked_by: AgentRole[] | null // If this task was blocked
  blocks: AgentRole[] | null // If this task blocks others
  notes?: string
}

interface FileChange {
  file: string // Relative path
  action: 'created' | 'modified' | 'deleted'
  lines_added: number
  lines_removed: number
  description: string
}

interface AgentStats {
  total_tasks: number
  success_count: number
  partial_count: number
  failed_count: number
  avg_verify_score: number
  avg_duration_minutes: number
}

type AgentRole =
  | 'ARCHITECT'
  | 'BACKEND_ENGINEER'
  | 'FRONTEND_ENGINEER'
  | 'EXTENSION_ENGINEER'
  | 'AI_ENGINEER'
  | 'QA_ENGINEER'
  | 'DEVOPS_ENGINEER'
  | 'DOCUMENTATION_ENGINEER'
```

---

### A1.2 State Update Protocol

#### START Task

```json
// Update .agent/state/{ROLE}_state.json
{
  "status": "ACTIVE",
  "current_task": {
    "id": "task-2026-02-25-001",
    "started_at": "2026-02-25T14:30:00Z",
    "task": "Create POST /api/chats endpoint",
    "scope": [
      "apps/dashboard/src/app/api/chats/route.ts",
      "packages/validation/src/schemas/chat.ts"
    ],
    "estimated_duration_minutes": 30
  }
}
```

#### END Task (Success)

```json
{
  "status": "IDLE",
  "current_task": null,
  "history": [
    {
      "id": "task-2026-02-25-001",
      "date": "2026-02-25T15:00:00Z",
      "task": "Create POST /api/chats endpoint",
      "scope": [
        "apps/dashboard/src/app/api/chats/route.ts",
        "packages/validation/src/schemas/chat.ts"
      ],
      "changes": [
        {
          "file": "apps/dashboard/src/app/api/chats/route.ts",
          "action": "created",
          "lines_added": 120,
          "lines_removed": 0,
          "description": "Implemented POST handler with auth, validation, rate limiting, and RLS"
        },
        {
          "file": "packages/validation/src/schemas/chat.ts",
          "action": "modified",
          "lines_added": 15,
          "lines_removed": 3,
          "description": "Added folder_id field to createChatSchema"
        }
      ],
      "verify_score": 85,
      "status": "SUCCESS",
      "duration_minutes": 32,
      "blocked_by": null,
      "blocks": ["FRONTEND_ENGINEER"],
      "notes": "Created upsert logic to prevent duplicate chats based on sourceId"
    }
    // ... previous tasks
  ],
  "stats": {
    "total_tasks": 15,
    "success_count": 13,
    "partial_count": 2,
    "failed_count": 0,
    "avg_verify_score": 83.5,
    "avg_duration_minutes": 28
  }
}
```

---

### A1.3 Helper Scripts

#### Read State

```bash
# scripts/agent-state.sh
pnpm agent:state BACKEND_ENGINEER

# Output:
# Agent: BACKEND_ENGINEER
# Status: IDLE
# Last Task: Create POST /api/chats endpoint (SUCCESS, 85/100)
# Total Tasks: 15
# Success Rate: 86.7%
```

#### Update State

```typescript
// scripts/update-agent-state.ts
import fs from 'fs'
import path from 'path'

interface UpdateOptions {
  role: AgentRole
  status?: AgentState['status']
  task?: Partial<CurrentTask>
  complete?: CompletedTask
}

function updateAgentState(options: UpdateOptions) {
  const statePath = path.join('.agent', 'state', `${options.role}_state.json`)
  const state: AgentState = JSON.parse(fs.readFileSync(statePath, 'utf-8'))

  if (options.status) {
    state.status = options.status
  }

  if (options.task) {
    state.current_task = {
      id: options.task.id || `task-${Date.now()}`,
      started_at: new Date().toISOString(),
      ...options.task,
    } as CurrentTask
  }

  if (options.complete) {
    state.history.unshift(options.complete) // Add to beginning
    state.current_task = null
    state.status = 'IDLE'

    // Update stats
    state.stats.total_tasks++
    if (options.complete.status === 'SUCCESS') state.stats.success_count++
    if (options.complete.status === 'PARTIAL') state.stats.partial_count++
    if (options.complete.status === 'FAILED') state.stats.failed_count++

    const totalScore = state.history.reduce((sum, t) => sum + t.verify_score, 0)
    state.stats.avg_verify_score = totalScore / state.history.length

    const totalDuration = state.history.reduce((sum, t) => sum + t.duration_minutes, 0)
    state.stats.avg_duration_minutes = totalDuration / state.history.length
  }

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2))
}

// Usage
updateAgentState({
  role: 'BACKEND_ENGINEER',
  complete: {
    id: 'task-123',
    date: new Date().toISOString(),
    task: 'Create POST /api/chats',
    scope: ['apps/dashboard/src/app/api/chats/route.ts'],
    changes: [
      /* ... */
    ],
    verify_score: 85,
    status: 'SUCCESS',
    duration_minutes: 30,
    blocked_by: null,
    blocks: ['FRONTEND_ENGINEER'],
  },
})
```

---

## 🟢 A2. Cross-Role Communication

### A2.1 Dependency Tracking

#### Rule: Dependencies File

```
Location: .agent/dependencies.json

Purpose: Track work handoffs between agents
```

#### Schema

```json
{
  "pending_handoffs": [
    {
      "id": "handoff-001",
      "from": "BACKEND_ENGINEER",
      "to": "FRONTEND_ENGINEER",
      "date": "2026-02-25T15:00:00Z",
      "reason": "New API endpoint created",
      "action_required": "Update useChatStore to call POST /api/chats with new schema",
      "files": ["apps/dashboard/src/store/useChatStore.ts"],
      "priority": "HIGH",
      "context": {
        "endpoint": "POST /api/chats",
        "schema": "@brainbox/validation/schemas/chat.createChatSchema",
        "example_usage": "See apps/dashboard/src/app/api/chats/route.ts"
      }
    }
  ],
  "resolved_handoffs": [
    {
      "id": "handoff-000",
      "from": "ARCHITECT",
      "to": "BACKEND_ENGINEER",
      "resolved_at": "2026-02-24T10:00:00Z",
      "resolution": "Database migrations completed"
    }
  ]
}
```

---

### A2.2 Communication Pattern

#### When You Create Work for Another Agent

```typescript
// 1. Update your state (blocks field)
updateAgentState({
  role: 'BACKEND_ENGINEER',
  complete: {
    // ... task details
    blocks: ['FRONTEND_ENGINEER'], // ← Indicate blocking
  },
})

// 2. Add handoff to dependencies.json
const dependencies = JSON.parse(fs.readFileSync('.agent/dependencies.json', 'utf-8'))
dependencies.pending_handoffs.push({
  id: `handoff-${Date.now()}`,
  from: 'BACKEND_ENGINEER',
  to: 'FRONTEND_ENGINEER',
  date: new Date().toISOString(),
  reason: 'New API endpoint created',
  action_required: 'Update useChatStore',
  files: ['apps/dashboard/src/store/useChatStore.ts'],
  priority: 'HIGH',
  context: {
    /* ... */
  },
})
fs.writeFileSync('.agent/dependencies.json', JSON.stringify(dependencies, null, 2))
```

#### When You Resolve a Handoff

```typescript
// 1. Move handoff from pending to resolved
const handoff = dependencies.pending_handoffs.find(
  (h) => h.to === 'FRONTEND_ENGINEER' && h.id === 'handoff-001'
)
dependencies.resolved_handoffs.push({
  ...handoff,
  resolved_at: new Date().toISOString(),
  resolution: 'useChatStore updated with new createChat method',
})
dependencies.pending_handoffs = dependencies.pending_handoffs.filter((h) => h.id !== 'handoff-001')

// 2. Update your state
updateAgentState({
  role: 'FRONTEND_ENGINEER',
  complete: {
    // ... task details
    blocked_by: ['BACKEND_ENGINEER'], // ← Indicate it was blocked
  },
})
```

---

## 🟢 A3. Checkpoint System

### A3.1 Auto-Checkpoint Before Risky Operations

#### Rule: Create Checkpoint

```bash
# Before:
# - Database migrations
# - Major refactors
# - Dependency updates
# - Breaking changes

pnpm agent:checkpoint BACKEND_ENGINEER "Before migration 005"
```

#### Checkpoint Schema

```json
// .agent/checkpoints/2026-02-25_BACKEND_pre-migration-005.json
{
  "timestamp": "2026-02-25T14:00:00Z",
  "role": "BACKEND_ENGINEER",
  "description": "Before migration 005 (vector search)",
  "files_snapshot": {
    "supabase/migrations/005_vector_search.sql": "sha256-abc123...",
    "packages/shared/src/services/vector-search.ts": "sha256-def456..."
  },
  "git_commit": "abc123def456",
  "verify_score": 82,
  "agent_state": {
    /* Full agent state at this point */
  }
}
```

---

### A3.2 Rollback

#### Rule: Restore from Checkpoint

```bash
pnpm agent:rollback --checkpoint 2026-02-25_BACKEND_pre-migration-005

# This will:
# 1. Restore files to their snapshot state
# 2. Restore agent state
# 3. Create a rollback entry in history
```

---

## 🟢 A4. Logging

> **State is JSON-only.** No `.log` or `.yml` files in `.agent/`. Historical `.log` files live in `archive/` only.

### A4.1 Structured Logging

#### Rule: Use Logger Service

```typescript
// packages/shared/src/utils/logger.ts
import winston from 'winston'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  )
}

export { logger }
```

#### Usage

```typescript
import { logger } from '@brainbox/shared'

// Info level
logger.info('Chat created', {
  chatId: '123',
  userId: 'user-456',
  platform: 'chatgpt',
})

// Warning
logger.warn('Rate limit approaching', {
  userId: 'user-456',
  requests: 95,
  limit: 100,
})

// Error (auto-creates Sentry event if configured)
logger.error('Database connection failed', {
  error: error.message,
  stack: error.stack,
  attempt: 3,
})

// Debug (only in development)
logger.debug('Token decrypted', { tokenLength: token.length })
```

---

## 🟢 A5. Agent Role Matching

### A5.1 Role Selection Logic

#### Rule: Automatic Role Detection

```typescript
// scripts/detect-role.ts
function detectRole(taskDescription: string, files: string[]): AgentRole {
  // 1. Check file patterns
  if (files.some((f) => f.includes('api/'))) {
    return 'BACKEND_ENGINEER'
  }

  if (files.some((f) => f.includes('components/'))) {
    return 'FRONTEND_ENGINEER'
  }

  if (files.some((f) => f.includes('extension/'))) {
    return 'EXTENSION_ENGINEER'
  }

  if (files.some((f) => f.includes('migrations/'))) {
    return 'BACKEND_ENGINEER' // DB changes
  }

  if (files.some((f) => f.includes('workflows/'))) {
    return 'DEVOPS_ENGINEER'
  }

  // 2. Check keywords in task
  const keywords = {
    BACKEND: ['api', 'database', 'migration', 'rls', 'supabase'],
    FRONTEND: ['component', 'ui', 'state', 'zustand', 'page'],
    EXTENSION: ['manifest', 'background', 'content script', 'adapter'],
    AI: ['gemini', 'prompt', 'ai', 'vector', 'embedding'],
    QA: ['test', 'e2e', 'playwright', 'coverage'],
    DEVOPS: ['deploy', 'ci', 'cd', 'docker', 'vercel'],
    DOCUMENTATION: ['docs', 'readme', 'guide'],
  }

  for (const [role, words] of Object.entries(keywords)) {
    if (words.some((word) => taskDescription.toLowerCase().includes(word))) {
      return role as AgentRole
    }
  }

  // 3. Default to ARCHITECT if unclear
  return 'ARCHITECT'
}
```

---

### A5.2 Role Capabilities Matrix

| Role              | Primary Skills              | Can Modify                      | Typical Tasks                        |
| ----------------- | --------------------------- | ------------------------------- | ------------------------------------ |
| **ARCHITECT**     | System design, dependencies | Architecture docs, rules        | Design decisions, RFC reviews        |
| **BACKEND**       | Next.js, Supabase, Zod      | API routes, migrations, schemas | Create endpoints, database changes   |
| **FRONTEND**      | React, Tailwind, Zustand    | UI components, pages, state     | Build components, manage state       |
| **EXTENSION**     | Chrome APIs, MV3            | Extension code, manifest        | Platform adapters, content scripts   |
| **AI**            | Gemini API, vector search   | AI services, prompts            | Integrate AI, optimize prompts       |
| **QA**            | Playwright, Vitest          | Tests                           | Write tests, ensure coverage         |
| **DEVOPS**        | GitHub Actions, Docker      | CI/CD, configs                  | Setup pipelines, deployments         |
| **DOCUMENTATION** | Markdown, diagrams          | Docs, guides                    | Write documentation, maintain README |

---

## 🟢 A6. Task Completion Report

### A6.1 Report Format (to User)

#### Rule: Bulgarian Language Report

```markdown
## Завършена задача: {Task Title}

**Роля:** {ROLE_NAME}  
**Дата:** {DATE}  
**Статус:** ✅ SUCCESS | ⚠️ PARTIAL | ❌ FAILED

### Промени

- **apps/dashboard/src/app/api/chats/route.ts** (created, +120 lines)
  - Създаден POST handler за `/api/chats`
  - Добавена валидация с Zod schema
  - Имплементиран rate limiting (Upstash)
  - Добавена RLS проверка за `user_id`

- **packages/validation/src/schemas/chat.ts** (modified, +15/-3 lines)
  - Добавено поле `folder_id` в `createChatSchema`
  - Обновена валидация за `url` (optional)

### Резултат

- **Verify Score:** 85/100
  - Type Check: ✅ 30/30
  - Lint: ✅ 20/20
  - Format: ✅ 10/10
  - Tests: ⚠️ 20/30 (67% coverage, needs improvement)
  - Security: ✅ 10/10

- **Tests:** 5 нови unit tests, всички минават
- **Type Check:** Няма грешки

### Блокиращи зависимости

- [ ] **FRONTEND_ENGINEER**: Трябва да обнови `useChatStore` с нов метод `createChat()`
  - Файл: `apps/dashboard/src/store/useChatStore.ts`
  - Schema: `@brainbox/validation/schemas/chat.createChatSchema`
  - Пример: Виж `apps/dashboard/src/app/api/chats/route.ts`

### Следващи стъпки

1. FRONTEND_ENGINEER: Обнови Zustand store
2. QA_ENGINEER: Добави E2E тест за create chat flow
3. DOCUMENTATION_ENGINEER: Обнови API Reference

### Забележки

Използвах upsert логика за предотвратяване на дублиране на чатове (базирано на `sourceId` от URL).
```

---

## 🟢 A7. Audit Trail

### 🔴 A7.0 Archive Rule — NEVER DELETE, ALWAYS ARCHIVE

> Any file that carries project history (decisions, logs, old state) is **NEVER deleted**.
> Archive it first, then remove from active path.

```bash
# Correct procedure:
mkdir -p archive/pre-migration-$(date +%Y%m%d)/
cp <file> archive/pre-migration-$(date +%Y%m%d)/
rm <file>  # only AFTER the copy is confirmed

# Archive IS in .gitignore — historical only, not production
```

**Why:** Every file is traceable project history. Deleting context makes future agents (and engineers) blind to why decisions were made.

---

### A7.1 Violation Log

#### File: `.agent/logs/violations.json`

```json
{
  "violations": [
    {
      "date": "2026-02-25T14:30:00Z",
      "agent": "BACKEND_ENGINEER",
      "violation": "Used 'any' type in api/chats/route.ts:45",
      "severity": "MEDIUM",
      "action": "Replaced with proper type guard",
      "resolved": true
    }
  ]
}

---

## 📚 Related Documents

- **00_META.md** — Rule hierarchy
- **01_CRITICAL.md** — Security rules
- **02_WORKFLOW.md** — Git workflow
- **03_CODE_STANDARDS.md** — Code style

---

**END OF AGENT PROTOCOL**
```
