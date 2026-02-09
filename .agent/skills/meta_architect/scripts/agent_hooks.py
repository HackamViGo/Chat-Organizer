"""
agent_hooks.py - Meta-Architect Knowledge Injection Engine
Production Implementation (2024-2026 Standards)

This module provides the Python logic for the Meta-Architect to perform
"Knowledge Injection" into sub-agents using Graph-RAG and MCP integration.

Based on:
- Anthropic MCP Specification 2025-11-25
- Claude Code Agent SDK Best Practices
- OpenAI Swarm Handoff Patterns
- Google Vertex AI Agent Engine State Management
"""

import json
import yaml
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum

# Ensure script directory is in path for imports
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from graph_query import GraphNode, GraphQuery


# ============================================================================
# TYPE DEFINITIONS
# ============================================================================

class AgentRole(Enum):
    """Supported builder agent roles"""
    FRONTEND_SPECIALIST = "frontend_specialist"
    BACKEND_SPECIALIST = "backend_specialist"
    DB_ARCHITECT = "db_architect"
    DEVOPS_ENGINEER = "devops_engineer"
    AI_INTEGRATOR = "ai_integrator"


class TaskStatus(Enum):
    """Agent task execution states"""
    IDLE = "IDLE"
    ACTIVE = "ACTIVE"
    WAITING = "WAITING"
    BLOCKED = "BLOCKED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


# GraphNode definition removed (DRY)


@dataclass
class ContextPackage:
    """Knowledge injection package for a sub-agent"""
    agent_role: str
    generated_at: str
    nodes: List[GraphNode]
    constraints: List[str]
    rules: List[str]
    mcp_tools_enabled: List[str]


@dataclass
class AgentState:
    """Complete state representation for an agent"""
    agent_id: str
    role: AgentRole
    status: TaskStatus
    assigned_task: Dict
    context_injection: Dict
    checkpoints: List[Dict]
    escalations: List[Dict]
    output_artifacts: List[Dict]


# ============================================================================
# GRAPH LIBRARIAN (Core Engine)
# ============================================================================

class GraphLibrarian(GraphQuery):
    """
    The Meta-Architect's primary interface to the Knowledge Graph.
    
    Refactor Note: Inherits from GraphQuery to eliminate duplicate loading logic.
    Maintains original API for backward compatibility with KnowledgeInjector.
    """
    
    def __init__(self, graph_path: str = "knowledge_graph.json"):
        # Initialize parent GraphQuery (handles loading)
        super().__init__(graph_path)

    # _load_graph removed (DRY - handled by parent)


# ============================================================================
# KNOWLEDGE INJECTOR
# ============================================================================

class KnowledgeInjector:
    """
    Constructs context packages based on agent roles and tasks.
    """
    
    def __init__(self, librarian: GraphLibrarian):
        self.librarian = librarian
        
    def generate_injection_package(
        self, 
        agent_role: AgentRole,
        requirements: List[str],
        mcp_tools: List[str]
    ) -> ContextPackage:
        """
        Build a deterministic context package for an agent.
        """
        # 1. Map Role to Category
        category_map = {
            AgentRole.FRONTEND_SPECIALIST: "Programming Languages & Frameworks",
            AgentRole.BACKEND_SPECIALIST: "Programming Languages & Frameworks",
            AgentRole.DB_ARCHITECT: "Databases & Data Infrastructure",
            AgentRole.DEVOPS_ENGINEER: "Cloud Platforms & DevOps",
            AgentRole.AI_INTEGRATOR: "AI Models & LLM Development"
        }
        
        target_category = category_map.get(agent_role, "General")
        
        # 2. Query Graph (Priority 1 & 2 only)
        # Using Safe Query from parent
        query_result = self.librarian.safe_query(
            category=target_category,
            keywords=requirements, 
            priority=2 # Strict filter
        )
        
        nodes = query_result.get("data", [])
        
        # 3. Add Identity-Locked Nodes (Always inject Priority 1 for category)
        locked_ids = self.librarian.get_locked_nodes(target_category)
        
        # Avoid duplicates
        existing_ids = {n.id for n in nodes}
        
        for locked_id in locked_ids:
            if locked_id not in existing_ids:
                # We need to fetch the full node object
                # This is a bit inefficient but safe
                for node_data in self.librarian.graph.get("nodes", []):
                    if node_data["id"] == locked_id:
                        meta = node_data.get("metadata", {})
                        nodes.append(GraphNode(
                            id=node_data["id"],
                            type=node_data["type"],
                            url=meta.get("access_url", ""),
                            category=meta.get("category", ""),
                            sub_category=meta.get("sub_category", ""),
                            priority=meta.get("priority", 1),
                            connections=self.librarian._get_connections(locked_id, 1)
                        ))
                        break
        
        # 4. Define Constraints
        constraints = [
            "Use ONLY the libraries specified in the graph nodes",
            "Do not introduce new dependencies without approval",
            "Follow the architecture pattern: Monorepo (Turborepo) + Next.js + Vite"
        ]
        
        # 5. Define Rules
        rules = [
            "Always verify code with 'npm run typelock'",
            "Update 'task.md' after every major step",
            "Use 'notify_user' if blocked"
        ]
        
        return ContextPackage(
            agent_role=agent_role.value,
            generated_at=datetime.now().isoformat(),
            nodes=nodes,
            constraints=constraints,
            rules=rules,
            mcp_tools_enabled=mcp_tools
        )
        
    def save_to_file(self, package: ContextPackage, output_dir: Path) -> Path:
        """Serialize context package to markdown/json for agent consumption"""
        output_dir.mkdir(parents=True, exist_ok=True)
        filename = f"context_{package.agent_role}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        filepath = output_dir / filename
        
        content = self.render_as_markdown(package)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
            
        return filepath
        
    def render_as_markdown(self, package: ContextPackage) -> str:
        """Convert context package to human/LLM-readable markdown"""
        md = f"# Context Package: {package.agent_role}\n"
        md += f"Generated: {package.generated_at}\n\n"
        
        md += "## 1. Approved Resources (Knowledge Graph)\n"
        for node in package.nodes:
            priority_icon = "🔒" if node.priority == 1 else "✅"
            md += f"- {priority_icon} **{node.id}** ({node.type}): {node.url}\n"
            
        md += "\n## 2. Hard Constraints\n"
        for constraint in package.constraints:
            md += f"- 🔴 {constraint}\n"
            
        md += "\n## 3. Operational Rules\n"
        for rule in package.rules:
            md += f"- ⚠️ {rule}\n"
            
        md += "\n## 4. Enabled Tools\n"
        md += f"Tools: {', '.join(package.mcp_tools_enabled)}\n"
        
        return md


# ============================================================================
# AGENT STATE MANAGER
# ============================================================================

class AgentStateManager:
    """
    Manages the lifecycle and persistence of agent states.
    Verifies atomic progression of tasks.
    """
    
    def __init__(self, state_dir: str = "agent_states"):
        self.state_dir = Path(state_dir)
        self.state_dir.mkdir(exist_ok=True)
        
    def create_agent_state(
        self,
        role: AgentRole,
        task_description: str,
        context_package_path: Path
    ) -> AgentState:
        """Initialize a new agent state."""
        agent_id = f"{role.value}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        state = AgentState(
            agent_id=agent_id,
            role=role,
            status=TaskStatus.IDLE,
            assigned_task={
                "id": f"TASK_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "description": task_description,
                "started_at": None
            },
            context_injection={
                "last_update": datetime.now(datetime.UTC).isoformat().replace('+00:00', 'Z') if hasattr(datetime, 'UTC') else datetime.utcnow().isoformat() + 'Z',
                "package_path": str(context_package_path)
            },
            checkpoints=[],
            escalations=[],
            output_artifacts=[]
        )
        
        return state
    
    def save_state(self, state: AgentState) -> Path:
        """Persist agent state to YAML file (atomic write)."""
        filename = f"{state.agent_id}.yml"
        filepath = self.state_dir / filename
        
        # Convert to dict
        state_dict = {
            "agent_id": state.agent_id,
            "role": state.role.value,
            "status": state.status.value,
            "assigned_task": state.assigned_task,
            "context_injection": state.context_injection,
            "checkpoints": state.checkpoints,
            "escalations": state.escalations,
            "output_artifacts": state.output_artifacts
        }
        
        # Atomic write
        temp_filepath = filepath.with_suffix('.tmp')
        with open(temp_filepath, 'w', encoding='utf-8') as f:
            yaml.dump(state_dict, f, default_flow_style=False, sort_keys=False)
        temp_filepath.rename(filepath)
        
        print(f"[AgentStateManager] Saved state: {filepath}")
        return filepath
    
    def load_state(self, agent_id: str) -> AgentState:
        """Load agent state from file."""
        filepath = self.state_dir / f"{agent_id}.yml"
        
        with open(filepath, 'r', encoding='utf-8') as f:
            state_dict = yaml.safe_load(f)
        
        return AgentState(
            agent_id=state_dict["agent_id"],
            role=AgentRole(state_dict["role"]),
            status=TaskStatus(state_dict["status"]),
            assigned_task=state_dict["assigned_task"],
            context_injection=state_dict["context_injection"],
            checkpoints=state_dict.get("checkpoints", []),
            escalations=state_dict.get("escalations", []),
            output_artifacts=state_dict.get("output_artifacts", [])
        )
    
    def update_status(self, agent_id: str, new_status: TaskStatus):
        state = self.load_state(agent_id)
        state.status = new_status
        self.save_state(state)
        print(f"[AgentStateManager] Updated {agent_id} status to {new_status.value}")
    
    def add_checkpoint(self, agent_id: str, action: str, files_modified: List[str]):
        state = self.load_state(agent_id)
        iso_time = datetime.now(datetime.UTC).isoformat().replace('+00:00', 'Z') if hasattr(datetime, 'UTC') else datetime.utcnow().isoformat() + 'Z'
        checkpoint = {
            "timestamp": iso_time,
            "action": action,
            "files_modified": files_modified
        }
        state.checkpoints.append(checkpoint)
        self.save_state(state)
        print(f"[AgentStateManager] Added checkpoint to {agent_id}: {action}")
    
    def add_escalation(self, agent_id: str, issue: str):
        state = self.load_state(agent_id)
        iso_time = datetime.now(datetime.UTC).isoformat().replace('+00:00', 'Z') if hasattr(datetime, 'UTC') else datetime.utcnow().isoformat() + 'Z'
        escalation = {
            "timestamp": iso_time,
            "issue": issue,
            "status": "PENDING"
        }
        state.escalations.append(escalation)
        state.status = TaskStatus.BLOCKED
        self.save_state(state)
        print(f"[AgentStateManager] ESCALATION from {agent_id}: {issue}")

if __name__ == "__main__":
    # Example Usage
    print("AgentHooks Module Loaded - Importable")
