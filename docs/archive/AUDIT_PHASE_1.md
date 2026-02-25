# Documentation Audit — Inventory (Phase 1)

| Файл | Описва | Актуален с кода? | Дублира |
|------|--------|-----------------|---------|
| `ARCHITECTURE.md` | Core 3-tier system (Ext, PWA, Supabase) | ✅ | `EXTENSION_ARCHITECTURE.md` |
| `SECURITY.md` | RLS policies, JWT, Zod validation | ✅ | - |
| `CODE_GUIDELINES.md` | Coding standards, state management | ⚠ (any usage) | - |
| `PRODUCT.md` | Project vision, goal and constraints | ✅ | - |
| `SYNC_PROTOCOL.md` | Auth bridge & sync mechanism | ⚠ (Endpoint discrepancy) | - |
| `CONTEXT_MAP.md` | File ownership & system topology | ✅ | - |
| `DATA_SCHEMA.md` | Canonical Message/Chat schema | ✅ | - |
| `EXTENSION_ARCHITECTURE.md` | Low-level extension design | ⚠ (Old) | `ARCHITECTURE.md` |
| `Extension_GAP_ANALYSIS.md` | GAP Analysis between old/new sync | ❌ (Archived) | - |
| `DEEP AUDIT/**/*.md` | Security & integrity audits (Feb 2026) | ✅ | - |
| `project_history_summary.md` | High-level sprint history | ✅ | - |

### Верификация (Доказателства)
1. **ARCHITECTURE.md**: Твърди, че поддържа 8 платформи → Кодът в `apps/extension/src/background/modules/platformAdapters/` потвърждава 8 адаптера (ChatGPT, Claude, Gemini, DeepSeek, Grok, Perplexity, Qwen, LMArena).
2. **SYNC_PROTOCOL.md**: Твърди `POST /api/chats/extension` → Кодът в `dashboardApi.ts:246` реално вика `${API_BASE_URL}/api/chats`. **Discrepancy found.**
3. **CODE_GUIDELINES.md**: Твърди "No any" → `grep` намира 146 инстанции на `: any` в сорс кода (извън тестове и кеш). **Discrepancy found.**
4. **SECURITY.md**: Твърди RLS ownership → Всички Supabase заявки в PWA използват SSR auth context. ✅
