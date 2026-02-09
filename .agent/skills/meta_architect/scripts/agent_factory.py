"""
agent_factory.py - Meta-Architect Agent Spawner (v3.1)
Integrates Profiles, Templates, Knowledge Graph, and State Management.
"""

import os
import yaml
import argparse
import datetime
import sys
from pathlib import Path

# Ensure script directory is in path for imports
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from config import PROJECT_ROOT, PROFILES_DIR, TEMPLATE_PATH, GRAPH_PATH, STATE_DIR
from graph_query import GraphQuery
from state_manager import StateManager, TaskStatus



def load_profile(role_alias: str) -> dict:
    """Load agent profile YAML by alias or filename"""
    # Map common aliases
    aliases = {
        "extension": "extension_builder",
        "dashboard": "dashboard_builder",
        "db": "db_architect",
        "qa": "qa_engineer",
        "examiner": "qa_examiner",
        "meta": "meta_architect",
        "docs": "docs_librarian",
        "guardian": "graph_guardian",
        "ai": "ai_integrator",
        "devops": "devops_engineer",
        "ui": "ui_specialist"
    }
    
    filename = aliases.get(role_alias, role_alias)
    if not filename.endswith(".yml"):
        filename += ".yml"
        
    path = PROFILES_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"❌ Profile not found: {path}")
        
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def fetch_graph_context(profile: dict, graph_query: GraphQuery) -> str:
    """
    Extract REAL data from the Knowledge Graph based on Profile requirements.
    This fulfills the 'Graph-Driven' directive.
    """
    kg_config = profile.get("knowledge_graph_access", {})
    required_nodes = kg_config.get("required_nodes", [])
    categories = kg_config.get("categories", [])
    
    context_lines = []
    context_lines.append("### 🧠 KNOWLEDGE GRAPH CONTEXT (Auto-Injected)")
    
    # 1. Fetch Specific Nodes (High Priority)
    found_nodes = []
    for node_id in required_nodes:
        # We perform a targeted search in the graph data
        # Note: GraphQuery doesn't have a direct 'get_node' method publicly exposed in the snippet provided,
        # so we iterate. In a full impl, we'd add get_node_by_id.
        for node in graph_query.graph.get("nodes", []):
            if node["id"] == node_id:
                meta = node.get("metadata", {})
                desc = meta.get("description") or meta.get("access_url") or "No description"
                context_lines.append(f"- 💎 **{node_id}**: {desc}")
                found_nodes.append(node_id)
                break
    
    # 2. Fetch Category Context (General Awareness)
    for cat in categories:
        nodes = graph_query.query_by_category(cat, priority_threshold=1)
        if nodes:
            context_lines.append(f"\n**Category: {cat} (Top Priority):**")
            for n in nodes[:3]: # Limit to top 3 to save tokens
                if n.id not in found_nodes:
                    context_lines.append(f"- {n.id}: {n.url}")

    return "\n".join(context_lines)

def generate_system_prompt(role_alias: str, mission: str) -> str:
    """
    The Fusion Engine: Profile + Template + Graph + State
    """
    # 1. Initialize Components
    profile = load_profile(role_alias)
    graph_query = GraphQuery(str(GRAPH_PATH))
    state_manager = StateManager(str(STATE_DIR))
    
    with open(TEMPLATE_PATH, "r", encoding="utf-8") as f:
        template = f.read()

    config = profile["agent_config"]
    runtime = profile["runtime_behavior"]
    tools = profile.get("tooling_config", {})
    perms = profile.get("permissions", {})

    # 2. Create State (Anti-Ghosting)
    # We create the file immediately so the agent has a place to record logic
    state = state_manager.create_state(
        role=config["role"],
        task_description=mission,
        context_package_path="DYNAMIC_INJECTION"
    )
    # Explicitly set the ID to match the profile ID for consistency if needed, 
    # but StateManager generates unique IDs which is safer for history.
    state_manager.save_state(state)
    
    print(f"✅ [SYSTEM] Agent State Initialized: {state_manager.state_dir}/{state.agent_id}.yml")

    # 3. Fuse Graph Context
    graph_context = fetch_graph_context(profile, graph_query)

    # 4. Replacement Logic
    replacements = {
        "{{ROLE_NAME}}": config["role"],
        "{{MISSION_ID}}": state.agent_id, # Link Prompt to State File
        "{{DESCRIPTION}}": config["description"],
        "{{THINKING_MODE}}": runtime["thinking_mode"],
        "{{TEMPERATURE}}": str(runtime["temperature"]),
        
        # Tool Belt
        "{{ALLOWED_MCP_SERVERS}}": ", ".join(tools.get("allowed_mcp_servers", [])),
        "{{BLOCKED_MCP_SERVERS}}": ", ".join(tools.get("blocked_mcp_servers", ["NONE"])),
        
        # Permissions
        "{{ALLOWED_FILES}}": str(perms.get("allowed_files", [])),
        "{{READ_ONLY_FILES}}": str(perms.get("read_only_files", [])),
        "{{FORBIDDEN_FILES}}": str(perms.get("forbidden_files", [])),
        
        # Constraints & Graph
        "{{CONSTRAINTS}}": "\n".join([f"- {c}" for c in profile.get("constraints", [])]),
        "{{MISSION_DESCRIPTION}}": f"{mission}\n\n{graph_context}" # Inject Graph here
    }

    prompt = template
    for key, value in replacements.items():
        prompt = prompt.replace(key, value)

    return prompt

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Meta-Architect Agent Factory v3.1")
    parser.add_argument("role", help="Agent Role Alias (e.g., extension, db)")
    parser.add_argument("mission", help="The specific mission objective")
    
    args = parser.parse_args()
    
    try:
        print(generate_system_prompt(args.role, args.mission))
    except Exception as e:
        print(f"❌ FACTORY ERROR: {str(e)}")
        sys.exit(1)
