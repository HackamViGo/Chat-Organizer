# Skill: MCP Knowledge Graph — Project Intelligence

## Purpose
Maintain and query the internal project dependency graph, ownership map,
and phase impact analysis for informed decision-making.

## Graph Location
```
.agent/context/knowledge_graph.json   ← Domain logic & business rules
.agent/context/ProjectGraph.json     ← File dependencies & ownership
```

## Graph Structure

### Knowledge Graph (Domain)
```json
{
  "nodes": [
    {
      "id": "extension-v3",
      "type": "module",
      "description": "Chrome Extension v3 rebuild",
      "status": "active",
      "owner": "EXTENSION_ENGINEER"
    },
    {
      "id": "dashboard-api",
      "type": "service",
      "description": "Next.js API routes for data persistence",
      "owner": "BACKEND_ENGINEER"
    },
    {
      "id": "gemini-capture",
      "type": "feature",
      "description": "Passive chat capture from Gemini",
      "parent": "extension-v3",
      "status": "implemented"
    }
  ],
  "edges": [
    {
      "from": "extension-v3",
      "to": "dashboard-api",
      "type": "depends_on",
      "contract": "POST /api/chats, GET /api/folders"
    },
    {
      "from": "extension-v3",
      "to": "shared-package",
      "type": "imports",
      "items": ["Message type", "PromptSyncManager", "Platform enum"]
    }
  ]
}
```

### Project Graph (Files)
```json
{
  "modules": {
    "extension-v3": {
      "root": "apps/extension_v3/src/",
      "owner": "EXTENSION_ENGINEER",
      "entry": "background/service-worker.ts",
      "critical_files": [
        "background/modules/authManager.ts",
        "background/modules/messageRouter.ts",
        "background/modules/platformAdapters/gemini.adapter.ts",
        "lib/normalizers.ts",
        "lib/schemas.ts"
      ]
    },
    "dashboard": {
      "root": "apps/dashboard/src/",
      "owner": "FRONTEND_ENGINEER",
      "entry": "src/app/",
      "critical_files": [
        "app/api/chats/route.ts",
        "app/api/folders/route.ts",
        "app/api/auth/refresh/route.ts"
      ]
    }
  },
  "cross_module_dependencies": [
    {
      "source": "extension-v3/dashboardApi.ts",
      "target": "dashboard/api/chats/route.ts",
      "type": "http",
      "contract": "POST /api/chats",
      "breaking_change_risk": "high"
    }
  ]
}
```

## Operations

### Query: Impact Analysis
```
Question: "What breaks if I change the Message interface?"

Process:
  1. Find all nodes that import Message type
  2. Trace edges to find dependent modules
  3. List all affected files

Result:
  - packages/shared/src/types/index.ts (source)
  - apps/extension_v3/src/lib/schemas.ts (re-export)
  - apps/extension_v3/src/lib/normalizers.ts (all normalize functions)
  - apps/extension_v3/src/background/modules/dashboardApi.ts (payload)
  - apps/dashboard/src/app/api/chats/route.ts (receiver)
  
  Impact: HIGH — change must be coordinated across 3 modules
  Protocol: Update shared → extension → dashboard simultaneously
```

### Query: Ownership Check
```
Question: "Who owns normalizers.ts?"

Process:
  1. Find file in project graph
  2. Check module owner

Result:
  Module: extension-v3
  Owner: EXTENSION_ENGINEER
  Verdict: EXTENSION_ENGINEER can modify freely
```

### Query: Phase Impact
```
Question: "What does Phase 2 (Claude) add?"

Process:
  1. Find phase definition
  2. List new files
  3. List modified files
  4. Check cross-module impact

Result:
  New files:
    - content/claude-bridge.ts
    - platformAdapters/claude.adapter.ts
  Modified files:
    - platformAdapters/index.ts (add to registry)
    - manifest.json (add content_script)
  Cross-module impact: NONE (adapter is self-contained)
```

### Update: After Completing Work
```
After finishing a task:
  1. Run: python .agent/tools/graph.py
  2. This updates both knowledge_graph.json and ProjectGraph.json
  3. New nodes/edges are added for new files and dependencies
  4. Status of existing nodes is updated
```

## Handoff Generation
```
When work requires another role:

1. Identify the dependency in the graph
2. Create handoff entry in .agent/dependencies.json:
   {
     "id": "handoff-001",
     "from_role": "EXTENSION_ENGINEER",
     "to_role": "BACKEND_ENGINEER",
     "context": "Need upsert logic in POST /api/chats to prevent duplicate saves",
     "files_affected": ["apps/dashboard/src/app/api/chats/route.ts"],
     "priority": "high",
     "status": "pending"
   }
3. Update graph with new edge
4. Notify user about cross-role dependency
```

## Graph Maintenance Rules
```
✅ Update after every completed phase
✅ Update after structural changes (new files, deleted files)
✅ Update after discovering new cross-module dependencies
✅ Use tools/graph.py — never edit JSON manually

❌ Don't add speculative nodes (only actual implementations)
❌ Don't remove nodes for legacy code (mark as deprecated instead)
❌ Don't add edges for optional/future dependencies
```
