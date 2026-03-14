# 01 — Critical Rules

Priority: CRITICAL — Non-negotiable security and architecture constraints.

## Security
- **NO_CLIENT_SECRETS** — Never expose API keys (Supabase service role, Gemini) to the client. Use server routes.
- **USER_ID_SOURCE** — `user_id` must come from `auth.getUser()` server-side only. Never from request body.
- **RLS_MANDATORY** — Row Level Security must be enabled and enforced on ALL Supabase tables.

## Type Safety
- **NO_ANY** — `any` is forbidden. Use `unknown` with type guards.
- **ZOD_SCHEMAS** — All validation uses Zod from `@brainbox/validation`. Never inline in API routes.

## Architecture
- **STRICT_BOUNDARIES** — Extension cannot import from Dashboard. Dashboard cannot import from Extension. Share via `packages/`.
- **PNPM_ONLY** — Only `pnpm`. Delete `package-lock.json` or `yarn.lock` on sight.
- **MV3_ONLY** — Manifest V3. Service worker mandatory. No `localhost` in production manifest.

## Communication
- **REPORT_TOOL_FAILURE** — MCP or external service fails → report to user immediately in Bulgarian.
