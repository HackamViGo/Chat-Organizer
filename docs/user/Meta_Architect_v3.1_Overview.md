# Meta-Architect v3.1: System Overview

**Generated:** 2026-02-06
**Version:** 3.1.0 (Scorched Earth Edition)

---

## 1. The Binding Protocol: From Raw Prompt to Specialized Agent

**"Binding"** is the process where a generic LLM is constrained into a specific role. This is handled by **`.agent/skills/meta_architect/scripts/agent_factory.py`**.

1.  **Input:** The user selects a role (e.g., `extension_builder`) and defines a **Mission**.
2.  **Profile Loading:** The factory loads the corresponding YAML profile from `.agent/skills/meta_architect/profiles/` (defining permissions, tools, and behavior).
3.  **State Initialization:** A persistent state file is created in `agent_states/` using `state_manager.py`. This prevents "ghosting" by recording the mission start immediately.
4.  **Graph Injection:** The factory consults `knowledge_graph.json` to pull **Real-Time Context** (e.g., node IDs, URLs, dependencies) relevant to that specific role.
5.  **fusion:** The Profile, Mission, State ID, and Graph Context are fused into the `sub_agent_template.md` to generate the final **System Prompt**.

**Result:** The LLM is no longer a chatbot; it is a **State-Aware, Graph-Driven Agent**.

---

## 2. The Triad Architecture

The v3.1 workflow is built on a strict **Commander -> Builder -> Examiner** hierarchy.

### 👑 The Commander (Meta-Architect)
*   **Role:** Orchestrator & Planner.
*   **Responsibility:** Transforms user intent into atomic tasks. Assigns the correct "Tool Belt" to Builders.
*   **Tool:** `project_planner.py`.

### 🛠️ The Builder (Specialized Agents)
*   **Roles:** `EXTENSION_BUILDER`, `DASHBOARD_BUILDER`, `DB_ARCHITECT`, etc.
*   **Responsibility:** Execution. Writing code, modifying files, and running builds.
*   **Constraint:** Cannot mark their own work as "Complete" without verification.

### 🕵️ The Examiner (QA_EXAMINER)
*   **Role:** The Auditor.
*   **Responsibility:** Blind verification. Runs audits (like the "Total URL Audit"), health checks, and security scans.
*   **Power:** Has the authority to reject a Builder's work if `Health Score < 80`.

---

## 3. The Safety Gates

The system is designed to fail safe. Multiple layers of protection exist to prevent codebase corruption.

### 🛡️ Tool Belts (The "Can Do" List)
Defined in `agent_factory.py` and the Profile YAMLs. An Agent **physically cannot** access tools outside its belt.
*   *Example:* `QA_EXAMINER` has `read_only` access to source code but can `write` to reports.

### 🚧 The Health Gate
*   **Rule:** "A task is NOT done until `pnpm verify` returns a Health Score > 80."
*   **Mechanism:** `.agent/skills/meta_architect/scripts/project_health_check.py`.
*   **Effect:** Automatic process termination if the score drops critically.

### 🚪 Exit Protocol (Anti-Ghosting)
Mandatory sequence defined in `.cursorrules.md`:
1.  **Log:** Append robust logs to `docs/agents/logs/`.
2.  **State:** Update `agent_states/{role}_state.yml` to `IDLE` or `FAILED`.
3.  **Report:** Notify the user.
*If an agent stops responding, the `state` file remains "ACTIVE", flagging an anomaly.*

---

## 4. The Living Knowledge (Context7 & Graph Guardian)

The system fights "Knowledge Decay" (stale documentation) through two mechanisms.

### 🕸️ The Graph Guardian
*   **Trigger:** When a file or node hasn't been touched in >30 days.
*   **Action:** Forces a re-verification of that node's metadata in `knowledge_graph.json`.
*   **Directives:** Ensures that the "Mental Model" matches the "Physical Code".

### 🧠 Context7 & Knowledge Injection
*   **Context7:** The external library interface. Used *only* when explicitly allowed to fetch up-to-date documentation for libraries (e.g., "Next.js 14 App Router docs").
*   **Injection:** `agent_factory.py` effectively "retrieves" context before the Agent even wakes up.
*   **Rule:** **Zero-Hallucination**. Every architectural decision must reference a valid `node_id`.

---
*For more technical details, consult `.agent/skills/meta_architect/skills.md`.*
