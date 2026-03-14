---
description: 
---

# Workflow: Report Completed Task

Run:
pnpm agent:report-task [ROLE] "[DESCRIPTION]" [--difficulty N]

Examples:
  pnpm agent:report-task BACKEND "Created /api/prompts endpoint" --difficulty 2
  pnpm agent:report-task EXTENSION_BUILDER "Phase 1 Gemini save complete" --difficulty 3

Difficulty scale:
  1 = trivial (config change, typo fix)
  2 = minor (single function, small fix)
  3 = moderate (new feature, multi-file)
  4 = significant (new system, complex refactor)
  5 = major (full phase, architecture change)

The engine applies:
  base_task_score + streak_bonus (if streak ≥ 3) + milestone_bonus (if threshold crossed)
Reports: points earned + total score + level.