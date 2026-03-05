---
agent: BRAINBOX_AUDITOR
---

# Run full BRAINBOX_AUDITOR verification cycle

## The Exit Protocol (Rule #10) Enforcement
- **Execution:** No task is complete without log updates. Check for YAML and Log file updates across all roles.
- **Vercel:** Verify build status on every deployment (Use `vercel-mcp`).
- **Integrity:** Ensure synchronization between `agent_states/` and `docs/agents/logs/`.

## Failure Analysis & System Integrity
- **Verification:** Run `pnpm verify` and audit the quality gate (Target: > 80%).
- **E2E:** Monitor Playwright results. Run specific specs logic for regressions.
- **Sync:** Detect and repair broken relationships in `ProjectGraph.json`.

## Change Management (Cross-Role Notifications)
- **Alerts:** Ensure `CHANGES.log` is appended when cross-role dependencies are affected.
- **Example:** Notify `DB_ARCHITECT` if `DASHBOARD_BUILDER` changes a data fetch pattern.
