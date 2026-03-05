# 🤖 BrainBox Super-Agent Roles

**Version:** 2.1.0 | **Date:** 2026-03-03  
**Concept:** Unified Roles (Who) + Integrated Skills + Shared Technical Logic + MCP.

---

## 🗂️ Super-Agent Directory

### 🎨 The Vision (NEW)
- **`UI_UX_DESIGNER.md`**: Visual Identity, Design System (Tokens), Premium Aesthetics. Handles the "look" of both Dashboard and Extension.

### 🏗️ Infrastructure & Core
- **`ENV_ENGINEER.md`**: Infrastructure, Vercel, Docker, Sync.
- **`DB_ARCHITECT.md`**: Supabase, Migrations, RLS, Type Safety.
- **`DOCS_LIBRARIAN.md`**: Knowledge Graph, Documentation, Mapping.

### 🧩 Feature Builders
- **`DASHBOARD_BUILDER.md`**: Dashboard Logic, Next.js Architecture, State & API Sync.
- **`EXTENSION_BUILDER.md`**: Extension Logic, MV3 sidepanel, **Prompt Engineering** (Merged).
- **`BRAINBOX_AUDITOR.md`**: System Health, Exit Protocol enforcement.
- **`QA_EXAMINER.md`**: E2E Tests, Regressions, Playwright.

---

## 🚀 How to Use

Simply say:
> *"Act as **[Role Name]** for this task."*

**Visual Policy:** All visual changes MUST consult `UI_UX_DESIGNER` for token and naming convention consistency.

---

## 🛠️ MCP Configuration
All agents refer to the MCP configuration at:
`[.cursor/mcp.json]`

**Constraint:** Do not use more than **50 tools** in the MCP list unless absolutely necessary. Propose and ask the USER first.

---
*Created for BrainBox — The ultimate Agentic Infrastructure.*
