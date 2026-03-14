---
description: 
---

# Workflow: Rollback to Checkpoint

1. Ask: "Checkpoint ID to rollback to?"
   Options:
   - Specific ID (e.g., abc123def)
   - "last" → rolls back to most recent checkpoint
   - A number N → rolls back N checkpoints

2. Preview first (shows score diff without applying):
   Launch: pnpm agent:score
   Type: preview <checkpoint_id>
   Review the delta for each field (total_score, level, streak, etc.)

3. Ask: "Confirm rollback? Changes after this checkpoint will be discarded."

4. If confirmed:
   python3 .agent/tools/scoring/agent_cli.py rollback <checkpoint_id>

   OR for "last":
   In pnpm agent:score CLI → type: rollback last

5. Report:
   - What checkpoint was restored
   - How many events were discarded
   - New score + level
