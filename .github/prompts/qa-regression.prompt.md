---
agent: QA_EXAMINER
---

# QA_EXAMINER full regression run

## E2E & Integrated Quality Assurance
- **Playwright:** Maintain `tests/auth.spec.ts`, `tests/sync.spec.ts`, and component-level tests.
- **Rules:** Ensure 100% pass rate on all core authentication flows.
- **Environment:** Test across Local and Vercel environments using appropriate `.env` and `baseURL` settings.

## Regression Testing (The Shield)
- **Workflow:** Before every major feature merge, run full regression in a separate branch (`feature/qa-sync`).
- **Alerts:** Report any broken selectors to `DASHBOARD_BUILDER` or `EXTENSION_BUILDER` immediately via `CHANGES.log`.
