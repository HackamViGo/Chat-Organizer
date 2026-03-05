---
agent: DB_ARCHITECT
---

# DB_ARCHITECT migration steps

## Schema Lifecycle & Migrations
- **Golden Rule:** Never modify existing migrations. Create new timestamped files (`YYYYMMDDHHMMSS_description.sql`).
- **Workflow:** 
  1. Draft SQL (Use `prisma` or `supabase-mcp` where available).
  2. Verify RLS.
  3. Regenerate types: `pnpm db:gen` in `@brainbox/database`.
  4. Update `DATABASE_SCHEMA.md`.
