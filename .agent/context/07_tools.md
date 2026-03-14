# 07 — Agent Tools

Read this before using anything in `.agent/tools/`.

## Golden Rule
Always use the CLI tools — never edit complex JSON manually.

## Guardians

```bash
# Run all guardians
python3 .agent/tools/guardians/guardian.py --all

# Run guardians for your role
python3 .agent/tools/guardians/guardian.py --role {ROLE}

# Individual guardians
python3 .agent/tools/guardians/package_sync_checker.py  # dependency drift
python3 .agent/tools/guardians/zod_schema_locator.py    # inline Zod in routes
pnpm agent:janitor                                        # stray .md + lock files
```

| Role | Guardians |
|------|-----------|
| ARCHITECT | sync |
| BACKEND_ENGINEER | sync, zod, janitor |
| FRONTEND_ENGINEER | zod, janitor |
| EXTENSION_ENGINEER | sync, janitor |
| DASHBOARD_BUILDER | zod, janitor |
| ENV_ENGINEER | sync, janitor |
| BRAINBOX_AUDITOR | sync, zod, janitor |
| QA_EXAMINER | sync, zod |

## Release

```bash
pnpm tsx .agent/tools/release/version-bump.ts <X.Y.Z>
```
Updates: all `package.json` files + `apps/extension/manifest.json` + `apps/extension_v3/manifest.json`

## Automators

```bash
python3 .agent/tools/automators/env_vault_syncer.py  # sync .env → .env.example
node .agent/tools/automators/test-connection.js       # test localhost:5173, :3000, :3001
```

## Graph CLI

```bash
# Search
python3 .agent/tools/graph.py search --graph project "query"
python3 .agent/tools/graph.py search --graph knowledge "query"

# Add node
python3 .agent/tools/graph.py add --graph project --id <id> --desc <desc> --workspace <ws>
python3 .agent/tools/graph.py add --graph knowledge --id <id> --desc <desc> --tags '["tag1"]'

# Fallback (read-only if script fails)
grep "query" .agent/context/ProjectGraph.json
```

## Scoring

```bash
pnpm agent:score                                                          # interactive CLI
pnpm agent:report-task <ROLE> "desc" --difficulty <1-5>                  # report task
python3 .agent/tools/scoring/agent_cli.py checkpoint <ROLE> "desc"       # create checkpoint
python3 .agent/tools/scoring/agent_cli.py rollback <checkpoint_id|last>  # rollback
```

Difficulty scale: 1=trivial, 2=minor, 3=moderate, 4=significant, 5=major
