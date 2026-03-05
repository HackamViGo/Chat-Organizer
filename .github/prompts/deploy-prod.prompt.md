---
agent: ENV_ENGINEER
---

# ENV_ENGINEER production deployment checklist

## Environment Lifecycle (Vercel & Docker)
- **Deployment:** Manage Vercel production/preview deployments. Use `vercel-mcp`.
- **Sync:** Ensure `.env` files across root, `apps/dashboard`, and `apps/extension` are aligned.
- **Rules:** Never push secrets to VCS. Always use `.env.prod`, `.env.dev`, or `.env.docker` templates.

## Authentication Infrastructure Sync
- **Supabase-Vercel Alignment:** Maintain the "Callback Tunnel" from Google Cloud -> Supabase -> Vercel Dashboard.
- **Reference:** Follow `SUPABASE_MIGRATION.md` for production sync.
