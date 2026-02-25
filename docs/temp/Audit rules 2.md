# 📊 Git Push Rules Audit Report
**Generated:** 2026-02-25  
**Audit Scope:** All rule files (`.cursorrules.md`, `.agent/rules/main.md`, `.agents/rules/core-rules.md`, `.agents/rules/AI_AGENT_RULES.md`)

---

## 🧾 Table of All Rules & Status

| # | Rule | Source Files | Status | Notes |
|---|------|--------------|--------|-------|
| 1 | Use **pnpm** as only package manager | core-rules, AI_AGENT_RULES | ✅ АКТУАЛНО | Verified in `package.json` |
| 2 | All dependencies hoisted to root; no local installs | core-rules, AI_AGENT_RULES | ✅ АКТУАЛНО | Turborepo structure confirms |
| 3 | `apps/extension` never imports from `apps/dashboard` (only via `@brainbox/shared`) | core-rules, AI_AGENT_RULES | ✅ АКТУАЛНО | Architecture boundary enforced |
| 4 | `console.log` forbidden in production; use `logger` instead | .cursorrules, core-rules, AI_AGENT_RULES | ✅ АКТУАЛНО | 20+ matches in remediation_plan.yml indicate known violations |
| 5 | No hardcoded URLs; use `API_BASE_URL` from config | .cursorrules, core-rules | ✅ АКТУАЛНО | Security best practice |
| 6 | No "localhost" in production manifest; verify `stripDevCSP` | .cursorrules, core-rules | ✅ АКТУАЛНО | Vite config enforces |
| 7 | Always use `useShallow` with Zustand selectors | core-rules, AI_AGENT_RULES | ✅ АКТУАЛНО | 20+ matches found in dashboard code |
| 8 | Optimistic updates: update → await → rollback on error | core-rules, AI_AGENT_RULES | ✅ АКТУАЛНО | Stated but implementation verification requires code review |
| 9 | Never use `any` or `z.any()`; use `unknown` + type guards | core-rules, AI_AGENT_RULES | ✅ АКТУАЛНО | Zod schema enforcement |
| 10 | All Zod schemas in `@brainbox/validation`; validate before DB | core-rules, AI_AGENT_RULES | ✅ АКТУАЛНО | Single source of truth |
| 11 | RLS mandatory for Supabase; never bypass unless Service Role | core-rules, AI_AGENT_RULES | ✅ АКТУАЛНО | RLS policy enforcement |
| 12 | Profile binding before acting (agent-specific) | .cursorrules | ⚠️ НЕЯСНО | Only relevant for automated agents |
| 13 | Architectural decisions reference `knowledge_graph.json` node_id | .cursorrules | ⚠️ НЕЯСНО | Graph-driven approach; hard to verify without constant reference |
| 14 | Health gate: `pnpm verify` > 80 before/during/after task | .cursorrules | ⚠️ НЕЯСНО | Agent-specific; no automated way to enforce globally |
| 15 | Update `agent_states/{role}_state.yml` after missions | .cursorrules | ⚠️ НЕЯСНО | Agent-specific exit sequence |
| 16 | Knowledge hierarchy: local → graph → Context7 only if allowed | .cursorrules, AI_AGENT_RULES | ⚠️ НЕЯСНО | Guidance for decision-making; not directly verifiable |
| 17 | Languages: user interaction (Bulgarian), code/logs/commits (English) | .cursorrules, AI_AGENT_RULES | ✅ АКТУАЛНО | Enforced by convention; dashboard uses English code |
| 18 | No new layers without approval | .cursorrules, AI_AGENT_RULES | ✅ АКТУАЛНО | Process rule; enforced via PR review |
| 19 | Extension ↔ Dashboard absolute isolation | core-rules, AI_AGENT_RULES | ✅ АКТУАЛНО | Architecture boundary |
| 20 | No code duplication; check `@brainbox/shared` first | core-rules, AI_AGENT_RULES | ✅ АКТУАЛНО | Code quality rule |
| 21 | Centralized types in `packages/shared`, schemas in `validation` | core-rules, AI_AGENT_RULES | ✅ АКТУАЛНО | Structure enforced |
| 22 | `user_id` only from `auth.getUser()` server-side | core-rules, AI_AGENT_RULES | ✅ АКТУАЛНО | Security rule |
| 23 | New features require completed `FEATURE_TEMPLATE.md` | AI_AGENT_RULES | ⚠️ НЕЯСНО | Template not found in search; may be in docs |
| 24 | On ambiguity: formulate question with A/B options and wait for choice | AI_AGENT_RULES | ✅ АКТУАЛНО | Process rule for decision-making |
| 25 | Never direct push to `main`; branch policy `feature/*`/`fix/*` | AI_AGENT_RULES | ✅ АКТУАЛНО | Git workflow |
| 26 | Rule conflict priority: SECURITY > ARCH > CODE > FEATURE > User | AI_AGENT_RULES | ✅ АКТУАЛНО | Decision hierarchy |
| 27 | Forbidden changes without approval: shared types, validation schemas, manifest, RLS, turbo.json, file renames | AI_AGENT_RULES, core-rules | ✅ АКТУАЛНО | High-impact safeguards |
| 28 | Exit sequence for agents: log → state → report | .cursorrules, AI_AGENT_RULES | ⚠️ НЕЯСНО | Only for automated agents |
| 29 | Monorepo architecture: Turborepo, Next.js 14, Vite 5, React 18 | .cursorrules, AI_AGENT_RULES | ⚠️ НЕЯСНО | Version numbers may become stale |

---

## 🔄 Detected Issues & Conflicts

### 1. **Duplicate Files**
- `.cursorrules.md` and `.agent/rules/main.md` are **100% identical**.
- Both require maintenance on every update; high risk of skew.

### 2. **Stale Version References**
- Locked to "Next.js 14", "Vite 5", "React 18" in `.cursorrules.md`.
- Should be replaced with "current supported versions" or linked to `package.json`.

### 3. **Agent-Specific vs. Developer Rules**
- Sections on "profile binding", "knowledge graph", "health gate", "agent states" are **only for automated agents**.
- Mixed in with general developer rules; creates confusion.
- A human developer doesn't need to update `agent_states/{role}_state.yml`.

### 4. **console.log Violations**
- Rule forbids `console.log` in production.
- `remediation_plan.yml` shows **20+ violations** listed but status unclear (are they fixed or pending?).

### 5. **No Centralized FEATURE_TEMPLATE.md**
- `AI_AGENT_RULES.md` references `FEATURE_TEMPLATE.md` that wasn't found in top-level search.
- May be in subdirectories; needs clarification or creation.

### 6. **Knowledge Graph Not Found**
- `.cursorrules.md` mandates "every decision references `knowledge_graph.json`".
- File not located; likely exists but not imported/enforced.

### 7. **PRODUCT.md, ARCHITECTURE.md, CODE_GUIDELINES.md, SECURITY.md Not Found**
- `AI_AGENT_RULES.md` section "Преди да пишеш каквото и да е" requires reading 5 files.
- None of these were found in the workspace (may be in ignored directories or pending creation).

---

## 📋 Analysis Summary

| Category | Finding | Severity |
|----------|---------|----------|
| **Duplication** | `.cursorrules.md` = `.agent/rules/main.md` | 🔴 HIGH |
| **Staleness** | Version refs may not match current `package.json` | 🟡 MEDIUM |
| **Clarity** | Agent rules mixed with developer rules | 🟡 MEDIUM |
| **Violations** | `console.log` instances in codebase | 🟡 MEDIUM |
| **Missing Refs** | Several mandatory docs not located | 🟠 LOW-MEDIUM |
| **Maintenance** | Multiple rule sources hard to keep in sync | 🟡 MEDIUM |

---

## 💡 Recommendations

### Phase 1: Consolidation
1. **Create single source of truth:** `/docs/temp/CONSOLIDATED_RULES.md` (see below).
2. **Keep original files for backward compatibility** but mark as "Generated from CONSOLIDATED_RULES.md".
3. **Separate concerns:**
   - Developer Rules → Section A
   - Agent Protocol → Section B (clearly marked as agent-only)

### Phase 2: Automation
1. **Add CI check:** `grep -R "console\.log" --exclude-dir=node_modules src/` to catch violations.
2. **Add type check:** ESLint rule to forbid direct imports from `apps/dashboard` in extension.
3. **Version audit:** Auto-check that locked versions in rules match `package.json`.

### Phase 3: Missing Documentation
1. **Create or locate:**
   - `PRODUCT.md` (project vision/scope)
   - `ARCHITECTURE.md` (layer diagram, component isolation)
   - `CODE_GUIDELINES.md` (naming, patterns, file structure)
   - `SECURITY.md` (auth, RLS, secrets, validation)
   - `FEATURE_TEMPLATE.md` (checklist for new features)
2. Add these to root or `/docs/mandatory/`.

### Phase 4: Ongoing Maintenance
- Single update point: Edit `CONSOLIDATED_RULES.md` only.
- Generate other files via pre-commit hook or CI job.
- Version bump when rules change.

---

## 🗂️ Consolidated Rules Document

```markdown
# 📘 BrainBox – Unified Project Rules & Standards

> **Canonical source:** `/docs/guidelines/CONSOLIDATED_RULES.md`  
> **Last Updated:** 2026-02-25  
> **Applies to:** All contributors (human & AI agents)
>
> ⚠️ When you see conflicting guidance in `.cursorrules.md`, `.agent/rules/main.md`, or other files, trust this document first.

---

## 🏗️ PART A: Developer Rules (For All Contributors)

### A1. Monorepo & Tooling

**A1.1** Use **pnpm** exclusively. Never use `npm install` or `yarn`.
```bash
# OK:
pnpm install

# NOT OK:
npm install
yarn add
```

**A1.2** Dependencies are hoisted to root `package.json`.
- Shared: React, Zod, Lucide, Next.js
- Do NOT install in `apps/*` unless an app-specific override is needed.
- If you see `package-lock.json`, delete it immediately.

**A1.3** Workspace structure:
```
apps/
  ├── dashboard/    (Next.js 14 App Router + Supabase)
  └── extension/    (Vite 5 + CRXJS + React 18 Manifest V3)
packages/
  ├── shared/       (@brainbox/shared — types, utilities)
  ├── validation/   (@brainbox/validation — Zod schemas)
  ├── database/     (@brainbox/database — DB layer)
  ├── assets/       (@brainbox/assets — images, icons)
  └── config/       (@brainbox/config — shared config)
```

---

### A2. Architecture & Boundaries

**A2.1** Extension and Dashboard are **strictly isolated.**
- `apps/extension` NEVER imports directly from `apps/dashboard`.
- `apps/dashboard` NEVER imports from `apps/extension`.
- Shared logic flows through `@brainbox/packages ONLY`.

**A2.2** New architectural layers require approval.
- Example violations: new service layer, new state manager, new communication protocol.
- Before implementing → discuss with team/lead → get approval → implement.

**A2.3** Types & schemas are centralized.
- New shared types → `packages/shared/src/types/index.ts`.
- New Zod schemas → `packages/validation/schemas/{domain}.ts`.
- Never inline type definitions for shared objects.

**A2.4** No code duplication.
- Before writing a utility function → check `@brainbox/shared`.
- Before writing a type → check `packages/shared/src/types/`.
- Before writing a schema → check `packages/validation/schemas/`.

---

### A3. Code Quality & Standards

**A3.1** Languages
- User-facing content: Bulgarian (bg)
- Code comments: English (en)
- Commit messages: English (en)
- Logs: English (en)

**A3.2** Type Safety
- `any` is **forbidden**. Use `unknown` + type guards instead.
- `z.any()` is **forbidden** in Zod schemas.
- All API inputs must parse through Zod schemas before touching the database.

**A3.3** Logging & Debugging
- **NO `console.log()` in production code.**
- **Use:** `logger.debug()`, `logger.info()`, `logger.error()` from `@/lib/logger`.
- Logs go to `docs/agents/logs/` for agents, or to monitoring tools for production.

**A3.4** Security
- **No hardcoded URLs:** Use `API_BASE_URL` from `src/lib/config.ts`.
- **No "localhost" in production manifest:** `stripDevCSP` in `vite.config.ts` is active.
- **`user_id` only from server:** `const { data: { user } } = await auth.getUser()`.
  - Never pass `user_id` in request body.
  - Never assume `user_id` from client-side state.
- **Row Level Security (RLS) is mandatory** for all Supabase interactions.
  - Assume RLS is active.
  - Never bypass unless using Service Role Key in secure, server-only context.

**A3.5** State Management (Zustand)

Use `useShallow` to prevent unnecessary re-renders:
```typescript
// ❌ BAD: Destructure directly
const { chats, folders } = useChatStore();

// ✅ GOOD: Use useShallow
import { useShallow } from 'zustand/react/shallow';
const chats = useChatStore(useShallow(s => s.chats));
const folders = useFolderStore(useShallow(s => s.folders));
```

Optimistic updates must have rollback:
```typescript
// Snapshot state BEFORE mutation
const previousChats = useChatStore.getState().chats;

// Update local state
useChatStore.setState({ chats: newChats });

try {
  // Await API call
  await api.updateChats(newChats);
} catch (error) {
  // ROLLBACK on error
  useChatStore.setState({ chats: previousChats });
  logger.error('Update failed:', error);
}
```

---

### A4. Git Workflow & Process

**A4.1** Branching Strategy
- Feature work → `feature/short-description`
- Bug fixes → `fix/short-description`
- Hotfixes → May use `--no-verify` for `main`, but **must document in commit message why**.

**A4.2** Pull Requests
- NEVER direct push to `main` (except documented hotfixes).
- All changes go through PR → review → merge.
- Solo projects still use PRs to maintain history and catch oversights.

**A4.3** Commit Messages
```
[type](scope): message

Types: feat, fix, refactor, docs, test, chore
Scope: e.g., extension, dashboard, shared, db
Message: Imperative, lowercase, no period

Examples:
- feat(extension): add message listener for chat sync
- fix(dashboard): correct user auth redirect on login
- refactor(shared): simplify validation schemas
```

**A4.4** On Ambiguity
Formulate a precise question with options:
```
I'm uncertain about [specific thing].
I found these approaches:

A) [description] — Pros: X, Cons: Y
B) [description] — Pros: X, Cons: Y

Which do you prefer?
```
Do NOT guess. Do NOT pick the "easier" solution. Wait for feedback.

**A4.5** Forbidden Changes (Require Approval)
- Modifications to `packages/shared/src/types/`
- Modifications to `packages/validation/schemas/`
- Changes to `apps/extension/manifest.json` permissions
- Changes to `apps/dashboard/src/middleware.ts` auth logic
- New external dependencies
- Supabase RLS policy changes
- Changes to `turbo.json` pipeline
- File renames or moves (affects all imports)

For any of these, describe the change, justify it, and wait for approval.

---

### A5. Definition of Done (for any task)

- [ ] Code written per A3 standards (types, logging, validation).
- [ ] Tests written and passing (unit, integration, or E2E as applicable).
- [ ] No `console.log` in production code.
- [ ] No `any` types without documented reason.
- [ ] Schemas use Zod, stored in `validation` package.
- [ ] Cross-boundary imports verified (e.g., extension doesn't import dashboard).
- [ ] Documentation updated if API changes.
- [ ] Feature matches template checklist (if applicable).

---

## 🤖 PART B: Agent Protocol (For Automated Agents Only)

> This section is **only for AI agents** (Cursor, Windsurf, Claude, automated scripts).  
> Human developers can skip to Part C.

### B1. Agent Identity & Activation

**B1.1** Profile Binding
- NEVER act without adopting a specific profile from `meta_architect/profiles/*.yml`.
- Profiles define scope, responsibilities, and tool access.
- Example: EXTENSION_BUILDER assumes responsibility for `apps/extension/*`.

**B1.2** Operational Kernel
- Reference: `.agent/skills/meta_architect/SKILL.md`
- Read before executing tasks.
- If file is missing or outdated, flag it immediately.

---

### B2. Decision Framework

**B2.1** Knowledge Hierarchy
1. **Local first:** Consult `docs/` and `agent_states/` directories.
2. **Graph second:** Reference `knowledge_graph.json` for node_id-based decisions.
3. **External third:** Use external Context/APIs only if explicitly allowed by task scope.

**B2.2** Architectural Decisions
- Every decision MUST reference a valid `node_id` from `knowledge_graph.json`.
- If a node is stale (>30 days), trigger GRAPH_GUARDIAN review.
- Document decision in decision log.

**B2.3** Conflict Resolution Priority**
1. **SECURITY.md** — highest priority
2. **ARCHITECTURE.md** — architectural boundaries
3. **CODE_GUIDELINES.md** — code quality
4. **FEATURE_TEMPLATE.md** — feature completeness
5. Explicit user instruction — lowest priority (can be overridden if it violates security)

---

### B3. Validation Gates

**B3.1** Health Score
Before and after each task:
```bash
pnpm verify
```
- Must return Health Score > 80.
- If below 80, investigate and fix before marking task complete.
- Document health score in exit report.

**B3.2** State Awareness
- Update `agent_states/{role}_state.yml` upon task completion.
- Fields: status (ACTIVE/IDLE), last_task, timestamp, results.

---

### B4. Exit Sequence (Mandatory)

Every agent session MUST conclude with:

```yaml
1_log: "Append action summary to `docs/agents/logs/{role}_agent.log`"
2_state: "Update `agent_states/{role}_state.yml` (status: IDLE)"
3_report: "Output final status to user in Bulgarian"
```

Example:
```
✅ Готово

**Промени:**
- apps/extension/src/utils/sync.ts — added batch sync optimization
- packages/validation/schemas/chat.ts — added timestamp validation

**Тестов резултат:** pnpm verify = 87/100

**Следващи стъпки:** 
- Deploy to staging for QA
- Monitor health scores in production

**Рискове:**
- Batch operations may timeout on slow networks — monitor logs
```

---

## 📄 PART C: Mandatory Documents (To Be Created/Located)

These files are referenced but not yet centralized:

| File | Purpose | Status |
|------|---------|--------|
| `PRODUCT.md` | Product vision, scope, what we build for whom | ❌ TODO |
| `ARCHITECTURE.md` | Layer diagram, component isolation, data flow | ❌ TODO |
| `CODE_GUIDELINES.md` | Naming conventions, file structure, patterns | ❌ TODO |
| `SECURITY.md` | Auth, RLS, secrets, validation, API security | ❌ TODO |
| `FEATURE_TEMPLATE.md` | Checklist for new feature PRs | ❌ TODO |
| `knowledge_graph.json` | Node-based decision reference (Agent use) | ❌ TODO |
| `meta_architect/profiles/*.yml` | Agent role definitions (Agent use) | ❌ TODO |
| `.agent/skills/meta_architect/SKILL.md` | Operational kernel for agents (Agent use) | ❌ TODO |

---

## 🔄 Rule Versioning & Updates

- **Current Version:** 3.1.0 (2026-02-25)
- **Next Update:** When any rule changes or new standard is adopted.
- **Change Process:**
  1. Edit this file.
  2. Bump version number.
  3. Update timestamp.
  4. Regenerate derived files (`.cursorrules.md`, etc.) if automation is set up.
  5. Create PR, review, merge.

---

## 📞 Feedback & Questions

- Rule unclear? → Open issue with context and question.
- Found violation in codebase? → Document and create task.
- Suggest new rule or modification? → Propose in discussion.

```

---

## 🚀 Implementation Steps (Next)

1. **Save this audit report** to version control as a record.
2. **Create `/docs/guidelines/CONSOLIDATED_RULES.md`** (copy consolidated document above).
3. **Mark old files as deprecated** with note pointing to consolidated rules.
4. **Add to CI:** Lints to catch `console.log`, cross-app imports, etc.
5. **Create missing mandatory docs** (PRODUCT, ARCHITECTURE, etc.).

---

**End of Audit Report**
