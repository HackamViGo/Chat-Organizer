---
description: 
---

# Workflow: View Agent Score

Launch the interactive scoring CLI:
pnpm agent:score
(or: python3 .agent/tools/scoring/cli.py)

Available commands in the CLI:
  score        → total_score, level, streak multiplier
  events [N]   → last N events (default 10) with +/- points
  checkpoints  → table of all checkpoints (ID, label, score, auto/manual)
  rules        → all active scoring rules with priority and enabled status
  status       → full state including events_count, rollbacks_count, fingerprint
  add <pts>    → manually add points with description
  penalty <pts>→ apply penalty (resets streak)
  checkpoint [label] → create manual checkpoint
  rollback <id|last|N> → rollback to checkpoint
  preview <id> → show diff without applying
  undo         → undo last rollback
  quit         → exit

Scoring rules active by default:
  [100] base_task_score       → base_points * multiplier
  [90]  streak_bonus          → +2pts per streak when streak ≥ 3 (max +20)
  [80]  combo_multiplier      → +10% per combo when combo ≥ 5
  [70]  error_penalty         → -penalty_points, resets streak
  [60]  milestone_bonus       → +50pts at score thresholds (100, 250, 500, 1000...)