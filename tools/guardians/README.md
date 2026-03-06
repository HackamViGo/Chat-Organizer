# 🛡️ Guardians System — Agentic Security & Rule Enforcement

**Version:** 1.0.0  
**Status:** ACTIVE  
**Deadline:** 2026-03-13 (1 week)  
**Main Directory:** `tools/guardians/`

## 🧩 Overview for Agents

This system is a set of autonomous Python guardians designed to enforce **BrainBox Core Rules**.
As an agent, you MUST run these guardians before any significant commit or merge to ensure system integrity.

## 📜 Active Guardians

### 1. `package_sync_checker.py` (Dependency Watchdog)

- **Goal:** Ensures version parity across the monorepo.
- **Logic:** Compares `package.json` files in root, `apps/`, and `packages/`.
- **Specialty:** Traces logic-bound dependencies that can cause runtime "bombs" (e.g., mismatched shared package versions).

### 2. `brainbox_strict_janitor.py` (Rule #0 & #1 Scream)

- **Goal:** File system hygiene.
- **Action:** **READ-ONLY**.
- **Behavior:** If it detects `package-lock.json` or `.md` files in wrong places, it will flood the terminal with loud warnings and countdowns.
- **Rule Enforcement:** Does NOT move or delete files. YOU must fix it manually.

### 3. `zod_schema_locator.py` (Rule #3 Auditor)

- **Goal:** Enforce centralized validation.
- **Action:** Scans API routes for inline `z.object()` definitions.
- **Requirement:** All schemas must be imported from `@brainbox/validation`.

### 4. `guardian.py` (Master Orchestrator)

- **Usage:** `python3 tools/guardians/guardian.py --role [ROLE]`
- **Function:** Runs a specific set of checks tailored to your current role.

## 📝 Logging Protocol

All guardians log their findings in `tools/guardians/guardians.log`.
When resolving a guardian error, you MUST update the log entry with the `Action` you took.

**Format:**

```
Agent: [ROLE_NAME]
Date: [YYYY-MM-DD HH:MM]
Guardian: [script_name.py]
Error: [Description of the captured issue]
Cause: [Why this happened]
Action: [Detailed steps taken by the agent to fix it]
```

## ⚠️ Integrity Rule

- Any error captured by a guardian must be resolved before `git push`.
- Errors in the guardian scripts themselves must be logged and fixed immediately.

---

_Generated for BrainBox Guardians — Proactive Rule Enforcement Framework._
