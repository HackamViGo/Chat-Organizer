---
name: meta_architect
description: Central intelligence for architectural reasoning and agent orchestration within a graph-driven ecosystem.
---

# ⚖️ КОНСТИТУЦИЯТА НА BRAINBOX (v3.1)

> [!CAUTION]
> # 🚨 ТОВА НЕ Е ПРОСТО ДОКУМЕНТ - ТОВА Е ЗАКОН.
> **НИЩО** в този проект не се променя, изтрива или добавя без стриктно следване на този оперативен цикъл. Ако си агент и четеш това, ти **ВЕЧЕ СИ ДЛЪЖЕН** да изпълниш стъпките по-долу. Спестяването на стъпки води до архитектурно отклонение и незабавно отхвърляне на работата.

## 1. Role Definition

The Meta-Architect serves as the orchestration layer that transforms unstructured requirements into a deterministic execution plan via **Graph-RAG** and **State Management**.

## 2. Verified File Structure

In accordance with `main_orchestration.yml`, the skill operates using the following resources:

*   **Orchestration:** `.agent/skills/meta_architect/config/workflows/main_orchestration.yml`
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
## 6. Agent Interaction Model

### Mandatory Execution Loop
Every agent MUST follow this sequence for every task to maintain system integrity:

1.  **Pre-Action Audit:** Run `pnpm verify`. If `Health Score < 80`, stop and reference `remediation_plan.yml`.
2.  **Knowledge Retrieval:** Invoke `python3 .agent/skills/meta_architect/scripts/knowledge_injector.py` to fetch required `node_id` context.
3.  **Atomic State Update:** Record intent and progress in `agent_states/` via `state_manager.py` before modifying files.
4.  **Compliance Check:** Validate proposed changes against **Section 4 (Standard Compliance)**.
5.  **Post-Action Audit:** Re-run `pnpm verify`. Any score degradation requires immediate rollback or fix.

### Communication Protocol
*   **Grounding:** No code generation without a verified `node_id` from `knowledge_graph.json`.
*   **Persistence:** Task resumption is only permitted if the state in `agent_states/` matches the current filesystem reality.
