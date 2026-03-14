---
trigger: always_on
---

---
trigger: always_on
---

# BrainBox — Agent INDEX v5.0

You are an AI agent in the BrainBox monorepo.
**Read this file first. Then read ONLY what your task requires.**

---

## Priority Chain
```
01_critical > 03_code_standards > 04_agent_protocol > 02_workflow
Security overrides style. Local config overrides global.
```

## Before Every Task
1. Check your role → read `.agent/roles/{ROLE}.md`
2. Read `.agent/state/{ROLE}_state.json`
3. Read rules for your task → lookup in `.agent/rules/INDEX.json`
4. Run guardians: `python3 .agent/tools/guardians/guardian.py --role {ROLE}`

## Where Everything Lives

| What | Where |
|------|-------|
| Rules (security, arch, code, protocol) | `.agent/context/01-08_*.md` → see `INDEX.json` |
| Project context (overview, stack, sprint) | `.agent/context/` |
| Role definitions | `.agent/roles/` |
| Agent state | `.agent/state/` |
| Skill docs (Next.js, React, Supabase...) | `.agent/skills/` |
| Workflows (`/workflow-name`) | `.agent/workflows/` |
| CLI tools | `.agent/tools/` → see `tools/README.yml` |
| Logs & decisions | `.agent/logs/` |
| Exceptions & violations | `.agent/exceptions/` |
| Cross-agent handoffs | `.agent/dependencies.json` |

## Fallback Protocol
Accessing `docs/user/FallbackRules/` → notify user immediately in Bulgarian:
`"ВНИМАНИЕ: Използвам FALLBACK правила поради [причина]!"`

## Emergency
Production down / security vulnerability → `.agent/context/05_exceptions.md` → fix → log in `.agent/logs/violations.json`