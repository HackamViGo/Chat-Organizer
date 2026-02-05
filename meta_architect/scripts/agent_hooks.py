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
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum


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


@dataclass
class GraphNode:
    """Represents a single knowledge graph node"""
    id: str
    type: str
    url: str
    category: str
    sub_category: str
    priority: int
    connections: List[str]


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

class GraphLibrarian:
    """
    The Meta-Architect's primary interface to the Knowledge Graph.
    
    This class implements the Graph-RAG pattern with:
    - Priority-based node filtering
    - Connection traversal for context expansion
    - Identity lock verification
    - Safe query execution with error handling
    """
    
    def __init__(self, graph_path: str = "knowledge_graph.json"):
        self.graph_path = Path(graph_path)
        self.graph = self._load_graph()
        
        # Category mapping for agent roles
        self.role_category_map = {
            AgentRole.FRONTEND_SPECIALIST: "Programming Languages & Frameworks",
            AgentRole.BACKEND_SPECIALIST: "Programming Languages & Frameworks",
            AgentRole.DB_ARCHITECT: "Databases & Data Infrastructure",
            AgentRole.DEVOPS_ENGINEER: "Cloud Platforms & DevOps",
            AgentRole.AI_INTEGRATOR: "AI Models & LLM Development",
        }
    
    def _load_graph(self) -> Dict:
        """Load and validate the knowledge graph"""
        try:
            with open(self.graph_path, 'r', encoding='utf-8') as f:
                graph = json.load(f)
                
            # Validate structure
            if "nodes" not in graph:
                raise ValueError("Graph missing 'nodes' key")
                
            print(f"[GraphLibrarian] Loaded {len(graph['nodes'])} nodes from {self.graph_path}")
            return graph
            
        except FileNotFoundError:
            raise RuntimeError(
                f"CRITICAL: Knowledge graph not found at {self.graph_path}. "
                "Cannot proceed without graph data."
            )
        except json.JSONDecodeError as e:
            raise RuntimeError(
                f"CRITICAL: Knowledge graph JSON corrupted - {e}. "
                "Graph integrity check failed."
            )
    
    def query_by_category_and_priority(
        self,
        category: str,
        priority_threshold: int = 2,
        max_depth: int = 1
    ) -> List[GraphNode]:
        """
        Extract nodes matching category and priority criteria.
        
        Args:
            category: Target category (e.g., "AI Models & LLM Development")
            priority_threshold: Max priority level (1=highest)
            max_depth: Connection traversal depth
            
        Returns:
            List of GraphNode objects, sorted by priority
        """
        matching_nodes = []
        
        for node_data in self.graph.get("nodes", []):
            metadata = node_data.get("metadata", {})
            
            # Filter by category and priority
            if (metadata.get("category") == category and 
                metadata.get("priority", 99) <= priority_threshold):
                
                node = GraphNode(
                    id=node_data["id"],
                    type=node_data["type"],
                    url=metadata.get("access_url", ""),
                    category=metadata.get("category", ""),
                    sub_category=metadata.get("sub_category", ""),
                    priority=metadata.get("priority", 99),
                    connections=self._get_connections(node_data["id"], max_depth)
                )
                
                matching_nodes.append(node)
        
        # Sort by priority (ascending = most important first)
        return sorted(matching_nodes, key=lambda x: x.priority)
    
    def _get_connections(self, node_id: str, depth: int) -> List[str]:
        """Recursively retrieve connected node IDs"""
        if depth == 0:
            return []
        
        for node in self.graph.get("nodes", []):
            if node["id"] == node_id:
                direct_connections = node.get("connections", [])
                
                # If depth > 1, recursively get connections of connections
                if depth > 1:
                    indirect = []
                    for conn_id in direct_connections:
                        indirect.extend(self._get_connections(conn_id, depth - 1))
                    return list(set(direct_connections + indirect))  # Deduplicate
                
                return direct_connections
        
        return []
    
    def filter_by_keywords(
        self,
        nodes: List[GraphNode],
        keywords: List[str]
    ) -> List[GraphNode]:
        """
        Further filter nodes by keyword matching in ID or sub_category.
        
        Args:
            nodes: List of GraphNode objects to filter
            keywords: Keywords to match (case-insensitive)
            
        Returns:
            Filtered list of nodes
        """
        filtered = []
        keywords_lower = [kw.lower() for kw in keywords]
        
        for node in nodes:
            node_text = f"{node.id} {node.sub_category}".lower()
            
            if any(kw in node_text for kw in keywords_lower):
                filtered.append(node)
        
        return filtered
    
    def verify_identity_lock(self, node_id: str) -> bool:
        """
        Check if a node has priority=1 (identity-locked).
        
        Identity-locked nodes represent core architectural decisions
        that cannot be modified by sub-agents without Meta-Architect approval.
        
        Args:
            node_id: The node ID to check
            
        Returns:
            True if node is identity-locked, False otherwise
        """
        for node in self.graph.get("nodes", []):
            if node["id"] == node_id:
                return node.get("metadata", {}).get("priority") == 1
        
        return False
    
    def get_locked_nodes(self, category: str) -> List[str]:
        """
        Get all identity-locked node IDs in a category.
        
        Used to inform agents which nodes they cannot modify.
        """
        locked = []
        
        for node in self.graph.get("nodes", []):
            metadata = node.get("metadata", {})
            if (metadata.get("category") == category and 
                metadata.get("priority") == 1):
                locked.append(node["id"])
        
        return locked


# ============================================================================
# KNOWLEDGE INJECTION ENGINE
# ============================================================================

class KnowledgeInjector:
    """
    Generates context injection packages for sub-agents.
    
    This class orchestrates the Graph query + filtering + formatting pipeline
    to produce agent-ready knowledge packages in Markdown format.
    """
    
    def __init__(self, librarian: GraphLibrarian):
        self.librarian = librarian
    
    def generate_injection_package(
        self,
        agent_role: AgentRole,
        requirements: List[str],
        mcp_tools: Optional[List[str]] = None
    ) -> ContextPackage:
        """
        Main entry point for generating a knowledge injection package.
        
        Args:
            agent_role: The target agent's role
            requirements: Technical keywords/requirements
            mcp_tools: Optional list of MCP tools to enable
            
        Returns:
            ContextPackage object ready for serialization
        """
        # Get category for this agent role
        category = self.librarian.role_category_map.get(agent_role)
        
        if not category:
            raise ValueError(f"Unknown agent role: {agent_role}")
        
        # Query graph
        nodes = self.librarian.query_by_category_and_priority(
            category=category,
            priority_threshold=2,
            max_depth=1
        )
        
        # Filter by requirements
        filtered_nodes = self.librarian.filter_by_keywords(nodes, requirements)
        
        # Get identity-locked nodes as constraints
        locked_nodes = self.librarian.get_locked_nodes(category)
        
        # Build constraints list
        constraints = [
            f"Identity-locked nodes (priority=1): {', '.join(locked_nodes) if locked_nodes else 'None'}",
            "Cannot modify priority=1 nodes without Meta-Architect approval",
            "All external references must exist in knowledge graph"
        ]
        
        # Build rules list
        rules = [
            "All code and architecture decisions MUST reference documentation from the nodes above",
            "If required information is missing, respond: 'ESCALATION REQUIRED: Missing graph data for [topic]'",
            "Never invent API signatures, database schemas, or configuration syntax",
            "When uncertain, query Meta-Architect with: '@meta-architect [question]'",
            "Document all assumptions and decisions in code comments"
        ]
        
        # Default MCP tools
        if mcp_tools is None:
            mcp_tools = ["filesystem", "web_search"]
        
        # Create package
        package = ContextPackage(
            agent_role=agent_role.value,
            generated_at=datetime.now(datetime.UTC).isoformat().replace('+00:00', 'Z'),
            nodes=filtered_nodes,
            constraints=constraints,
            rules=rules,
            mcp_tools_enabled=mcp_tools
        )
        
        return package
    
    def render_as_markdown(self, package: ContextPackage) -> str:
        """
        Convert ContextPackage to Markdown format for agent system prompt.
        
        This is the format that gets injected into the sub-agent's context.
        """
        md = f"""# KNOWLEDGE INJECTION FOR: {package.agent_role.upper()}

## Generated: {package.generated_at}

---

## 📚 RELEVANT DOCUMENTATION ({len(package.nodes)} nodes)

"""
        
        # Group nodes by priority
        priority_groups = {}
        for node in package.nodes:
            if node.priority not in priority_groups:
                priority_groups[node.priority] = []
            priority_groups[node.priority].append(node)
        
        # Render by priority
        for priority in sorted(priority_groups.keys()):
            md += f"\n### Priority {priority} Resources\n\n"
            
            for node in priority_groups[priority]:
                md += f"#### {node.id}\n"
                md += f"- **Type**: {node.type}\n"
                md += f"- **Category**: {node.sub_category}\n"
                md += f"- **URL**: {node.url}\n"
                
                if node.connections:
                    md += f"- **Related**: {', '.join(node.connections[:3])}\n"
                
                md += "\n"
        
        # Add constraints section
        md += "\n---\n\n## 🚫 CONSTRAINTS\n\n"
        for i, constraint in enumerate(package.constraints, 1):
            md += f"{i}. {constraint}\n"
        
        # Add rules section
        md += "\n---\n\n## 📋 OPERATIONAL RULES\n\n"
        for i, rule in enumerate(package.rules, 1):
            md += f"{i}. {rule}\n"
        
        # Add MCP tools section
        md += "\n---\n\n## 🔧 ENABLED MCP TOOLS\n\n"
        for tool in package.mcp_tools_enabled:
            md += f"- `{tool}`\n"
        
        md += "\n---\n\n"
        md += "_This context package was auto-generated by Meta-Architect._\n"
        md += "_Any modifications to identity-locked resources require explicit approval._\n"
        
        return md
    
    def save_to_file(self, package: ContextPackage, output_dir: Path) -> Path:
        """
        Save the context package to a Markdown file.
        
        Args:
            package: The ContextPackage to save
            output_dir: Directory to save the file
            
        Returns:
            Path to the saved file
        """
        output_dir.mkdir(parents=True, exist_ok=True)
        
        filename = f"{package.agent_role}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        filepath = output_dir / filename
        
        markdown_content = self.render_as_markdown(package)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(markdown_content)
        
        print(f"[KnowledgeInjector] Saved context package to {filepath}")
        
        return filepath


# ============================================================================
# AGENT STATE MANAGER
# ============================================================================

class AgentStateManager:
    """
    Manages agent state files (YAML format).
    
    Provides CRUD operations for agent states with atomic writes
    and state validation.
    """
    
    def __init__(self, state_dir: str = "./agent_states"):
        self.state_dir = Path(state_dir)
        self.state_dir.mkdir(parents=True, exist_ok=True)
    
    def create_agent_state(
        self,
        role: AgentRole,
        task_description: str,
        context_package_path: Path
    ) -> AgentState:
        """
        Initialize a new agent state.
        
        Args:
            role: Agent's role
            task_description: Description of assigned task
            context_package_path: Path to the context injection file
            
        Returns:
            AgentState object
        """
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
                "last_update": datetime.now(datetime.UTC).isoformat().replace('+00:00', 'Z'),
                "package_path": str(context_package_path)
            },
            checkpoints=[],
            escalations=[],
            output_artifacts=[]
        )
        
        return state
    
    def save_state(self, state: AgentState) -> Path:
        """
        Persist agent state to YAML file (atomic write).
        
        Args:
            state: AgentState object to save
            
        Returns:
            Path to saved state file
        """
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
        
        # Atomic write (write to temp file, then rename)
        temp_filepath = filepath.with_suffix('.tmp')
        
        with open(temp_filepath, 'w', encoding='utf-8') as f:
            yaml.dump(state_dict, f, default_flow_style=False, sort_keys=False)
        
        temp_filepath.rename(filepath)
        
        print(f"[AgentStateManager] Saved state: {filepath}")
        
        return filepath
    
    def load_state(self, agent_id: str) -> AgentState:
        """
        Load agent state from file.
        
        Args:
            agent_id: The agent ID
            
        Returns:
            AgentState object
            
        Raises:
            FileNotFoundError if state file doesn't exist
        """
        filepath = self.state_dir / f"{agent_id}.yml"
        
        with open(filepath, 'r', encoding='utf-8') as f:
            state_dict = yaml.safe_load(f)
        
        # Convert back to AgentState
        state = AgentState(
            agent_id=state_dict["agent_id"],
            role=AgentRole(state_dict["role"]),
            status=TaskStatus(state_dict["status"]),
            assigned_task=state_dict["assigned_task"],
            context_injection=state_dict["context_injection"],
            checkpoints=state_dict.get("checkpoints", []),
            escalations=state_dict.get("escalations", []),
            output_artifacts=state_dict.get("output_artifacts", [])
        )
        
        return state
    
    def update_status(self, agent_id: str, new_status: TaskStatus):
        """
        Update agent status and save state.
        
        Args:
            agent_id: The agent ID
            new_status: New TaskStatus value
        """
        state = self.load_state(agent_id)
        state.status = new_status
        self.save_state(state)
        
        print(f"[AgentStateManager] Updated {agent_id} status to {new_status.value}")
    
    def add_checkpoint(self, agent_id: str, action: str, files_modified: List[str]):
        """
        Add a checkpoint to agent's history.
        
        Args:
            agent_id: The agent ID
            action: Description of action taken
            files_modified: List of files changed
        """
        state = self.load_state(agent_id)
        
        checkpoint = {
            "timestamp": datetime.now(datetime.UTC).isoformat().replace('+00:00', 'Z'),
            "action": action,
            "files_modified": files_modified
        }
        
        state.checkpoints.append(checkpoint)
        self.save_state(state)
        
        print(f"[AgentStateManager] Added checkpoint to {agent_id}: {action}")
    
    def add_escalation(self, agent_id: str, issue: str):
        """
        Record an escalation from the agent.
        
        Args:
            agent_id: The agent ID
            issue: Description of the issue requiring escalation
        """
        state = self.load_state(agent_id)
        
        escalation = {
            "timestamp": datetime.now(datetime.UTC).isoformat().replace('+00:00', 'Z'),
            "issue": issue,
            "status": "PENDING"
        }
        
        state.escalations.append(escalation)
        state.status = TaskStatus.BLOCKED
        self.save_state(state)
        
        print(f"[AgentStateManager] ESCALATION from {agent_id}: {issue}")


# ============================================================================
# USAGE EXAMPLE (MAIN WORKFLOW)
# ============================================================================

def example_workflow():
    """
    Demonstrates the complete knowledge injection workflow.
    """
    print("="*80)
    print("META-ARCHITECT KNOWLEDGE INJECTION WORKFLOW")
    print("="*80)
    
    # 1. Initialize components
    librarian = GraphLibrarian("knowledge_graph.json")
    injector = KnowledgeInjector(librarian)
    state_manager = AgentStateManager("./agent_states")
    
    # 2. Generate context package for a frontend specialist
    print("\n[Step 1] Generating context package for frontend specialist...")
    
    package = injector.generate_injection_package(
        agent_role=AgentRole.FRONTEND_SPECIALIST,
        requirements=["react", "nextjs", "tailwind"],
        mcp_tools=["filesystem", "web_search"]
    )
    
    print(f"[Step 1] Generated package with {len(package.nodes)} nodes")
    
    # 3. Save context package to file
    print("\n[Step 2] Saving context package to file...")
    
    package_path = injector.save_to_file(
        package,
        output_dir=Path("./context_packages")
    )
    
    # 4. Create agent state
    print("\n[Step 3] Creating agent state...")
    
    state = state_manager.create_agent_state(
        role=AgentRole.FRONTEND_SPECIALIST,
        task_description="Build Next.js dashboard with Tailwind UI",
        context_package_path=package_path
    )
    
    # 5. Save state
    print("\n[Step 4] Persisting agent state...")
    
    state_path = state_manager.save_state(state)
    
    # 6. Simulate agent progress
    print("\n[Step 5] Simulating agent execution...")
    
    state_manager.update_status(state.agent_id, TaskStatus.ACTIVE)
    state_manager.add_checkpoint(
        state.agent_id,
        action="Created Next.js project structure",
        files_modified=["package.json", "next.config.js", "tailwind.config.js"]
    )
    
    # 7. Simulate escalation
    print("\n[Step 6] Simulating escalation...")
    
    state_manager.add_escalation(
        state.agent_id,
        issue="Missing UI component library decision (shadcn vs Headless UI)"
    )
    
    # 8. Final summary
    print("\n[Step 7] Workflow complete!")
    print(f"- Context package: {package_path}")
    print(f"- Agent state: {state_path}")
    print(f"- Agent status: BLOCKED (awaiting Meta-Architect resolution)")
    
    print("\n" + "="*80)
    print("WORKFLOW SUMMARY")
    print("="*80)
    print(f"Graph nodes loaded: {len(librarian.graph['nodes'])}")
    print(f"Relevant nodes filtered: {len(package.nodes)}")
    print(f"Context package size: ~{len(injector.render_as_markdown(package))} chars")
    print(f"Escalations pending: 1")
    print("="*80)


if __name__ == "__main__":
    # Run example workflow
    example_workflow()
