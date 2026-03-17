# MCP Selection Policy — Tool Activation Protocol

## Always-On MCPs (Active in every session)

| MCP | Purpose | Why Always-On |
|-----|---------|---------------|
| **Memory** | Persistent context across sessions | Agent continuity, no re-learning |
| **Sequential Thinking** | Step-by-step reasoning | Complex multi-file changes need structured thought |
| **Context7** | External documentation | Every task may need API reference |
| **Filesystem** | Read/write project files | Core operation for every task |

These four are NEVER disabled. They form the agent's cognitive baseline.

---

## On-Demand MCPs (Activate when needed)

| MCP | Activate When | Deactivate After |
|-----|--------------|-----------------|
| **Terminal/Shell** | Running builds, tests, installs | Command completes + output verified |
| **Git** | Committing, branching, checking history | Git operation completes |
| **Playwright/Browser** | E2E testing, visual verification | Test suite completes |
| **Supabase** | Database queries, migration verification | Query completes |
| **HTTP** | API endpoint testing, contract validation | All endpoints verified |

### Activation Protocol
```
1. Determine task requires an on-demand MCP
2. Activate in mcp_config.json:
   { "mcpServers": { "tool-name": { "enabled": true } } }
3. Perform the task
4. Verify results
5. Deactivate:
   { "mcpServers": { "tool-name": { "enabled": false } } }
6. Log activation in decision log
```

### Why Not Always-On?
```
Performance: Each active MCP consumes context window tokens
Security:    Supabase/HTTP MCPs have write access to production
Focus:       Too many tools = decision paralysis
Resource:    Terminal processes may hang if not cleaned up
```

---

## MCP Selection Decision Tree

```
START: What does the task require?
│
├── Understanding code?
│   └── Filesystem (read_file, search_files)
│       Always available ✅
│
├── External API knowledge?
│   └── Context7 (resolve-library-id, get-library-docs)
│       Always available ✅
│
├── Writing/modifying code?
│   └── Filesystem (write_file, edit_file)
│       Always available ✅
│       THEN → Terminal (pnpm test, pnpm build) to verify
│              Activate → verify → deactivate
│
├── Version control?
│   └── Git (status, commit, diff)
│       Activate → complete → deactivate
│
├── Testing in browser?
│   └── Playwright (launch, navigate, assert)
│       Activate → test → deactivate
│       REQUIRES: pnpm build first (via Terminal)
│
├── Verifying backend?
│   ├── Database check?
│   │   └── Supabase (query, verify RLS)
│   │       Activate → query → deactivate
│   │
│   └── API endpoint check?
│       └── HTTP (GET/POST to API)
│           Activate → verify → deactivate
│
├── Reasoning about complex changes?
│   └── Sequential Thinking
│       Always available ✅
│
└── Recalling previous decisions?
    └── Memory
        Always available ✅
```

---

## Tool Composition Patterns

### Pattern 1: Code Change Cycle
```
Tools: Filesystem → Terminal → Git

1. Filesystem: Read current file
2. Filesystem: Write modified file
3. Terminal: pnpm test (activate → run → deactivate)
4. Terminal: pnpm build (activate → run → deactivate)
5. Git: commit (activate → commit → deactivate)
```

### Pattern 2: Bug Investigation
```
Tools: Filesystem → Context7 → Terminal

1. Filesystem: Read error-related files
2. Context7: Look up API that's failing
3. Filesystem: Apply fix
4. Terminal: Run tests to verify fix
```

### Pattern 3: New Platform Adapter
```
Tools: Filesystem → Context7 → Terminal → Git

1. Context7: Look up platform's API format
2. Filesystem: Read existing adapter (e.g., gemini.adapter.ts)
3. Filesystem: Create new adapter file
4. Filesystem: Update index.ts registry
5. Filesystem: Update manifest.json
6. Filesystem: Create bridge content script
7. Terminal: pnpm test && pnpm build
8. Git: Commit with message "feat(ext): add {platform} adapter"
```

### Pattern 4: API Contract Validation
```
Tools: Filesystem → HTTP → Supabase

1. Filesystem: Read dashboardApi.ts to see expected contract
2. HTTP: Send test request to verify response (activate → test → deactivate)
3. Supabase: Verify data was stored correctly (activate → query → deactivate)
```

### Pattern 5: Full E2E Verification
```
Tools: Terminal → Playwright

1. Terminal: pnpm build (activate → build → deactivate)
2. Playwright: Load extension, test flow (activate → test → deactivate)
```

---

## MCP Configuration File

### Location: `.cursor/mcp_config.json`

```json
{
  "mcpServers": {
    "memory": {
      "enabled": true,
      "note": "ALWAYS ON — agent continuity"
    },
    "sequential-thinking": {
      "enabled": true,
      "note": "ALWAYS ON — structured reasoning"
    },
    "context7": {
      "enabled": true,
      "note": "ALWAYS ON — documentation lookup"
    },
    "filesystem": {
      "enabled": true,
      "note": "ALWAYS ON — file operations"
    },
    "terminal": {
      "enabled": false,
      "note": "ON-DEMAND — activate for build/test/install"
    },
    "git": {
      "enabled": false,
      "note": "ON-DEMAND — activate for version control"
    },
    "playwright": {
      "enabled": false,
      "note": "ON-DEMAND — activate for E2E testing"
    },
    "supabase": {
      "enabled": false,
      "note": "ON-DEMAND — activate for DB verification"
    },
    "http": {
      "enabled": false,
      "note": "ON-DEMAND — activate for API testing"
    }
  }
}
```

### Activation Log Template
```json
// In .agent/logs/decisions.json
{
  "timestamp": "2026-03-15T10:00:00Z",
  "role": "EXTENSION_ENGINEER",
  "decision": "Activated Terminal MCP for test execution",
  "context": "Phase 1 Gemini adapter verification",
  "mcp_activated": "terminal",
  "mcp_deactivated_at": "2026-03-15T10:05:00Z",
  "result": "All 12 tests passed"
}
```

---

## Safety Rules

```
NEVER activate multiple on-demand MCPs simultaneously unless:
  → Task explicitly requires composition (e.g., Terminal + Git for commit after test)
  → Document the reason in decision log

NEVER leave on-demand MCPs active after task completion:
  → Deactivate immediately when done
  → Verify deactivation in mcp_config.json

ALWAYS prefer read-only operations first:
  → Filesystem read before write
  → Git status before commit
  → Supabase SELECT before INSERT
  → HTTP GET before POST

ALWAYS verify after write operations:
  → After Filesystem write → Terminal test
  → After Git commit → Git log to confirm
  → After Supabase migration → Supabase query to verify
  → After HTTP POST → HTTP GET to confirm
```
