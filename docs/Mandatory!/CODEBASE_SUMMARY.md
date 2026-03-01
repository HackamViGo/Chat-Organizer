<!-- doc: CODEBASE_SUMMARY.md | version: 1.0 | last-updated: 2026-02-28 -->
# 🗺️ CODEBASE_SUMMARY.md — Workspace Map

> **Обновен:** 2026-02-28 | **Роля:** DOCS_LIBRARIAN
> Quick-reference за структурата на monorepo-то. За архитектурни детайли виж [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Workspace Map

| Workspace | Path | Purpose | Tech | Health |
|-----------|------|---------|------|--------|
| `dashboard` | `apps/dashboard/` | Next.js web app — команден център | Next.js 14, Zustand, Shadcn, Tailwind v4 | ✅ |
| `extension` | `apps/extension/` | Chrome MV3 extension — пасивен наблюдател | Vite 5, CRXJS, Tailwind v4, AES-GCM | ✅ |
| `shared` | `packages/shared/` | TypeScript types, utils, AI services | TypeScript | ✅ |
| `validation` | `packages/validation/` | Zod schemas — единствен source of truth | Zod, Vitest (100% target) | ✅ |
| `database` | `packages/database/` | Auto-generated Supabase types | TypeScript (auto-gen) | ✅ |
| `ui` | `packages/ui/` | Design tokens (CSS variables) | CSS | ✅ |
| `assets` | `packages/assets/` | AI platform icons | SVG/PNG | ✅ |
| `config` | `packages/config/` | Shared build config (legacy shell) | TS/PostCSS | ✅ |

---

## Key Entry Points

| File | Workspace | Роля |
|------|-----------|------|
| `apps/dashboard/src/middleware.ts` | dashboard | Auth guard + CORS |
| `apps/extension/src/background/service-worker.ts` | extension | Extension main process |
| `packages/shared/src/logic/promptSync.ts` | shared | Prompt sync logic |
| `packages/validation/index.ts` | validation | Schema exports |
| `packages/ui/index.css` | ui | Design token entry |

---

## Critical Config Files

| `turbo.json` | Turborepo pipeline (НЕ пипай без одобрение) |
| `pnpm-workspace.yaml` | Workspace definition |
| `apps/extension/manifest.json` | Chrome manifest (НЕ пипай без одобрение) |

## 📎 Related Documents
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DOC_INVENTORY.md](./DOC_INVENTORY.md)
- [EXTENSION.md](./EXTENSION.md)
- [DASHBOARD.md](./DASHBOARD.md)
