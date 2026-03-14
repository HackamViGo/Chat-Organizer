# 02 — Workflow Rules

Priority: HIGH — Git, PR, Env, Verification standards.

## Git
- Never push directly to `main` or `dev`. Branch from `dev`.
- PRs to `dev` → squash-merge only.
- Atomic commits — commit after every logical sub-step.

## Environment
- `.env` must never be committed.
- Switch envs manually: `cp .env.prod .env`. No auto-scripts.

## Verification (before every commit)
```bash
pnpm lint         # must pass
pnpm type-check   # 0 errors (tsc --noEmit)
pnpm test         # must pass
```
Verify score > 80 before merge.

## Documentation
- Every TODO must reference an issue: `TODO(#123)`.
- All `.md` files → `docs/` only. No `.md` in `apps/`, `packages/`, or root.
  Exceptions: `README.md` at package root, `.agent/`, `.cursor/`, `.github/`.
