---
description: 
---

# Workflow: Run System Guardians

1. Assume role: BRAINBOX_AUDITOR
2. Run from project root:
   python3 .agent/tools/guardians/guardian.py --all

   This runs in sequence:
   - package_sync_checker.py  → dependency drift check
   - brainbox_strict_janitor.py → stray .md files + forbidden lock files
   - zod_schema_locator.py    → inline Zod schemas in API routes

3. Read output carefully.
4. If all pass → report:
   "✅ ALL GUARDIANS SATISFIED. System integrity is confirmed."
5. If any fail → report:
   "❌ GUARDIAN ALERT! Issues detected:"
   List every error line from the output.
6. Check .agent/logs/guardians.log for the full log entry.
7. DO NOT proceed with any other task until all guardians pass.