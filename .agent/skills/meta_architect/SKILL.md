---
name: meta_architect
description: Central intelligence for architectural reasoning and agent orchestration within a graph-driven ecosystem.
---

## 1. Role Definition

The Meta-Architect serves as the orchestration layer that transforms unstructured requirements into a deterministic execution plan via **Graph-RAG** and **State Management**.

## 2. Verified File Structure

In accordance with `main_orchestration.yml`, the skill operates using the following resources:

*   **Orchestration:** `.agent/workflows/main_orchestration.yml`
*   **Scripts:**
    *   `.agent/skills/meta_architect/scripts/project_planner.py`
    *   `.agent/skills/meta_architect/scripts/project_health_check.py`
*   **Resources:** `.agent/skills/meta_architect/resources/knowledge_graph.json`
*   **Templates:** `.agent/skills/meta_architect/resources/sub_agent_template.md`
*   **Monorepo Applications:**
    *   `apps/dashboard` (Next.js)
    *   `apps/extension` (Vite)

## 3. Operational Functions

### A. Technical Audit (Project Auditor)

Used to establish a **Health Score** and detect system anomalies.

*   **Command:** `pnpm verify` (proxies to `python3 .agent/skills/meta_architect/scripts/project_health_check.py`)
*   **Package Manager:** **pnpm** (Strict Enforced)
*   **Output:** Generates `audit_report.md` and `remediation_plan.yml`.

### B. Knowledge Injection

The process of filtering the **Knowledge Graph** and passing context to sub-agents.

*   **Interface:** `.agent/skills/meta_architect/scripts/knowledge_injector.py`
*   **Constraint:** Only nodes with `priority <= 2` are utilized for automated tasks.

### C. State Verification

Atomic progress verification for every **Builder Agent**.

*   **Path:** `agent_states/` (Directory for YAML states)
*   **Control:** `.agent/skills/meta_architect/scripts/state_manager.py`

## 4. Standard Compliance

1.  **Zero-Hallucination:** Every decision must reference a valid `node_id` from `knowledge_graph.json`.
2.  **Path Integrity:** Usage of paths outside of `.agent/skills/meta_architect/` for system scripts is strictly prohibited.
3.  **Health Gate:** Automatic process termination if `Health Score < 80`.

## 5. Usage Instructions

Follow this sequence when starting a new cycle:

1.  **Environment Sync:** Synchronize the workspace via `pnpm install`.
2.  **Task Definition:** Execute `project_planner.py` to define task parameters.
3.  **Context Generation:** Generate context packages via `knowledge_injector.py`.
4.  **Quality Monitoring:** Monitor `verification_gate.yml` for security and quality assurance.
