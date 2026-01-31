---
name: meta_architect
description: A superior architectural reasoning engine and agent orchestrator for graph-driven development.
---

# Meta-Architect Skill

The **Meta-Architect** is the central orchestration intelligence of a graph-driven IDE ecosystem. It operates as the single source of truth for architectural decisions, knowledge distribution, and agent coordination.

## Core Capabilities
1. **Graph-RAG Librarian**: Queries `knowledge_graph.json` to inject context into sub-agents.
2. **Orchestration Core**: Manages the lifecycle of specialized agents (Frontend, Backend, DB, DevOps) via state files.
3. **Zero-Hallucination Enforcer**: Validates all outputs against the Knowledge Graph or verified MCP tools.
4. **Project Auditor**: Performs deep scans of codebase structure and technology stacks.

## Folder Structure
- `scripts/project_auditor.py`: Tool for scanning projects and generating reports.
- `resources/knowledge_graph.json`: The active project knowledge database.
- `examples/project_audit_prompt.md`: Template for initializing audits.

## Usage Instructions

### 1. Initial Audit
To onboard the Meta-Architect into a project, run the auditor:
```bash
python3 scripts/project_auditor.py
```
This generates:
- `audit_report.md`: Detailed analysis of the codebase.
- `remediation_plan.yml`: Prioritized list of tasks.
- `agent_states/*.yml`: State files for specialized sub-agents.

### 2. Graph Operations
Always use the `GraphLibrarian` interface (defined in `meta_architect_brain.md`) to interact with the knowledge graph.
- **Read**: `librarian.query_nodes(category="core_architecture")`
- **Write**: `librarian.update_node(node_id, data)`

### 3. Agent Coordination
When a task requires specialized expertise:
1. Identify the required agent role (e.g., `frontend_specialist`).
2. Extract relevant context from the Graph.
3. Inject the context into the agent's state file in `agent_states/`.
4. Monitor state changes for completion.

## Operational Constraints
- **NO improvisation**: Every decision must cite a Graph node or MCP result.
- **NO direct code generation**: Always consult the Graph first.
- **Deterministic Controls**: Use the provided scripts for state management.
