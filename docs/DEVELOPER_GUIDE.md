# BrainBox - Developer Guide

## 1. Project Overview

BrainBox (v3.1) is an AI Chat Organizer that operates as a production-ready application. It consists of two main parts:

- **Dashboard:** A Next.js 14 application for managing chats.
- **Extension:** A Chrome Extension (MV3) for AI interaction management, designed to capture and send AI conversations to the Dashboard.

The project utilizes a monorepo structure managed by `pnpm` and `Turborepo`.

## 2. Architecture

The BrainBox system is built upon three core layers, with strict communication protocols:

┌─────────────────────────────────────────────────────────┐
│  Chrome Extension (apps/extension)                       │
│  Captures data. No UI state. No business logic.         │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP API (Bearer JWT)
                        │ Only this path. No exceptions.
┌───────────────────────▼─────────────────────────────────┐
│  Dashboard — Next.js (apps/dashboard)                    │
│  Displays data. Manages UI state. Contains business logic.│
└───────────────────────┬─────────────────────────────────┘
                        │ Supabase SDK (RLS)
┌───────────────────────▼─────────────────────────────────┐
│  Supabase (PostgreSQL + Auth + Storage + Realtime)        │
│  Single source of truth. Enforces ownership via RLS.      │
└─────────────────────────────────────────────────────────┘

### 2.1. Chrome Extension (`apps/extension`)

- **Role:** Passive observer. Captures AI conversations and sends them to the Dashboard API.
- **What it does:** Observes AI platform network traffic, extracts auth credentials for background API calls, normalizes responses to canonical `Chat` schema, maintains a local sync queue (`chrome.storage.local`), communicates with Dashboard via HTTP API with Bearer JWT.
- **Rate Limiting:** Integrated Token Bucket (e.g., ChatGPT: 60 RPM, Dashboard: 100 RPM for client-side, but Dashboard server limits to 30 RPM for extension sync).
- **What it does NOT do:** Contains no business logic, does not store UI state outside the popup, does not write directly to Supabase, does not import code from `apps/dashboard`, does not modify AI platform DOM (except for prompt inject UI).
- **Internal Organization:** `service-worker.ts` (coordinator), `background/modules/` (specialized modules), `background/modules/platformAdapters/`, `content/`, `lib/`.
- **Supported Platforms:** ChatGPT, Claude, Gemini, DeepSeek, Grok, Perplexity, Qwen, LMArena.

### 2.2. Dashboard (Next.js - `apps/dashboard`)

- **Role:** Command center. Displays, organizes, and enriches data.
- **What it does:** Server-side API routes for mutations, Supabase SSR auth. Client-side Zustand stores for UI state, Realtime subscriptions. AI enrichment (summaries, tags). Accepts data from Extension via secure API routes.
- **What it does NOT do:** Contains no Extension logic, does not communicate directly with Extension, does not expose Supabase credentials to the client.
- **Layers:** `middleware.ts` (auth guard, CORS, rate limiting), `app/api/**/route.ts` (API, Zod validation, Supabase), `store/*.ts` (Zustand, UI state, optimistic updates), `lib/services/sync-batch.service.ts` (batches API requests), `components/` (React components).
- **Layer Rule:** Logic flows downwards. Components do not call Supabase directly. Stores do not render UI. API routes do not import from stores.

### 2.3. Supabase

- The single source of truth for all data. Enforces ownership and security via Row Level Security (RLS).

### 2.4. Shared Packages (`packages/`)

Monorepo packages accessible in both applications via `@brainbox/*` imports:

- `@brainbox/shared`: TypeScript types, utility functions, constants.
- `@brainbox/validation`: Zod schemas – single source of truth for validation.
- `@brainbox/database`: Supabase generated TypeScript types.

## 3. Development Guidelines

### 3.1. Mandatory Reading

Before starting any task, consult these critical documents:

1. `.agent/rules/core-rules.md`: Core rules, file discipline, package manager, architectural boundaries, type safety, security, logging, state management.
2. `docs/Mandatory!/ARCHITECTURE.md`: Detailed architecture, layers, communication.
3. `docs/Mandatory!/CODE_GUIDELINES.md`: Coding standards, TypeScript, Zod validation.
4. `docs/Mandatory!/SECURITY.md`: RLS policies, authentication, data protection.
5. `docs/Mandatory!/AI_BEST_PRACTICES_GUIDE.md`: Comprehensive guide for AI agents on various best practices (DOM, React, Tailwind, Supabase, Next.js, Chrome Extension, Testing, etc.).

### 3.2. Code Guidelines

- **TypeScript:**
  - `any` is **forbidden**. Use `unknown` with type guards.
  - All types must be explicit.
  - Use types from `@brainbox/shared` and centralize app-specific types in `apps/dashboard/src/types/` and `apps/extension/src/types/`.
  - Avoid `// @ts-ignore` and `// @ts-expect-error` without explicit comments.
  - Explicitly type return values for `async` functions.
- **Validation (Zod):**
  - All incoming data from external sources **must** pass through Zod validation. No exceptions.
  - Zod schemas reside in `@brainbox/validation/schemas/`. No inline schemas in API routes.
  - Validate API route bodies, Extension data, URL parameters, and environment variables.
  - Avoid `z.any()` in Zod schemas.
- **Logging & Debug:**
  - No `console.log` in production. Use `logger.ts`.
  - `DEBUG_MODE` must be `false` before any commit to `main`.
- **State Management (Zustand):**
  - `useShallow` is mandatory for Zustand destructuring.
  - All persist keys (storage keys) must follow the format `brainbox-{entity}-store`.
  - Implement optimistic updates: snapshot -> update -> API call -> rollback on error.

### 3.3. File Discipline

- All `.md` and `.txt` files reside **only** in `docs/`, except `README.md` in package/app roots.
- Rules files are in `.agent/rules/` and `.cursorrules`.
- `pnpm-lock.yaml` in root is correct. `package-lock.json` must be deleted if found.

### 3.4. Package Manager

- Only `pnpm` is allowed. Never `npm install` or `yarn`.
- All dependencies should be hoisted to the root `package.json`.

### 3.5. Architectural Boundaries

- `apps/extension` never imports from `apps/dashboard`.
- `apps/dashboard` never imports from `apps/extension`.
- Shared logic goes only through `packages/`.
- New architectural layers require approval.

## 4. Security Considerations

- **Row Level Security (RLS):**
  - Mandatory for every table with user data. This is the last line of defense.
  - Every new table requires a migration with RLS policies.
- **Authentication:**
  - **Dashboard:** Managed by Supabase Auth; `middleware.ts` checks sessions; API routes verify `user` object independently. `user_id` comes **only** from `auth.getUser()` server-side.
  - **Extension:** JWT token stored encrypted in `chrome.storage.local`. Token passed as `Authorization: Bearer <token>` to Dashboard API.

## 5. Git Protocol

- Always branch from `dev` (`git checkout dev && git pull`).
- Use `feature/<name>` or `fix/<name>` for branch names. No direct pushes to `main`/`dev`.
- Push **only** feature branches. PRs **must** target `dev`.
- Commits are allowed **only** after `pnpm verify` with a result > 80 (except `docs`-only changes).
- `git commit --no-verify` is allowed for hotfixes but requires a comment explaining why.

## 6. Tooling Setup

The project uses:

- Husky & `lint-staged` for Git hooks.
- ESLint & Prettier for code quality and formatting.
- `commitlint` for Conventional Commits.
- GitHub Actions for CI/CD.

Refer to `docs/Mandatory!/TOOLING_SETUP_PROMPT.md` for detailed agent instructions on setting up and verifying these tools.
