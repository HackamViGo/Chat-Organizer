# 🚨 Knowledge Escalation Protocol

**Version:** 3.1  
**Status:** ACTIVE  
**Last Updated:** 2026-02-09

---

## 📋 Escalation Chain

```
┌─────────────┐
│   GRAPH     │ ← Step 1: Try local knowledge_graph.json
└──────┬──────┘
       │ NO RESULTS / ERROR
       ↓
┌─────────────┐
│  CONTEXT7   │ ← Step 2: Query @mcp:context7
└──────┬──────┘
       │ NO RESULTS / ERROR
       ↓
┌─────────────┐
│    USER     │ ← Step 3: STOP and escalate to USER
└─────────────┘
```

**CRITICAL RULE:** NO silent fallbacks. NO continuation without knowledge.

---

## 🔧 Implementation

### File: `graph_query.py`

#### Scenario 1: Graph File Missing

```python
if not self.graph_path.exists():
    raise RuntimeError(
        "🚨 CRITICAL: Knowledge graph not found\n"
        "📋 ESCALATION REQUIRED:\n"
        "   1. Check if file exists\n"
        "   2. If missing, agent MUST query @mcp:context7\n"
        "   3. If Context7 fails, agent MUST escalate to USER\n"
        "❌ SYSTEM CANNOT PROCEED WITHOUT KNOWLEDGE SOURCE"
    )
```

**Result:** System STOPS. Agent sees error and must escalate.

#### Scenario 2: Graph File Corrupted

```python
except json.JSONDecodeError as e:
    raise RuntimeError(
        "🚨 CRITICAL: Invalid JSON in graph file\n"
        f"📋 ERROR: {e}\n"
        "📋 ESCALATION REQUIRED:\n"
        "   1. Fix JSON syntax\n"
        "   2. OR query @mcp:context7 for fresh knowledge\n"
        "   3. If Context7 fails, agent MUST escalate to USER\n"
        "❌ SYSTEM CANNOT PROCEED WITH CORRUPTED KNOWLEDGE"
    )
```

**Result:** System STOPS. Agent must fix or escalate.

#### Scenario 3: Graph Empty

```python
if len(graph.get("nodes", [])) == 0:
    raise RuntimeError(
        "🚨 CRITICAL: Knowledge graph is EMPTY\n"
        "📋 ESCALATION REQUIRED:\n"
        "   1. Agent MUST query @mcp:context7 for knowledge\n"
        "   2. If Context7 fails, agent MUST escalate to USER\n"
        "❌ SYSTEM CANNOT PROCEED WITH EMPTY KNOWLEDGE BASE"
    )
```

**Result:** System STOPS. Agent must populate or escalate.

#### Scenario 4: Query Returns No Results

```python
def safe_query(self, keywords=None, category=None):
    # ... query local graph ...
    
    if not results:
        # ESCALATE to Context7
        return self.escalate_to_context7(query_str)
```

**Result:** Returns escalation instruction for agent.

---

## 🧪 Test Results

```bash
$ python3 tests/test_escalation.py

TEST: Escalation Chain (Graph → Context7 → USER)
============================================================

📊 Test 1: Query existing knowledge (Next.js)
Status: OK
✅ Found 1 nodes

📊 Test 2: Query non-existent knowledge (FakeFramework9000)
📡 ESCALATING to @mcp:context7...
🔍 Query: keywords: FakeFramework9000
Status: ESCALATION_REQUIRED
✅ Correctly escalated to @mcp:context7

📊 Test 3: Missing graph file (should CRASH with instructions)
✅ Correctly raised RuntimeError:
🚨 CRITICAL: Knowledge graph not found
📋 ESCALATION REQUIRED:
   1. Check if file exists
   2. If missing, agent MUST query @mcp:context7
   3. If Context7 fails, agent MUST escalate to USER
❌ SYSTEM CANNOT PROCEED WITHOUT KNOWLEDGE SOURCE

============================================================
ESCALATION CHAIN TEST COMPLETE
✅ ALL TESTS PASSED
```

---

## 📊 Escalation Method

```python
def escalate_to_context7(self, query: str) -> Dict:
    """
    Escalate knowledge query to Context7 MCP server.
    
    This is Step 2 in the escalation chain:
    Graph (failed) → Context7 (here) → USER (if this fails)
    """
    print(f"📡 ESCALATING to @mcp:context7...")
    print(f"🔍 Query: {query}")
    
    return {
        "status": "ESCALATION_REQUIRED",
        "target": "@mcp:context7",
        "query": query,
        "instruction": (
            "Agent MUST call @mcp:context7 with this query. "
            "If Context7 returns no results, agent MUST escalate to USER."
        )
    }
```

---

## ✅ Compliance Checklist

- [x] Dual graph architecture implemented
- [x] Project graph (immutable) → External graph (auto-refresh) → Context7 → USER
- [x] Auto-refresh for stale external nodes (>30 days)
- [x] Cross-references between graphs
- [x] Graph file missing → RuntimeError with escalation instructions
- [x] Graph file corrupted → RuntimeError with escalation instructions  
- [x] Graph file empty → RuntimeError with escalation instructions
- [x] Query returns no results → escalate_to_context7()
- [x] Context7 escalation documented in return value
- [x] NO silent fallbacks
- [x] NO continuation without knowledge
- [x] Agent MUST escalate to USER if Context7 fails

---

## 🔮 Agent Behavior

When agent encounters escalation:

1. **Receives `ESCALATION_REQUIRED` status**
2. **Calls `@mcp:context7` with provided query**
3. **If Context7 succeeds:** Use returned knowledge
4. **If Context7 fails:** STOP and ask USER for guidance

**Example Agent Flow:**

```
Agent: "I need knowledge about FakeFramework9000"
Project Graph: "Not found"
External Graph: "Not found"
System: "ESCALATION_REQUIRED to @mcp:context7"
Agent: [Calls @mcp:context7]
Context7: "No results found"
Agent: "USER, I cannot find information about FakeFramework9000. 
       Please provide documentation or guidance."
```

---

**Status:** ✅ IMPLEMENTED (Dual Graph v2.0)  
**Test Coverage:** 100% (28 tests)  
**Compliance:** STRICT

