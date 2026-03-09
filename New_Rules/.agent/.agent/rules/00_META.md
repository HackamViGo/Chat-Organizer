---
version: 5.0.0
last_updated: 2026-02-25
authority: ABSOLUTE
---

# Meta Rules — The Constitution

> Това е конституцията на BrainBox. Всички други правила се подчиняват на този документ.

---

## 🎯 Rule Hierarchy (Conflict Resolution)

При конфликт между правила, приоритетът е строго йерархичен:

```
┌─────────────────────────────────────────┐
│  1. CRITICAL (Security, Architecture)   │  ← HIGHEST
├─────────────────────────────────────────┤
│  2. WORKFLOW (Git, DevOps, Environment) │
├─────────────────────────────────────────┤
│  3. CODE_STANDARDS (Style, Conventions) │
├─────────────────────────────────────────┤
│  4. AGENT_PROTOCOL (Logging, State)     │
├─────────────────────────────────────────┤
│  5. User Instructions                   │  ← LOWEST
└─────────────────────────────────────────┘
```

### Примери за резолюция:

**Сценарий 1:** User иска `any` тип за бързина  
**Резолюция:** CRITICAL (Type Safety) > User Instruction → ❌ Отказ

**Сценарий 2:** User иска различен commit формат  
**Резолюция:** WORKFLOW (Git format) > User Instruction → ⚠️ Предупреждение, но може да се override с обяснение

**Сценарий 3:** User иска различен naming convention  
**Резолюция:** CODE_STANDARDS (Low priority) < User Instruction → ✅ Разрешено

---

## 📦 File Ownership Matrix

| Path Pattern                     | Owner Role    | Can Read | Can Modify               | Must Approve                     |
| -------------------------------- | ------------- | -------- | ------------------------ | -------------------------------- |
| `.agent/rules/`                  | ARCHITECT     | All      | ARCHITECT                | ARCHITECT                        |
| `.agent/state/`                  | All Agents    | All      | Owner Agent              | -                                |
| `.agent/dependencies.json`       | All Agents    | All      | All                      | -                                |
| `docs/Guides/`                   | ARCHITECT     | All      | ARCHITECT, DOCUMENTATION | ARCHITECT                        |
| `.agent/roles/`                  | ARCHITECT     | All      | ARCHITECT                | ARCHITECT                        |
| `packages/validation/`           | BACKEND       | All      | BACKEND                  | ARCHITECT (for schema changes)   |
| `packages/shared/`               | All Engineers | All      | Original Author          | ARCHITECT (for breaking changes) |
| `packages/ui/`                   | FRONTEND      | All      | FRONTEND                 | -                                |
| `packages/types/`                | BACKEND       | All      | BACKEND                  | ARCHITECT (for core types)       |
| `apps/dashboard/src/app/api/`    | BACKEND       | All      | BACKEND                  | -                                |
| `apps/dashboard/src/components/` | FRONTEND      | All      | FRONTEND                 | -                                |
| `apps/dashboard/src/store/`      | FRONTEND      | All      | FRONTEND                 | -                                |
| `apps/extension/manifest.json`   | EXTENSION     | All      | EXTENSION                | ARCHITECT, SECURITY              |
| `apps/extension/src/background/` | EXTENSION     | All      | EXTENSION                | -                                |
| `apps/extension/src/content/`    | EXTENSION     | All      | EXTENSION                | -                                |
| `supabase/migrations/`           | BACKEND       | All      | BACKEND                  | ARCHITECT (for breaking changes) |
| `turbo.json`                     | DEVOPS        | All      | DEVOPS                   | ARCHITECT                        |
| `.github/workflows/`             | DEVOPS        | All      | DEVOPS                   | -                                |
| `tests/`                         | QA            | All      | QA, Original Author      | -                                |

### Ownership Legend:

- **Owner:** Primary responsible role
- **Can Read:** Who can view the file
- **Can Modify:** Who can make changes
- **Must Approve:** Required approval for merge

---

## 🔄 Version Control (Rules Versioning)

### Semantic Versioning

```
MAJOR.MINOR.PATCH

MAJOR: Breaking changes (e.g., remove a rule, change hierarchy)
MINOR: New rules or significant updates
PATCH: Clarifications, typo fixes
```

### Change Process

1. **Proposal:** Create RFC in `docs/rfcs/RULE_{ID}_{TITLE}.md`
2. **Discussion:** Minimum 48h for feedback
3. **Vote:** ARCHITECT + affected roles must approve
4. **Implementation:** Update rule file + bump version
5. **Notification:** Broadcast to all agents (update their state)

### Changelog

#### v5.0.0 (2026-02-25) — BREAKING CHANGES

**Added:**

- ✅ Rule hierarchy system
- ✅ File ownership matrix
- ✅ Exception handling protocol
- ✅ Unified state system (JSON instead of YAML+LOG)

**Changed:**

- 🔄 Agent logging simplified (single JSON file per role)
- 🔄 Cross-role communication via `dependencies.json`

**Removed:**

- ❌ Separate `.log` and `.yml` files
- ❌ `brainbox_master.js` references (deprecated)

**Migration Required:**

- [ ] Convert existing YAML states to JSON
- [ ] Merge LOG entries into state history
- [ ] Update agent scripts to use new format

#### v4.1.0 (2026-02-20)

**Added:**

- Initial structured rules framework
- Agent role definitions
- Git workflow standards

---

## 🚨 Emergency Override Protocol

### When to Use

ONLY for situations where following rules would cause:

- Production outage
- Security vulnerability exposure
- Critical data loss
- Legal/compliance violation

### NOT Valid Reasons

- "It's faster this way"
- "I don't like the rule"
- "The tool doesn't support it"
- "We're behind schedule"

### Process

#### Step 1: Document the Emergency

Create: `.agent/exceptions/{YYYY-MM-DD}_{BRIEF-DESCRIPTION}.md`

```markdown
# Emergency Override: {Title}

**Date:** 2026-02-25T15:30:00Z
**Declared by:** {ROLE_NAME}
**Severity:** CRITICAL | HIGH | MEDIUM

## Situation

What is the emergency? What will happen if we don't override?

## Rules Violated

- [ ] CRITICAL: {specific rule number}
- [ ] WORKFLOW: {specific rule number}

## Impact Assessment

- **Users Affected:** {number or "all"}
- **Data at Risk:** {description}
- **Downtime Expected:** {duration}

## Override Actions

What specific violations will occur?

1. Action 1 (violates rule X.Y)
2. Action 2 (violates rule Z.W)

## Safeguards

What temporary measures are in place?

- [ ] Safeguard 1
- [ ] Safeguard 2

## Normalization Plan

How will we return to compliance?

- [ ] Step 1 — Owner: {ROLE} — Deadline: {DATE}
- [ ] Step 2 — Owner: {ROLE} — Deadline: {DATE}

## Approval

- [ ] ARCHITECT reviewed: {name} at {timestamp}
- [ ] Security assessed (if applicable): {name} at {timestamp}
- [ ] Post-mortem scheduled: {date}
```

#### Step 2: Execute Override

```bash
# Use git override flag
git commit --no-verify -m "EMERGENCY: {brief description}

Refs: .agent/exceptions/{DATE}_{DESC}.md
Approved by: {ARCHITECT_NAME}"

# Deploy with override
pnpm deploy --skip-checks
```

#### Step 3: Track Technical Debt

Add to `docs/tech-debt.md`:

```markdown
## [{DATE}] Emergency Override: {Title}

**Created:** {DATE}
**Owner:** {ROLE}
**Priority:** HIGH
**Deadline:** {DATE}

**Description:** Brief summary

**Normalization Tasks:**

- [ ] Task 1 — Issue #123
- [ ] Task 2 — Issue #124

**Status:** 🔴 Open | 🟡 In Progress | 🟢 Resolved
```

#### Step 4: Post-Mortem (Within 48h)

Create: `docs/incidents/{DATE}_incident_report.md`

```markdown
# Incident Report: {Title}

**Date:** {DATE}
**Duration:** {START} to {END}
**Severity:** {LEVEL}

## Timeline

- 14:00 — Issue detected
- 14:15 — Emergency override declared
- 14:30 — Fix deployed
- 15:00 — System stable

## Root Cause

Why did this happen?

## What Went Wrong

What rules/processes failed?

## What Went Right

What worked well?

## Action Items

- [ ] Update rule to prevent recurrence
- [ ] Improve monitoring
- [ ] Add automated check

## Lessons Learned

What should we do differently?
```

---

## 📊 Rule Amendment Process

### RFC Template

**File:** `docs/rfcs/RULE_{YYYYMMDD}_{TITLE}.md`

````markdown
# RFC: {Title}

**Author:** {ROLE_NAME}
**Date:** {DATE}
**Status:** DRAFT | UNDER REVIEW | ACCEPTED | REJECTED

## Summary

One-paragraph explanation of the proposal.

## Motivation

Why is this change necessary?

## Current State

What does the current rule say?

## Proposed Change

What should the new rule be?

### Before

```markdown
Current rule text
```
````

### After

```markdown
Proposed rule text
```

## Impact Analysis

Who/what is affected by this change?

- **Roles Affected:** {list}
- **Files Affected:** {list}
- **Breaking Change:** YES | NO

## Migration Plan

How do we transition?

- [ ] Step 1
- [ ] Step 2

## Discussion

(Comments from reviewers)

## Decision

**Approved by:** {ARCHITECT} on {DATE}
**Effective:** {DATE}

````

### Approval Requirements

| Change Type | Approval Needed |
|-------------|----------------|
| CRITICAL rule change | ARCHITECT + All affected roles (unanimous) |
| WORKFLOW rule change | ARCHITECT + DEVOPS |
| CODE_STANDARDS change | ARCHITECT |
| AGENT_PROTOCOL change | ARCHITECT + 2 agents |
| Typo/clarification | Any senior role |

---

## 🔍 Compliance Monitoring

### Automated Checks
```bash
# Pre-commit hook
.husky/pre-commit:
  - pnpm verify (must score ≥ 80)
  - Check for `any` types
  - Check for hardcoded secrets
  - Validate commit message format
  - Check file ownership (if modifying restricted files)

# CI/CD pipeline
.github/workflows/quality-gate.yml:
  - Type check
  - Lint
  - Test coverage
  - Security audit (npm audit)
  - License compliance
````

### Manual Reviews

- **Weekly:** ARCHITECT reviews exception log
- **Monthly:** All roles review their domain rules for updates
- **Quarterly:** Full rules audit and version bump if needed

---

## 📞 Escalation Path

```
Issue Detected
    ↓
Agent attempts self-resolution
    ↓
Can't resolve → Consult relevant rule file
    ↓
Still unclear → Ask ARCHITECT for interpretation
    ↓
Conflict between rules → Consult this file (00_META.md)
    ↓
Still blocked → Declare emergency override (if justified)
    ↓
Not emergency → Create RFC for rule change
```

---

## 🛡️ Rule Immunity (Protected Files)

These files CANNOT be moved, renamed, or deleted without ARCHITECT approval:

```
.agent/rules/00_META.md           ← This file
.agent/rules/01_CRITICAL.md
docs/Guides/ARCHITECTURE.md
docs/Guides/SECURITY.md
docs/Guides/CODE_GUIDELINES.md
docs/Guides/PRODUCT.md
supabase/migrations/*             ← Historical migrations
pnpm-lock.yaml                    ← Lock file integrity
```

**Violation of this rule triggers:**

1. Immediate CI failure
2. Notification to ARCHITECT
3. Automatic rollback (if in git)

---

## 📚 Related Documents

- **01_CRITICAL.md** — Non-negotiable rules (security, architecture)
- **02_WORKFLOW.md** — Git, DevOps, environment management
- **03_CODE_STANDARDS.md** — TypeScript, React, styling conventions
- **04_AGENT_PROTOCOL.md** — Agent state management and communication
- **05_EXCEPTIONS.md** — Valid reasons to break rules

---

## 🔐 Digital Signature

This document is authoritative for BrainBox project.

**Last Verified By:** ARCHITECT  
**Verification Date:** 2026-02-25  
**SHA-256 Checksum:** `{generated on save}`

---

**END OF META RULES**
