# Impact Analysis: nextjs-docs-main (DRY RUN)

**ID:** nextjs-docs-main  
**Date:** 2026-02-06  
**Status:** STALE / VERSION MISMATCH

---

## 1. CURRENT STATE (Internal Graph Data)
- **Version:** `14.2.18` (via `package.json`)
- **Metadata:** `category: Programming Languages & Frameworks`, `sub_category: Frontend`
- **Last Verified:** > 30 days ago (Implicit)

## 2. EXTERNAL REALITY (Context7 Data - Today)
- **Current Stable Version:** Next.js 15 (Specifically `v15.1.11` or later noted in registry)
- **Context7 Source:** `/vercel/next.js`

## 3. DELTA ANALYSIS (Breaking Changes / Deprecations)
- **Version Gap:** Major version jump from v14 to v15.
- **Breaking Changes:**
  - **Asynchronous Dynamic APIs:** `headers`, `cookies`, `params`, and `searchParams` are now asynchronous. Synchronous access is deprecated and will throw warnings/errors.
  - **React 19:** Next.js 15 requires/parallels React 19 features.
  - **Caching Changes:** Default caching behavior for `fetch` requests and Route Handlers has changed from `force-cache` to `no-store` in some scenarios.

## 4. RECOMMENDATION (Upgrade / Hold / Patch)
- **Action:** **UPGRADE**
- **Priority:** High
- **Notes:** Proceed with a phased migration. Priority 1 should be refactoring synchronous `headers()` and `cookies()` calls to `await headers()` and `await cookies()`. Use existing `UnsafeUnwrappedHeaders` as a temporary shim if necessary for large-scale migration.

---
**Guardian ID:** graph_guardian_v3  
**Verification Mode:** Context7 Verified  
**Health Score Impact:** -5 (until resolved)
