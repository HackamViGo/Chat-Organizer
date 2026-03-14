---
description: 
---

# Workflow: Create Agent Checkpoint

1. Ask: "Current role? (e.g., BACKEND, EXTENSION_BUILDER)"
2. Ask: "Brief description of what was just completed?"

3. Run:
   python3 .agent/tools/scoring/agent_cli.py checkpoint [ROLE] "[DESCRIPTION]"

   This calls ScoringEngine.save_checkpoint() with:
   - label: ROLE_description_with_underscores
   - tags: ["manual", ROLE]
   - Saves to .agent/checkpoints/checkpoints.json

4. Report the checkpoint ID (e.g., cp id=abc123def).
   Tell the user to save it — it can be used for rollback.