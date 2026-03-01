<!-- doc: TESTING.md | version: 1.0 | last-updated: 2026-02-28 -->
# 📄 TESTING.md

## 🧪 Testing Philosophy & Strategy
The testing methodology for Brainbox prioritizes confidence without excessive boilerplate. We follow the Testing Pyramid:
- **Unit Tests (Vitest)**: Large volume covering individual utility functions, validation schemas, and Zustand slices.
- **Integration Tests (Vitest + Testing Library)**: Covering connected React Server Components, client state stores (`Zustand`), and Dashboard API routes.
- **End-to-End Tests (Playwright)**: Smaller volume focused entirely on critical paths. e.g., the complete "Prompt Enhance" flow from Extension to Dashboard saving to Supabase.

**Coverage Targets:**
- `85%` statements
- `80%` branches

## 🔧 Vitest Setup
Vitest is our primary runner due to the tight integration with Vite in the extension building flow.
- Setup resides in `vitest.config.ts` locally in both `apps/dashboard` and `apps/extension`.
- **Environment:** `happy-dom` or `jsdom` for React components; Node environment for pure business logic and shared configurations.
- **Coverage provider:** `v8` provider via `@vitest/coverage-v8`.
- **Path Aliases:** Respects the monorepo `@brainbox/*` resolution mapping inherited via `tsconfig.json`.

Test File Naming Convention: `*.test.ts`, `*.test.tsx`. We strictly co-locate tests near the component for maintainability.

## 🎭 Playwright Setup
Playwright handles real browser E2E flows (Root `./playwright.config.ts`).
- **Browser Matrix**: Chromium (Chrome Extension E2E testing focus), Firefox, WebKit.
- Base URL configured to Dashboard `localhost:3000` via env config.
- Automatically records `screenshots` and `video` on failure to aid debugging.
- Cross-application E2E involves spinning up an unpacked extension in a Chromium instance simulating content interactions.

## 📁 Test File Organization

```
apps/
  dashboard/
    src/
      components/
        Button.tsx
        Button.test.tsx      (Co-located tests)
  extension/
    src/
      background/
        authManager.ts
        authManager.test.ts  (Co-located tests)
    __tests__/               (Integration / Mocks)
```

**Utilities:** Common testing mocks and fixtures live in `packages/shared/src/testing/` or `__tests__/utils`.

## 🏃 Running Tests

| Command | What it does |
|---|---|
| `pnpm test` | Runs all Vitest suites continuously in watch mode. |
| `pnpm test:run` | Runs all Vitest suites once (used in CI). |
| `pnpm test:coverage` | Generates full coverage reports via v8. |
| `pnpm test:e2e` | Triggers Playwright suite headlessly based on config. |
| `pnpm test:e2e:ui` | Triggers Playwright suite in UI mode for local debugging. |

## 📝 Testing Patterns & Examples

### Unit Testing Patterns
- **Zustand stores**: Validate state updates and async action handlers individually, wiping the store state in `beforeEach()`.
- **React Components**: Utilizing `@testing-library/react` focused on screen renders, firing DOM events, and querying by standard ARIA roles (`getByRole`, `getByText`).
- **Mocking chrome.* APIs**: The extension uses a lightweight `chrome` global API mock to isolate background logic.
- **Mocking Gemini SDK**: Stub the `GoogleGenerativeAI` responses via `vi.spyOn` resolving predefined standard API payloads. `vi.mock('@google/generative-ai')`.

### Integration Testing Patterns
- **API Routes (Next.js)**: Invoking NextRequest abstractions and simulating payloads sent from the Extesion verifying database insertion mocks (Prisma/Supabase).
- **Navigation**: Firing router pushes via mocked `useRouter` hooks.

### E2E Testing Patterns
- Validates Extension tracking triggers across a mock ChatGPT DOM.
- Ensures the Dashboard renders captured outputs via Supabase realtime.

## 🎯 Coverage Targets (Enforced)

> ℹ️ **Thresholds are enforced in CI.**
> Vitest is configured to fail the build if coverage falls below these thresholds.

| Directory | Statements (Target) | Branches (Target) | Enforced? |
|---|---|---|---|
| `packages/validation` | 100% | 100% | ✅ Yes |
| `apps/dashboard/src/api` | 85% | 80% | ✅ Yes |
| `apps/extension/src/background` | 90% | 85% | ✅ Yes |
| `apps/dashboard/src/components` | 75% | 75% | ✅ Yes |

- Output generated in `text`, `html`, and `lcov` formats.
- Reports exclude configuration shells (`vite.config.ts`).
  > ℹ️ `tailwind.config.ts` is **excluded from this list** — it was deleted during the Tailwind v4 migration (CSS-first config via `@import "tailwindcss"` + `@theme` block). No file to exclude.

## 🔧 Mocking Strategy

| What | How | Library |
|---|---|---|
| `chrome.storage` | In-memory Object | Vitest + Custom Mock |
| Network/API | MSW (Mock Service Worker) | `msw` |
| Timers | Fake Timers (`vi.useFakeTimers`) | Vitest |
| Next.js Router | Mock implementation | `next-router-mock` |
| Gemini AI SDK | Custom Vi Spies | Vitest (`vi.mock`) |

## 🚨 Common Testing Pitfalls
- **Async State in Zustand**: Must ensure `await waitFor(() => expect(result.current.state).toBe('ready'))` because store updates are resolved outside standard Vitest synchronous cycles.
- **Chrome API Availability**: Forgetting to mock the generic `chrome` object crashes non-E2E extension tests instantly upon referencing `chrome.storage.local`.
- **ESM Node Conflicts**: Vite resolves `import` correctly, but some Vitest Node contexts may require `ssr.noExternal` for specialized monorepo packages.

## 📎 Related Documents
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [EXTENSION.md](./EXTENSION.md)
- [CODE_GUIDELINES.md](./CODE_GUIDELINES.md)
