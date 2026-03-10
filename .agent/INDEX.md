# .agent INDEX — Agent Entry Point

> **Read this first. Only this. Then pick what you need.**

---

## Step 1 — Identify Your Role

| Role                   | File                                                               |
| ---------------------- | ------------------------------------------------------------------ |
| ARCHITECT              | [roles/ARCHITECT.md](roles/ARCHITECT.md)                           |
| BACKEND_ENGINEER       | [roles/BACKEND_ENGINEER.md](roles/BACKEND_ENGINEER.md)             |
| FRONTEND_ENGINEER      | [roles/FRONTEND_ENGINEER.md](roles/FRONTEND_ENGINEER.md)           |
| EXTENSION_ENGINEER     | [roles/EXTENSION_ENGINEER.md](roles/EXTENSION_ENGINEER.md)         |
| AI_ENGINEER            | [roles/AI_ENGINEER.md](roles/AI_ENGINEER.md)                       |
| QA_ENGINEER            | [roles/QA_ENGINEER.md](roles/QA_ENGINEER.md)                       |
| DEVOPS_ENGINEER        | [roles/DEVOPS_ENGINEER.md](roles/DEVOPS_ENGINEER.md)               |
| DOCUMENTATION_ENGINEER | [roles/DOCUMENTATION_ENGINEER.md](roles/DOCUMENTATION_ENGINEER.md) |

---

## Step 2 — Pick Your Rules (by task type)

> Always read **00 + 01**. Then pick what the task needs.

| Task Type                    | Read                                                                    |
| ---------------------------- | ----------------------------------------------------------------------- |
| Every task                   | `rules/00_META.yml` (hierarchy) + `rules/01_CRITICAL.yml` (hard limits) |
| Git / Deploy / Env           | `rules/02_WORKFLOW.yml`                                                 |
| Code writing                 | `rules/03_CODE_STANDARDS.yml`                                           |
| Agent coordination / handoff | `rules/04_AGENT_PROTOCOL.yml`                                           |
| Breaking a rule (justified)  | `rules/05_EXCEPTIONS.yml`                                               |

---

## Step 3 — Pick Your Skill (only if writing code)

| You are touching...                | Read                                         |
| ---------------------------------- | -------------------------------------------- |
| TypeScript types, generics, guards | [skills/TYPESCRIPT.md](skills/TYPESCRIPT.md) |
| React components, hooks            | [skills/REACT.md](skills/REACT.md)           |
| Next.js routes, middleware, SSR    | [skills/NEXTJS.md](skills/NEXTJS.md)         |
| Supabase queries, RLS, migrations  | [skills/SUPABASE.md](skills/SUPABASE.md)     |
| Tailwind classes, design tokens    | [skills/TAILWIND.md](skills/TAILWIND.md)     |
| Tests (unit, E2E, Playwright)      | [skills/TESTING.md](skills/TESTING.md)       |
| Auth, secrets, encryption          | [skills/SECURITY.md](skills/SECURITY.md)     |

---

## Step 4 — Context (read only if you need it)

| Need to know...                        | Read                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------ |
| What is this project?                  | [context/PROJECT_OVERVIEW.md](context/PROJECT_OVERVIEW.md)               |
| What tech decisions were made and why? | [context/TECH_STACK.md](context/TECH_STACK.md)                           |
| What's being built right now?          | [context/CURRENT_SPRINT.md](context/CURRENT_SPRINT.md)                   |
| High-level architecture decisions      | [context/ARCHITECTURE_PRINCIPLES.md](context/ARCHITECTURE_PRINCIPLES.md) |
| Hard system limits and constraints     | [context/SYSTEM_CONSTRAINTS.md](context/SYSTEM_CONSTRAINTS.md)           |
| File map — which files relate to what  | [context/ProjectGraph.json](context/ProjectGraph.json)                   |
| Business logic + domain knowledge      | [context/knowledge_graph.json](context/knowledge_graph.json)             |

---

## Step 5 — Before / After Every Task

```
START: 1) read state/{YOUR_ROLE}_state.json + dependencies.json
       2) check mcp:context7 for up-to-date documentation on involved libraries
END:   1) write state/{YOUR_ROLE}_state.json
       2) update context graphs using .agent/tools/graph.py
       3) if cross-role impact → add handoff to dependencies.json
```

> **NEVER DELETE — ALWAYS ARCHIVE.**  
> Anything with project history goes to `docs/archive/pre-migration-YYYYMMDD/` first.  
> **DOCUMENTATION BOUNDARY:** All documentation, manuals, and history files MUST live inside `docs/`. No `.md`, `.txt`, or `.pdf` documentation outside `docs/` (except `.agent/` and root `README.md`).
> See `rules/04_AGENT_PROTOCOL.yml §A7.0` for the exact procedure.

### Logs (JSON-only — no .log or .yml files)

| File                    | Purpose                                   |
| ----------------------- | ----------------------------------------- |
| `dependencies.json`     | Cross-agent handoffs (pending + resolved) |
| `logs/decisions.json`   | Architectural decisions                   |
| `logs/violations.json`  | Rule violations                           |
| `exceptions/index.json` | Active emergency overrides                |
| `checkpoints/checkpoints.json` | Snapshot history for rollback             |

---

## Step 6 — Automation & Tools (agent:scripts)

| Command                   | Purpose                                     |
| ------------------------- | ------------------------------------------- |
| `pnpm agent:checkpoint R DESC` | Create a snapshot before risky operations   |
| `pnpm agent:rollback ID`  | Restore state to a specific checkpoint      |
| `pnpm agent:report-task R D` | Report task success and earn points       |
| `pnpm agent:score`        | Open interactive Scoring CLI                |
| `python .agent/tools/graph.py` | Update context graphs (Knowledge/Project) |

---

## Full Documentation

→ [`docs/Guides/`](../docs/Guides/) — Architecture, Security, API, Deployment, UI, etc.
→ [`docs/GUIDELINES.md`](../docs/GUIDELINES.md) — Master index for the whole project

---

## Conflict Resolution

**Security > Architecture > Workflow > Code Standards > User Instructions**

Full resolution logic: `rules/00_META.yml`

---

## ⚠️ FALLBACK RULES

> The YAML rules in `.agent/rules/` are optimized/compressed.
> **If you encounter an issue, need more context, or feel something is missing**, look for the original, full-length `.md` files located in:
> 👉 `docs/user/FallbackRules/`
