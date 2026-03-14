---
description: 
---

# Workflow: Check Dependency Sync

1. Run:
   python3 .agent/tools/guardians/package_sync_checker.py

   Checks these packages for version parity:
   - root package.json
   - apps/dashboard, apps/extension, apps/extension_v3
   - packages/shared, validation, ui, database

   Also checks: @brainbox/shared exports validation without zod in dependencies
   (the "Logic Bomb" check)

2. For each mismatch found:
   - VERSION MISMATCH → update the app's package.json to match root version
   - MISSING FROM ROOT → add the dependency to root package.json
   - LOGIC BOMB → add zod to packages/shared/package.json dependencies

3. After fixes, run the checker again to confirm clean:
   python3 .agent/tools/guardians/package_sync_checker.py

4. Report: ✅ SUCCESS or list remaining issues.