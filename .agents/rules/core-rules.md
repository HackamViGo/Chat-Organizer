---
trigger: always_on
---

# BrainBox - AI Agent Rulebook & Coding Standards
**Version**: 3.1.0 | **Enforced by**: Supreme Meta-Architect

Any AI agent or developer modifying this codebase MUST adhere to these strict rules. Violations will result in rejected PRs and failed CI pipelines.

## 1. Monorepo & Tooling Rules
- **Package Manager**: ONLY use `pnpm`. NEVER use `npm install` or `yarn`. If you see a `package-lock.json`, delete it immediately.
- **Dependencies**: All shared dependencies (React, Zod, Lucide) MUST be hoisted to the root `package.json`. Do not install them locally in `apps/*` unless strictly necessary.
- **Cross-Boundary Imports**: `apps/extension` MUST NEVER import directly from `apps/dashboard`. All shared logic must go through `@brainbox/shared` or `@brainbox/validation`.

## 2. State Management (Zustand)
- **Strict `useShallow`**: NEVER destructure directly from a Zustand store in a React component (e.g., `const { chats } = useChatStore()`). You MUST use `useShallow` to prevent mass re-renders: `const chats = useChatStore(useShallow(s => s.chats))`.
- **True Optimistic Updates**: When mutating data via API, update the local Zustand state FIRST, await the API call, and REVERT the state in the `catch` block if it fails. Do not update state only on failure.

## 3. Data Validation & Schemas
- **No `any`**: The use of `z.any()` or TypeScript `any` is strictly forbidden. 
- **Single Source of Truth**: All Zod schemas MUST live in `@brainbox/validation`. API routes must parse incoming requests using these schemas before touching the database.

## 4. Security & Logging
- **No `console.log`**: Do not use `console.log` in production code. Use the centralized `logger.debug()` or `logger.error()` from `@/lib/logger`.
- **RLS Enforcement**: All Supabase database interactions must assume Row Level Security (RLS) is active. Never bypass RLS unless using the Service Role Key in a secure, server-only context.