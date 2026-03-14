---
description: 
---

# Workflow: Test Service Connections

1. Ensure dev servers are running:
   - Extension v3 dev:  pnpm --filter apps/extension_v3 dev  (port 5173)
   - Dashboard dev:     pnpm --filter apps/dashboard dev      (port 3000)
   - Extension legacy:  pnpm --filter apps/extension dev      (port 3001 if configured)

2. Run:
   node .agent/tools/automators/test-connection.js

   Tests: localhost:5173, localhost:3000, localhost:3001

3. Report which are UP (SUCCESS) and which are DOWN (FAILED).
4. If a service is DOWN, suggest the start command.

NOTE: Requires playwright to be installed:
  pnpm add -D playwright
  npx playwright install chromium