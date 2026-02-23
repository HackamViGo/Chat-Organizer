# Test Suite Integrity Audit - `BrainBox`

**Date:** 2026-02-23  
**Auditor:** Meta-Architect (v3.1) / Test Suite Integrity Auditor  

---

## §1 Test Infrastructure

**Test Runners & Configurations:**
- **`apps/extension`**: Utilizes `vitest` with `jsdom` environment. Configured in `vitest.config.ts`. Coverage is powered by `@vitest/coverage-v8` with a strictly enforced threshold (see CI).
- **`apps/dashboard`**: **No unit test runner configured.** `package.json` contains no scripts for `test`.
- **`packages/*`**: **No unit testing configured.**
- **`tests/` (Root)**: Utilizes `@playwright/test` for E2E tests, alongside custom Node.js scripts executed directly (e.g., `test-api.js`, `schema-validation.test.js`, `check-rls.js`).

**CI Configuration (`.github/workflows/test.yml`):**
- Runs `pnpm test:all --run` followed by `pnpm test:coverage`.
- Thresholds strictly enforced via `jq` & `bc` scripts parsing `coverage-summary.json`: **Lines >= 85%**, **Branches >= 80%**.
- Fails CI if thresholds are not met or if any `vitest` run fails.

**Mocks Setup:**
- Extensions tests rely heavily on `apps/extension/src/__tests__/setup.ts` which globally mocks `chrome.storage`, `chrome.runtime`, `chrome.tabs`, `chrome.webRequest`, `chrome.scripting`, and `fetch`.
- Rate Limiters (`rate-limiter.js`) are force-disabled/mocked to execute immediately.

**Execution Chain (`pnpm verify`):**
- Triggers linting, type-checking, `test:all`, `test:coverage`, checks thresholds, builds extension, and verifies build output.

---

## §2 Coverage Matrix

**Current State:** Extension suite is currently failing (16 errors), resulting in **0% real coverage** generation. The CI thresholds are functioning as a gate, but the codebase does not organically pass.

| Module | Source Files | Test Files Present? | Coverage % | Explicit Exclusions (`/* istanbul ignore */`) |
|--------|--------------|---------------------|------------|---------------------------------------------|
| `apps/dashboard/*` | All | 🔴 NO | 0% | 0 instances |
| `packages/shared` | All | 🔴 NO | 0% | 0 instances |
| `packages/validation` | All | 🔴 NO | 0% | 0 instances |
| `apps/extension/*` | Core Modules | 🟢 YES | Broken | 0 instances |

> **Verdict:** `apps/dashboard` and all `packages/*` are flagged as **⚠ UNCOVERED**.

---

## §3 Test Quality Report

| Test File | Assertions | Mocks Integrity | Snapshot Status | Alignment Verdict |
|-----------|------------|-----------------|-----------------|-------------------|
| `authManager.test.ts` | High | Moderate (mocks global API structure) | N/A | Aligned |
| `deepseek.test.ts` | High | Good (mock returns specific API shape) | N/A | Aligned |
| `integration.test.ts` | Med | **Poor** (Mocks internal components) | N/A | **⚠ MISALIGNED** (Unit test disguised as Integration) |
| `schema-validation.test.js`| Low | **Failed** (Simulates logic) | N/A | **🚨 DISCONNECTED** |
| `auth-flow.spec.ts` (E2E) | Low | Injecting via `localStorage` directly | N/A | Bypasses UI login completely |
| `cdp-audit.spec.ts` (E2E) | Med | Modifies `manifest.json` on the fly | N/A | Complex but aligned for purpose |

---

## §4 Manipulation Detection Log

| File | Line | Test Name | Pattern | Severity |
|------|------|-----------|---------|----------|
| `tests/unit/schema-validation.test.js` | 18 | `All` | **Pattern C / Pattern B** — "Mock Replaces Reality" and "Leak". Test explicitly states it *simulates* the validation logic to demonstrate the concept, bypassing actual module import. | 🚨 CRITICAL |
| `apps/extension/src/background/modules/__tests__/integration.test.ts` | 11 | `All flows` | **Pattern C** — "Mock Replaces Reality". Mocks out `dashboardApi` and `platformAdapters` natively, bypassing real integration boundaries. | 🚨 CRITICAL |
| `tests/e2e/auth-flow.spec.ts` | 22 | `Dashboard Auth Syncs to Extension` | **Pattern B** — "Implementation Leak". Directly injects mock Supabase session into `localStorage` instead of logging in via UI. | ⚠ MODERATE |
| `tests/e2e/extension.spec.ts` | 220 | Multi | **Pattern G** - Selective Test Skipping (`.skip`). 4 Gemini-related tests are commented off with `.skip`. | ⚠ MODERATE |

---

## §5 Critical Path Coverage

| Critical Path | File | Coverage | Verdict |
|---------------|------|----------|---------|
| **Dashboard:** Authentication flow | N/A | 0% | 🚨 CRITICAL GAP |
| **Dashboard:** Server Actions (`actions.tsx`) | N/A | 0% | 🚨 CRITICAL GAP |
| **Dashboard:** Zustand Mutations | N/A | 0% | 🚨 CRITICAL GAP |
| **Dashboard:** API Routes | N/A | 0% | 🚨 CRITICAL GAP |
| **Extension:** `authManager.ts` | `authManager.test.ts` | Suite Broken | ⚠ UNTESTABLE STATE |
| **Extension:** `syncManager.ts` | `validate_extension_sync.js` | Active | ✅ COVERED |
| **Shared:** Zod Schemas | `schema-validation.test.js` | 0% (Fake Tests) | 🚨 CRITICAL GAP |

---

## §6 Git History Anomalies

- **Retroactive Refinement vs. Breaking Test Fixes**: Commit `4b0ecd4` ("chore: core infrastructure refinement, test fixes") touches `schema-validation.test.js` merely to change `console.log` to `console.debug`, implying blind fixes applied via scripts without addressing the fact that the file itself tests nothing.
- **Skipped Coverage in Core Features:** Commit history spanning Gemini AI integration shows tests added but immediately skipped (e.g., `test.skip('Gemini page loads without errors')` in `extension.spec.ts`).

---

## §7 Verdict Summary

**Verdict: ⚠ COMPROMISED**

The test suite exhibits systemic manipulation and critical coverage gaps that artificially inflate perceived project health, rendering the Health Score highly misleading.

**Remediation List (Prioritized):**
1. **Delete & Replace `schema-validation.test.js`:** The validation test is an illusion. It must import the actual `@brainbox/validation` codebase and test against real Zod schemas.
2. **Implement Next.js Dashboard Unit Tests:** Set up Jest/Vitest for `apps/dashboard`. Core React components, Zustand stores, and Server actions are completely untested.
3. **Fix Extension Vitest Suite (16 Failing Errors):** Diagnose the 16 errors blocking coverage string generation. The 85% line coverage threshold acts as a facade until tests actively pass.
4. **Refactor `integration.test.ts`:** Remove internal `vi.mock` decorators for core architectural boundaries. A true integration test must test systems connected, not mocked.
5. **Re-activate Gemini E2E Tests:** Resolve the flakiness leading to `.skip` tags in `extension.spec.ts` or formally document their deprecation.
