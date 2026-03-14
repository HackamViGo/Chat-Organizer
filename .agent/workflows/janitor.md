---
description: 
---

# Workflow: Run Strict Janitor

1. Run:
   pnpm agent:janitor
   (or: python3 .agent/tools/guardians/brainbox_strict_janitor.py)

   The janitor checks:
   - FORBIDDEN LOCK FILES: package-lock.json, yarn.lock anywhere (not in node_modules)
   - STRAY .MD FILES: any .md outside docs/ except README.md at package/app root
     (Exceptions: .cursor/, .agent/, .agents/, .github/ are ignored)
   - FOLDER INTEGRITY: agent_states/ and docs/agents/roles/ count vs inventory.json

   WARNING: The janitor SCREAMS (10x red messages) if violations found.
   It then waits 10 seconds before exiting.

2. For each violation:
   - FORBIDDEN LOCK FILE → delete it: rm package-lock.json (or yarn.lock)
   - STRAY .MD FILE → move to docs/ or delete if obsolete
   - FOLDER INTEGRITY → update .agent/tools/automators/inventory.json counts

3. Run again to confirm clean:
   pnpm agent:janitor

4. Report: "✅ JANITOR: System hygiene is perfect." or list remaining issues.

NOTE: The new .cursor/workflows/ .md files are automatically excluded
(the janitor ignores .cursor/ paths).
