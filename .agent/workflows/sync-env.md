---
description: 
---

# Workflow: Sync Environment Variables

1. Run:
   python3 .agent/tools/automators/env_vault_syncer.py

   The script compares .env keys to .env.example and adds missing ones
   with placeholder values. It NEVER reads actual values — only key names.

2. If keys were added → report which keys were added to .env.example.
3. If "Vault is perfectly synced" → confirm to user.
4. If .env doesn't exist → report: ".env not found — no sync performed."
5. NEVER print actual .env values. Key names only.