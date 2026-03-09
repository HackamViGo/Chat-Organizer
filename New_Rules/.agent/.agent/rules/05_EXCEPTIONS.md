---
version: 5.0.0
priority: LOW
override_allowed: ALWAYS
---

# Exception Handling — Escape Hatches

> Valid reasons to temporarily break rules, with accountability and normalization plans.

---

## 🟢 E1. Emergency Hotfix

### E1.1 When to Use

**Trigger Conditions:**

- Production is DOWN (>50% users affected)
- Critical security vulnerability discovered
- Data loss in progress
- Legal/compliance violation active

**NOT Valid for:**

- Feature request marked "urgent" by stakeholder
- Missed deadline pressure
- "We'll fix it later" mentality
- Personal convenience

---

### E1.2 Emergency Protocol

#### Step 1: Declare Emergency

```bash
# Create exception document
mkdir -p .agent/exceptions
cat > .agent/exceptions/2026-02-25_rls-bypass-patch.md << 'EOF'
# Emergency Override: RLS Bypass Patch

**Date:** 2026-02-25T16:30:00Z
**Declared by:** BACKEND_ENGINEER
**Approved by:** ARCHITECT (verbal approval, documented here)
**Severity:** CRITICAL

## Situation
RLS policy on `chats` table is blocking legitimate reads for users with
multiple sessions. 50% of users cannot access their chats.

## Impact
- **Users Affected:** ~5,000 (50% of active users)
- **Data at Risk:** None (read-only issue)
- **Downtime Expected:** Until patch deployed (~15 minutes)

## Rules Violated
- [ ] CRITICAL C1.3: Bypassing RLS policy temporarily
- [ ] WORKFLOW W1.5: Committing directly to main without PR

## Override Actions
1. Temporarily disable RLS on `chats` table
2. Deploy hotfix to production
3. Monitor for abuse (none expected, read-only)

## Safeguards
- [ ] Monitoring active (Sentry, Supabase logs)
- [ ] Rollback script prepared
- [ ] Incident channel open (#incident-2026-02-25)

## Normalization Plan
- [ ] Fix RLS policy (add OR condition for multi-session)
  - Owner: BACKEND_ENGINEER
  - Deadline: 2026-02-25T20:00:00Z (4 hours)
- [ ] Re-enable RLS with corrected policy
  - Owner: BACKEND_ENGINEER
  - Deadline: 2026-02-25T20:00:00Z
- [ ] Write post-mortem
  - Owner: ARCHITECT
  - Deadline: 2026-02-26T12:00:00Z

## Approval
- [x] ARCHITECT reviewed: John Doe at 2026-02-25T16:32:00Z
- [x] Security assessed: No additional risk (temporary, monitored)
- [x] Post-mortem scheduled: 2026-02-26 10:00 AM
EOF
```

#### Step 2: Execute Hotfix

```bash
# Bypass pre-commit hooks
git commit --no-verify -m "hotfix: disable RLS temporarily for multi-session reads

EMERGENCY OVERRIDE
Refs: .agent/exceptions/2026-02-25_rls-bypass-patch.md
Approved by: ARCHITECT (John Doe)
Duration: 4 hours max
Tracking: #567"

# Deploy immediately
git push origin main
vercel deploy --prod
```

#### Step 3: Track Technical Debt

```bash
# Add to tech-debt.md
cat >> docs/tech-debt.md << 'EOF'

## [2026-02-25] Emergency RLS Bypass

**Created:** 2026-02-25T16:30:00Z
**Owner:** BACKEND_ENGINEER
**Priority:** CRITICAL
**Deadline:** 2026-02-25T20:00:00Z (4 hours)

**Description:** RLS policy temporarily disabled on `chats` table due to
multi-session read blocking bug.

**Normalization Tasks:**
- [ ] Fix RLS policy — Issue #567
- [ ] Re-enable RLS — Issue #567
- [ ] Add test for multi-session scenario — Issue #568

**Status:** 🔴 Open
EOF

# Create GitHub issues
gh issue create \
  --title "Fix RLS policy for multi-session reads" \
  --label "hotfix,critical" \
  --body "See .agent/exceptions/2026-02-25_rls-bypass-patch.md"
```

#### Step 4: Post-Mortem (Within 48h)

```markdown
# docs/incidents/2026-02-25_rls_bypass_incident.md

# Incident Report: RLS Multi-Session Bug

**Date:** 2026-02-25
**Duration:** 16:30 - 17:00 (30 minutes)
**Severity:** CRITICAL (50% users affected)

## Timeline

- **16:15** — User reports start coming in (support tickets)
- **16:20** — On-call engineer investigates
- **16:25** — Root cause identified (RLS policy bug)
- **16:30** — Emergency override declared
- **16:35** — Hotfix deployed (RLS disabled)
- **16:40** — Monitoring confirms issue resolved
- **17:00** — System stable, users can access chats
- **19:45** — Proper RLS policy deployed
- **19:50** — RLS re-enabled
- **20:00** — Incident closed

## Root Cause

RLS policy used `auth.uid() = user_id` which failed when user had multiple
active sessions (different JWTs, same user_id). Supabase auth context was
using the JWT's `sub` claim which differed per session.

## What Went Wrong

1. Insufficient testing of multi-session scenarios
2. RLS policy too strict (didn't account for auth architecture)
3. No automated monitoring for RLS policy failures

## What Went Right

1. Fast detection (15 minutes from first report to investigation)
2. Clear emergency protocol followed
3. Hotfix deployed quickly (15 minutes from detection to resolution)
4. No data loss or security breach
5. Proper documentation maintained

## Action Items

- [x] Fix RLS policy (completed 19:45)
- [ ] Add E2E test for multi-session scenario — ASSIGNED: QA_ENGINEER
- [ ] Add monitoring alert for RLS failures — ASSIGNED: DEVOPS_ENGINEER
- [ ] Review all RLS policies for similar issues — ASSIGNED: BACKEND_ENGINEER
- [ ] Document RLS best practices — ASSIGNED: DOCUMENTATION_ENGINEER

## Lessons Learned

1. **Always test authentication edge cases** (multi-session, token refresh, etc.)
2. **RLS policies need explicit testing** (not just "it works for single user")
3. **Emergency protocol worked well** (clear steps, fast execution)

## Prevention

Going forward:

- Add RLS test suite (multi-session, expired tokens, no token)
- Monitoring for RLS policy denials (Supabase logs)
- Quarterly RLS policy audit
```

---

## 🟢 E2. Third-Party Dependency Issues

### E2.1 When to Use

**Trigger Conditions:**

- Library missing TypeScript types
- Conflicting type definitions
- Breaking change in patch version
- Deprecated API with no alternative yet

**Examples:**

```typescript
// External library has wrong types
import { someFunction } from 'broken-library'

// @ts-expect-error — Library types are incorrect, reported in issue #123
// See: https://github.com/library/repo/issues/123
const result = someFunction(validInput)
```

---

### E2.2 Exception Template

````markdown
# Exception: Third-Party Type Issue

**Date:** 2026-02-25
**Library:** `react-markdown@8.0.0`
**Issue:** Missing type export for `Components` prop

## Problem

```typescript
// Type error: 'Components' is not exported from 'react-markdown'
import { Components } from 'react-markdown'
```
````

## Temporary Solution

```typescript
// Workaround using type assertion
// @ts-expect-error — Types missing in react-markdown@8.0.0
// Tracking: https://github.com/remarkjs/react-markdown/issues/XXX
// TODO(#456): Remove when types are fixed
const components: any = {
  code: CustomCode,
  h1: CustomH1,
}
```

## Upstream Tracking

- [ ] Issue filed: https://github.com/remarkjs/react-markdown/issues/XXX
- [ ] Watching for fix
- [ ] Alternative library researched: `marked` (fallback option)

## Normalization Plan

- **Condition:** When `react-markdown@8.1.0` or newer is released with types
- **Action:** Remove `any` type, use proper `Components` import
- **Owner:** FRONTEND_ENGINEER
- **Tracking:** Issue #456

````

---

## 🟢 E3. Performance Critical Path

### E3.1 When to Use

**Trigger Conditions:**
- Type safety adds measurable overhead (>10% perf degradation)
- Runtime validation causes blocking operations
- Hot path in critical user flow

**Requirements:**
- [ ] Benchmark proof (before/after measurements)
- [ ] Profiler evidence (Chrome DevTools, React Profiler)
- [ ] User impact quantified (e.g., "500ms slower on 4G")

---

### E3.2 Exception Example

```typescript
// Exception: Skip runtime validation in render loop

interface Item {
  id: string;
  name: string;
  value: number;
}

// ❌ ORIGINAL (too slow, validates 10,000 items every render)
function ItemList({ items }: { items: unknown[] }) {
  const validatedItems = items.map(item => itemSchema.parse(item));  // 200ms
  return <>{validatedItems.map(renderItem)}</>;
}

// ✅ OPTIMIZED (validate once on data load, trust in render)
function ItemList({ items }: { items: Item[] }) {
  // Items already validated at data fetch boundary
  // Skipping per-render validation for performance
  // Benchmark: 200ms → 5ms (40x improvement)
  return <>{items.map(renderItem)}</>;
}

// Validation happens here instead (once):
async function fetchItems(): Promise<Item[]> {
  const response = await fetch('/api/items');
  const data = await response.json();

  // Single validation at boundary
  return z.array(itemSchema).parse(data);
}
````

**Documentation:**

```markdown
# Exception: Skip Per-Render Validation

**Date:** 2026-02-25
**Component:** ItemList
**Reason:** Performance (200ms → 5ms)

## Benchmark

- **Before:** 200ms to validate 10,000 items per render
- **After:** 5ms (validation moved to fetch boundary)
- **User Impact:** Eliminated render lag on low-end devices

## Profiler Evidence

![Chrome DevTools Profiler](./profiler-screenshot.png)

- Validation taking 87% of render time
- After optimization: <1% of render time

## Safety Measures

- [x] Validation at data fetch boundary (fetchItems)
- [x] TypeScript compile-time safety maintained
- [x] Items are type-safe by the time they reach component
- [x] Added comment explaining the optimization

## Monitoring

- Performance monitoring active (Lighthouse CI)
- Rollback plan: Re-enable validation if data corruption detected
```

---

## 🟢 E4. Legacy Code Migration

### E4.1 When to Use

**Trigger Conditions:**

- Refactoring old code that predates current rules
- Gradual migration strategy
- Breaking changes would be too disruptive

---

### E4.2 Migration Plan Template

```markdown
# Migration Plan: Zustand Stores to useShallow

**Start Date:** 2026-02-25
**Target Completion:** 2026-03-10 (2 weeks)
**Owner:** FRONTEND_ENGINEER

## Current State

- 15 Zustand stores in codebase
- 8 use old destructuring pattern (without useShallow)
- 7 already migrated to useShallow

## Migration Strategy

**Incremental (one store per day):**

### Week 1

- [x] Day 1: useChatStore
- [x] Day 2: useFolderStore
- [ ] Day 3: usePromptStore
- [ ] Day 4: useImageStore
- [ ] Day 5: useListStore

### Week 2

- [ ] Day 6: useAuthStore
- [ ] Day 7: useUIStore
- [ ] Day 8: Testing & verification
- [ ] Day 9: Documentation update
- [ ] Day 10: Buffer for issues

## Tracking

- Overall progress: 40% (6/15 stores)
- Blocking issues: None
- Estimated completion: On track

## Exception Rationale

During migration period, both patterns will coexist. This is acceptable because:

- Old pattern still works (no bugs)
- Migration is tracked (this document)
- Timeline is reasonable (2 weeks)
- Each store migrated is tested individually

## Success Criteria

- [ ] All 15 stores use useShallow
- [ ] No performance regressions
- [ ] Documentation updated
- [ ] Lint rule added to prevent old pattern
```

---

## 🟢 E5. Experimental Features

### E5.1 When to Use

**Trigger Conditions:**

- Testing new technology/library
- Proof of concept
- Feature flag protected code

---

### E5.2 Feature Flag Pattern

```typescript
// config/features.ts
export const FEATURES = {
  GLOBAL_BRAIN: process.env.NEXT_PUBLIC_FEATURE_GLOBAL_BRAIN === 'true',
  VECTOR_SEARCH: process.env.NEXT_PUBLIC_FEATURE_VECTOR_SEARCH === 'true',
  AI_ANALYSIS: process.env.NEXT_PUBLIC_FEATURE_AI_ANALYSIS === 'true',
} as const;

// Usage
import { FEATURES } from '@/config/features';

function ChatView() {
  return (
    <div>
      <ChatContent />

      {FEATURES.AI_ANALYSIS && (
        <ExperimentalAIAnalysis />  // ⚠️ Experimental
      )}
    </div>
  );
}
```

**Exception Document:**

````markdown
# Exception: Experimental AI Analysis Feature

**Date:** 2026-02-25
**Feature:** AI-powered chat analysis
**Status:** BETA (behind feature flag)

## Why Exception?

This feature uses:

- Experimental Gemini API endpoint (beta)
- New caching strategy (unproven at scale)
- Optimistic UI updates (may cause flicker)

Normal rules violated:

- Uses beta API (normally forbidden)
- Cache strategy not documented yet
- UI may show stale data briefly

## Safeguards

- [x] Feature flag controlled (NEXT_PUBLIC_FEATURE_AI_ANALYSIS)
- [x] Only enabled for internal testing (not production)
- [x] Error boundaries in place
- [x] Fallback to regular analysis if fails
- [x] User feedback mechanism (bug report button)

## Success Metrics

- [ ] 0 errors in 1 week of internal testing
- [ ] <100ms added latency
- [ ] Positive feedback from 5+ internal testers

## Graduation Plan

**To graduate to production:**

1. Complete internal testing (1 week)
2. Document new patterns
3. Add unit/E2E tests
4. Performance audit
5. Security review
6. Gradual rollout (10% → 50% → 100%)

**Timeline:** 2026-03-15 (3 weeks)

## Rollback

If critical issues found:

```bash
# Disable feature
export NEXT_PUBLIC_FEATURE_AI_ANALYSIS=false
vercel env rm NEXT_PUBLIC_FEATURE_AI_ANALYSIS production
vercel deploy --prod
```
````

````

---

## 🟢 E6. Documentation Debt

### E6.1 When to Use

**Trigger Conditions:**
- Fast-moving prototype
- Documentation would be immediately outdated
- Code is self-documenting enough

**NOT Valid for:**
- Public APIs
- Complex algorithms
- Security-critical code
- Shared libraries

---

### E6.2 Exception Template

```markdown
# Exception: Delayed Documentation

**Date:** 2026-02-25
**Code:** `packages/shared/src/services/experimental-cache.ts`
**Reason:** API still evolving, would require daily doc updates

## Current State
- Code is TypeScript (self-documenting types)
- JSDoc comments on public methods
- Usage examples in tests
- No detailed README yet

## Plan
**Documentation will be written when:**
- API stabilizes (currently changing daily)
- At least 3 consumers exist (validate the API shape)
- Feature flag graduates to production

**Estimated Timeline:** 2 weeks (2026-03-10)

## Temporary Mitigation
- [x] JSDoc on all public functions
- [x] Type definitions clear and explicit
- [x] Usage examples in test files
- [x] Inline comments for complex logic

## Tracking
- Issue #789: Write cache service documentation
- Assigned: DOCUMENTATION_ENGINEER
- Deadline: 2026-03-10
````

---

## 🟢 E7. Exception Request Template

### E7.1 General Template

```markdown
# Exception Request: {Brief Description}

**Date:** YYYY-MM-DD
**Requested by:** {ROLE_NAME}
**Rules to violate:** {List rule numbers, e.g., C2.2, W1.5}

---

## Justification

Why is this exception necessary? What is the blocking issue?

{Detailed explanation}

---

## Scope

**Affected files:**

- `path/to/file1.ts`
- `path/to/file2.tsx`

**Duration:**

- [ ] Temporary (specify end date)
- [ ] Permanent (requires strong justification)

**Impact:**

- [ ] Low (isolated code, no users affected)
- [ ] Medium (shared code, internal users)
- [ ] High (public API, all users affected)

---

## Mitigation

What safeguards are in place to prevent issues?

- [x] Safeguard 1
- [x] Safeguard 2
- [x] Monitoring active
- [x] Rollback plan prepared

---

## Normalization Plan

How will we return to compliance?

**Steps:**

1. [ ] Step 1 — Owner: {ROLE} — Deadline: {DATE}
2. [ ] Step 2 — Owner: {ROLE} — Deadline: {DATE}

**Total Timeline:** {X weeks/months}

**Blocking Factors:**

- Upstream library fix needed
- Breaking change requires coordination
- etc.

---

## Approval

- [ ] ARCHITECT reviewed: {name} at {timestamp}
- [ ] Security assessed (if applicable): {name} at {timestamp}
- [ ] Tracking issue created: #{issue_number}
- [ ] Added to tech debt log: docs/tech-debt.md
```

---

## 🟢 E8. Exception Lifecycle

### E8.1 States

```
REQUESTED → APPROVED → ACTIVE → MONITORED → RESOLVED
     ↓
  REJECTED
```

### E8.2 Tracking

**File:** `.agent/exceptions/index.json`

```json
{
  "active": [
    {
      "id": "exc-001",
      "file": ".agent/exceptions/2026-02-25_rls-bypass-patch.md",
      "status": "ACTIVE",
      "created": "2026-02-25T16:30:00Z",
      "deadline": "2026-02-25T20:00:00Z",
      "owner": "BACKEND_ENGINEER"
    }
  ],
  "resolved": [
    {
      "id": "exc-000",
      "file": ".agent/exceptions/2026-02-20_migration-delay.md",
      "status": "RESOLVED",
      "created": "2026-02-20T10:00:00Z",
      "resolved": "2026-02-24T15:00:00Z",
      "duration_days": 4
    }
  ]
}
```

---

## 🟢 E9. Quarterly Exception Audit

### E9.1 Review Process

**Every 3 months (Q1, Q2, Q3, Q4):**

1. **List all active exceptions:**

   ```bash
   pnpm agent:list-exceptions
   ```

2. **For each exception:**
   - Is it still needed?
   - Has the normalization deadline passed?
   - Can it be resolved now?

3. **Resolve or extend:**
   - Resolve: Move to `resolved` state
   - Extend: Document reason, new deadline
   - Escalate: If blocking factor still present

4. **Report:**

   ```markdown
   # Q1 2026 Exception Audit

   **Date:** 2026-03-31
   **Auditor:** ARCHITECT

   ## Summary

   - Total exceptions: 5
   - Resolved this quarter: 3
   - Extended: 1
   - New exceptions: 2

   ## Details

   ### Resolved

   1. **exc-001**: RLS bypass patch
      - Duration: 4 hours (planned: 4 hours)
      - Status: ✅ Resolved on time

   2. **exc-002**: TypeScript migration
      - Duration: 2 weeks (planned: 2 weeks)
      - Status: ✅ Completed successfully

   ### Extended

   1. **exc-003**: Third-party type issue
      - Reason: Upstream library still hasn't fixed types
      - New deadline: 2026-06-30 (3 months extension)
      - Alternative: Considering library replacement

   ### Action Items

   - [ ] Research alternative to library in exc-003
   - [ ] Add automated exception expiry check (DEVOPS)
   ```

---

## 🟢 E10. Automated Exception Management

### E10.1 Scripts

#### Check Expired Exceptions

```typescript
// scripts/check-exceptions.ts
import fs from 'fs'
import path from 'path'

interface Exception {
  id: string
  file: string
  deadline: string
  owner: string
}

function checkExpiredExceptions() {
  const indexPath = '.agent/exceptions/index.json'
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))

  const now = new Date()
  const expired = index.active.filter((exc: Exception) => {
    return new Date(exc.deadline) < now
  })

  if (expired.length > 0) {
    console.error('⚠️  EXPIRED EXCEPTIONS FOUND:')
    expired.forEach((exc: Exception) => {
      console.error(`- ${exc.id}: ${exc.file}`)
      console.error(`  Deadline: ${exc.deadline}`)
      console.error(`  Owner: ${exc.owner}`)
    })

    // Notify owner (Slack, email, etc.)
    // Create GitHub issue if auto-tracking enabled

    process.exit(1) // Fail CI if exceptions expired
  }

  console.log('✅ No expired exceptions')
}

checkExpiredExceptions()
```

#### Run in CI

```yaml
# .github/workflows/exception-check.yml
name: Exception Expiry Check

on:
  schedule:
    - cron: '0 9 * * *' # Daily at 9 AM
  workflow_dispatch:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm check:exceptions

      - name: Notify if failed
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "⚠️ Expired exceptions detected! Check workflow."
            }
```

---

## 📚 Related Documents

- **00_META.md** — Emergency override protocol
- **01_CRITICAL.md** — Rules that can be temporarily violated
- **02_WORKFLOW.md** — Git workflow exceptions
- **docs/tech-debt.md** — Aggregated technical debt tracker

---

**END OF EXCEPTION HANDLING**
