---
description: 
---

# Workflow: Create New API Endpoint

1. Ask:
   - "Full API path? (e.g., /api/prompts)"
   - "HTTP methods? (GET, POST, PUT, DELETE)"
   - "Primary responsibility?"

2. Create: apps/dashboard/src/app/api/[path]/route.ts

3. Route structure (Next.js App Router):
   - Import createRouteHandlerClient from @supabase/auth-helpers-nextjs
   - Import NextRequest, NextResponse
   - Import Zod schema from '@brainbox/validation' (NEVER inline)
   - Rate limiting via headers check
   - Auth: const { data: { session } } = await supabase.auth.getSession()
   - If !session → return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
   - Parse + validate input with Zod schema
   - Query Supabase filtered by user_id (Guideline B.4)
   - Return: NextResponse.json({ data, error: null })

4. Zod schema:
   - Check packages/validation/schemas/ for existing schema
   - If missing → create it there, export from packages/validation/index.ts
   - NEVER define z.object() inline in route.ts (zod_schema_locator will catch it)

5. Security checklist:
   □ Server-side Supabase client used (not client-side)
   □ session check present
   □ user_id filter in every query (Guideline B.4)
   □ Zod validation before any DB operation
   □ No z.object() inline in route.ts

6. After creating, run the Zod guardian:
   python3 .agent/tools/guardians/zod_schema_locator.py

7. Report:
   - File path created
   - Schema location (new or existing)
   - Guardian result: ✅ or ❌