# 03 — Code Standards

Priority: MEDIUM — TypeScript, React, Styling, State, API standards.

## TypeScript
- All exported functions must have explicit return types.
- Prefer `interface` for objects. Use `type` for unions/intersections.
- New shared types → `packages/shared/src/types/index.ts`
- New Zod schema → `packages/validation/schemas/`

## React
- Server components by default. Add `'use client'` only for hooks/events.
- `useShallow` mandatory when destructuring multiple Zustand store values.
- On mutation: update Zustand state FIRST, revert in `catch` on API failure.
- `memo`, `useMemo`, `useCallback` only for intensive operations — not blindly.

## Styling
- Use design tokens: `.glass-card`, `var(--color-platform)`, `--ui-z-*`.
- No raw z-index numbers.
- No string interpolation in Tailwind classes (`bg-${color}-500` → forbidden, use full class map).

## Logging
- `console.log` is forbidden in production.
- Use `@brainbox/shared` logger: `logger.info(area, msg, data?)`

## Testing
- **New function**: Unit test (Vitest) required.
- **API route**: Integration test required.
- **Platform normalizer**: Unit test with fixture data.
- **React component with logic**: Component test required.
- **Coverage**: Minimum coverage must include happy path + edge cases + error states.
- **Location**: Tests live next to code: `src/module/__tests__/module.test.ts`.
- **E2E**: Playwright tests for critical user flows in `tests/e2e/`.

## Prohibitions
- No new external libraries without explicit user approval.
- Shared deps (React, Zod, Lucide) MUST be in root `package.json`, not in `apps/*`.

## Project Graphs
- Structural change → update `ProjectGraph.json` and `knowledge_graph.json`.
- READ: `python3 .agent/tools/graph.py search --graph project "query"`
- WRITE: `python3 .agent/tools/graph.py add --graph project --id <id> --desc <desc>`
- Never edit graph JSON manually.
