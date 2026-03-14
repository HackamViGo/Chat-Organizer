# 04 — Agent Protocol

Priority: HIGH — Cross-agent state, handover, and MCP protocol.

## Before Every Task
1. Read `.agent/state/{ROLE}_state.json` → know current assignment
2. Search graphs: `python3 .agent/tools/graph.py search --graph project "topic"`
3. Run guardians: `python3 .agent/tools/guardians/guardian.py --role {ROLE}`

## During Task
- Set status to `ACTIVE` in state JSON.
- **MANDATORY**: Before writing any line of code -> Query `@mcp:context7:query-docs` for up-to-date documentation and logic examples.
- **Project Structure Change**: If you modify the file structure (add/move/delete files) -> IMMEDIATELY update `.agent/context/ProjectGraph.json`.
- **Business Logic Change**: If you modify core logic or schemas -> IMMEDIATELY update `.agent/context/knowledge_graph.json`.
- **Testing**: After every change, verify the result using the most relevant MCP tool (e.g., `filesystem` for files, `chrome-devtools` for browser).
- Log detailed steps to `.agent/logs/decisions.json`.
- Work affecting another role → write handover to `.agent/dependencies.json`.

## Exit Sequence (after every task)
1. `pnpm type-check && pnpm lint`
2. `pnpm -r test` (test all packages)
3. **MANDATORY**: If tests fail → fix BEFORE commit/reporting. Never skip failed tests.
4. Set status to `IDLE` in state JSON.
5. Log changes to `decisions.json`.
6. Report back to user **in Bulgarian**.

## MCP Usage
- **Core MCPs (ALWAYS ON)**: `filesystem`, `context7`, `memory`, `sequential-thinking`. Do not disable these.
- **Restricted MCPs (OFF BY DEFAULT)**: All other MCPs (e.g., web, chrome-devtools, puppeteer) must be kept DISABLED in `mcp_config.json`.
- **Activation Lifecycle**: Enable only when needed -> Perform task -> DISABLE immediately.
- **No Simulation**: NEVER simulate MCP operations. Real tool calls only.
- **Transparency (CRITICAL)**: If an MCP tool fails or returns an error (e.g., API issues, environment errors) -> **REPORT IMMEDIATELY** to the USER before proceeding. Do not hide errors behind personal knowledge.

## Tools
- Always use `.agent/tools/` CLI scripts for complex files (JSON graphs, version bumps).
- Never use text replacement on large JSON files — use the Python CLI tools.
