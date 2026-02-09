# 📊 Dual Graph Architecture

**Version:** 2.0  
**Status:** ACTIVE  
**Last Updated:** 2026-02-09

---

## 🎯 Overview

The Meta-Architect system now uses **dual graph architecture** to separate external knowledge (libraries/frameworks from Context7) from internal knowledge (project-specific patterns and conventions).

---

## 📁 Graph Structure

### Graph 1: `external_knowledge.json` (Context7 Cache)

**Purpose:** Cache external library/framework documentation  
**Source:** @mcp:context7  
**Features:**
- Auto-refresh for stale nodes (>30 days)
- Timestamps for freshness tracking
- Cross-references to project graph

**Schema:**
```json
{
  "metadata": {
    "version": "1.0",
    "source": "context7",
    "description": "External library/framework documentation cache",
    "last_global_refresh": "2026-02-09",
    "node_count": 140
  },
  "nodes": [
    {
      "id": "react-hooks",
      "type": "library",
      "last_updated": "2026-02-09",
      "metadata": {
        "category": "Programming Languages & Frameworks",
        "sub_category": "JavaScript",
        "priority": 1,
        "access_url": "https://react.dev/reference/react"
      },
      "referenced_by": ["brainbox-ui-patterns"]
    }
  ]
}
```

### Graph 2: `project_knowledge.json` (Project Truth)

**Purpose:** Store project-specific architecture, patterns, and conventions  
**Source:** Manual + Agent updates  
**Features:**
- Immutable (no auto-refresh)
- Project-specific rules and patterns
- Cross-references to external graph

**Schema:**
```json
{
  "metadata": {
    "version": "1.0",
    "source": "project",
    "description": "BrainBox project-specific architecture and patterns",
    "project_name": "BrainBox - AI Chat Organizer",
    "node_count": 56
  },
  "nodes": [
    {
      "id": "hybrid-sidebar-pattern",
      "type": "component_pattern",
      "metadata": {
        "category": "UI Architecture",
        "priority": 1,
        "file_path": "apps/dashboard/src/components/HybridSidebar.tsx"
      },
      "rules": [
        "Use glassmorphism for background",
        "Icons must be anchored during animation",
        "No layout shifts on expand/collapse"
      ],
      "external_refs": ["react-hooks", "nextjs-app-router"]
    }
  ]
}
```

---

## 🔍 Query Flow

```
┌─────────────────────────────────────────────────────────┐
│                    DualGraphQuery                       │
└─────────────────────────────────────────────────────────┘
                          │
                          ↓
         ┌────────────────┴────────────────┐
         │                                 │
         ↓                                 ↓
┌─────────────────┐              ┌─────────────────┐
│ PROJECT GRAPH   │              │ EXTERNAL GRAPH  │
│ (Priority 1)    │              │ (Priority 2)    │
└─────────────────┘              └─────────────────┘
         │                                 │
         │ Found?                          │ Found?
         ├─ YES → Return + Enrich          ├─ YES → Auto-refresh if stale
         │        with external_refs       │        → Return + Enrich
         │                                 │           with referenced_by
         ├─ NO → Continue                  │
         │                                 ├─ NO → Continue
         ↓                                 ↓
┌──────────────────────────────────────────────────────┐
│              ESCALATE TO CONTEXT7                    │
│              (Priority 3)                            │
└──────────────────────────────────────────────────────┘
                          │
                          │ Found?
                          ├─ YES → Cache in external_graph
                          │        → Return
                          │
                          ├─ NO → ESCALATE TO USER
                          │       → STOP
                          ↓
┌──────────────────────────────────────────────────────┐
│              USER INTERVENTION REQUIRED              │
│              (Priority 4 - FINAL)                    │
└──────────────────────────────────────────────────────┘
```

---

## 🔄 Auto-Refresh Mechanism

### Trigger Conditions

External nodes are auto-refreshed when:
1. Node is queried
2. `last_updated` > 30 days old
3. Context7 is available

### Refresh Process

```python
def check_and_refresh(nodes):
    for node in nodes:
        age_days = (today - node.last_updated).days
        
        if age_days > 30:
            # STALE: Auto-refresh from Context7
            fresh_data = context7.query(node.id)
            
            if fresh_data:
                node.content = fresh_data
                node.last_updated = today
                save_graph()
            else:
                # STRICT: No stale data returned
                raise RuntimeError(
                    "Cannot refresh node. "
                    "Escalate to @mcp:context7 or USER."
                )
    
    return nodes
```

### Strict Rules

- ❌ NO stale data returned (>30 days)
- ❌ NO silent fallbacks
- ✅ STOP and escalate if Context7 fails
- ✅ Update persisted immediately

---

## 🔗 Cross-References

### External → Project

External nodes can reference project implementations:

```json
{
  "id": "nextjs-app-router",
  "type": "library",
  "referenced_by": ["brainbox-routing-pattern"]
}
```

**Use case:** Show agents how the project uses this library

### Project → External

Project nodes can reference external docs:

```json
{
  "id": "brainbox-routing-pattern",
  "type": "architecture",
  "external_refs": ["nextjs-app-router", "react-hooks"]
}
```

**Use case:** Enrich project patterns with official documentation

---

## 🧪 Testing

### Test Coverage

- **15 tests** in `test_meta_architect.py` (100% pass rate)
- **13 tests** in `test_dual_graph.py` (100% pass rate)
- **Total:** 28 tests, 100% pass rate

### Test Categories

1. **Config Tests** - Dual graph paths, freshness threshold
2. **External Graph Tests** - Loading, querying, auto-refresh
3. **Project Graph Tests** - Loading, querying, immutability
4. **Dual Query Tests** - Priority, escalation, cross-references
5. **Integration Tests** - Backward compatibility, config integration

---

## 🔧 Migration

### One-Time Migration

Run the migration script to split existing `knowledge_graph.json`:

```bash
python3 .agent/skills/meta_architect/scripts/migrate_graphs.py
```

**Result:**
- `knowledge_graph.json` → backed up to `knowledge_graph.backup.json`
- `external_knowledge.json` created (140 nodes)
- `project_knowledge.json` created (56 nodes)
- Cross-references added automatically

### Categorization Rules

**External nodes:**
- type: library, framework, tool, api, service
- category: Programming Languages & Frameworks, Databases, Cloud, etc.

**Internal nodes:**
- type: component_pattern, convention, architecture, workflow
- category: BrainBox Architecture, Project Standards, etc.

---

## 📋 Usage Examples

### Query Project Knowledge

```python
from graph_query import DualGraphQuery

gq = DualGraphQuery()
result = gq.safe_query(keywords=["hybrid-sidebar"])

# Returns project-specific patterns
# Enriched with external React/Next.js docs
```

### Query External Knowledge

```python
result = gq.safe_query(keywords=["react", "hooks"])

# Returns React docs from external graph
# Auto-refreshed if >30 days old
# Shows project usage if available
```

### Handle Escalation

```python
result = gq.safe_query(keywords=["unknown-framework"])

if result["status"] == "ESCALATION_REQUIRED":
    # Agent must call @mcp:context7
    # If Context7 fails, escalate to USER
    print(result["instruction"])
```

---

## ✅ Benefits

1. **Clear Separation**
   - External knowledge (auto-refreshed) vs Project knowledge (immutable)
   
2. **Always Fresh**
   - External docs never >30 days old
   - Automatic refresh on first access
   
3. **Strict Escalation**
   - No silent fallbacks
   - No stale data returned
   - Clear escalation chain
   
4. **Cross-Enrichment**
   - Project patterns enriched with official docs
   - External docs enriched with project usage
   
5. **Backward Compatible**
   - `GraphQuery = DualGraphQuery` alias
   - No breaking changes in existing code

---

## 🚨 Important Notes

- **External graph** is a **cache**, not source of truth (Context7 is)
- **Project graph** is **source of truth** for project knowledge
- **Auto-refresh** is **automatic** and **strict** (no stale data)
- **Escalation** is **mandatory** when knowledge is missing

---

**Status:** ✅ IMPLEMENTED  
**Test Coverage:** 100%  
**Migration:** Complete (196 → 140 + 56 nodes)
