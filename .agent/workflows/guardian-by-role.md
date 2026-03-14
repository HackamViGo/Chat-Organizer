---
description: 
---

# Workflow: Run Guardians for Current Role

1. Ask: "Which agent role are you acting as?"
   Valid roles:
   - ENV_ENGINEER      → runs: sync, janitor
   - DASHBOARD_BUILDER → runs: zod, janitor
   - EXTENSION_BUILDER → runs: sync, janitor
   - BRAINBOX_AUDITOR  → runs: sync, janitor, zod (ALL)
   - QA_EXAMINER       → runs: sync, zod

2. Run:
   python3 .agent/tools/guardians/guardian.py --role [ROLE]

3. Report results same as /run-guardians.