#!/usr/bin/env python3
"""
migrate_graphs.py - Split knowledge_graph.json into dual graph architecture

This script:
1. Reads existing knowledge_graph.json
2. Categorizes nodes as external (Context7) or internal (project)
3. Creates external_knowledge.json with timestamps
4. Creates project_knowledge.json
5. Adds cross-references between graphs
"""
import sys
import json
import shutil
from pathlib import Path
from datetime import datetime

# Add scripts to path
sys.path.insert(0, str(Path(__file__).parent))
from config import GRAPH_PATH, EXTERNAL_GRAPH_PATH, PROJECT_GRAPH_PATH

# ============================================================================
# CATEGORIZATION RULES
# ============================================================================

EXTERNAL_TYPES = {"library", "framework", "tool", "api", "service"}
EXTERNAL_CATEGORIES = {
    "Programming Languages & Frameworks",
    "Databases & Data Infrastructure",
    "Cloud Platforms & DevOps",
    "AI Models & LLM Development",
    "Testing & Quality Assurance"
}

INTERNAL_TYPES = {"component_pattern", "convention", "architecture", "workflow"}
INTERNAL_CATEGORIES = {
    "BrainBox Architecture",
    "Project Standards",
    "UI Patterns",
    "Code Conventions"
}


def categorize_node(node: dict) -> str:
    """
    Categorize node as 'external' or 'internal'.
    
    Args:
        node: Node dictionary from knowledge graph
        
    Returns:
        'external' or 'internal'
    """
    node_type = node.get("type", "").lower()
    category = node.get("metadata", {}).get("category", "")
    node_id = node.get("id", "")
    
    # Explicit type match
    if node_type in EXTERNAL_TYPES:
        return "external"
    if node_type in INTERNAL_TYPES:
        return "internal"
    
    # Category match
    if category in EXTERNAL_CATEGORIES:
        return "external"
    if category in INTERNAL_CATEGORIES:
        return "internal"
    
    # ID-based heuristics
    if "brainbox" in node_id.lower() or "project" in node_id.lower():
        return "internal"
    
    # Default: external (conservative - can be refreshed from Context7)
    return "external"


def add_cross_references(external_nodes: list, internal_nodes: list) -> tuple:
    """
    Add cross-references between external and internal nodes.
    
    Args:
        external_nodes: List of external nodes
        internal_nodes: List of internal nodes
        
    Returns:
        Tuple of (updated_external_nodes, updated_internal_nodes)
    """
    # Build lookup maps
    external_map = {node["id"]: node for node in external_nodes}
    internal_map = {node["id"]: node for node in internal_nodes}
    
    # Add references
    for internal_node in internal_nodes:
        # Check if internal node mentions external libraries
        node_content = str(internal_node).lower()
        external_refs = []
        
        for ext_id in external_map.keys():
            # Simple keyword matching (can be improved)
            if ext_id.lower() in node_content:
                external_refs.append(ext_id)
        
        if external_refs:
            internal_node["external_refs"] = external_refs
            
            # Add reverse reference
            for ext_id in external_refs:
                if "referenced_by" not in external_map[ext_id]:
                    external_map[ext_id]["referenced_by"] = []
                external_map[ext_id]["referenced_by"].append(internal_node["id"])
    
    return list(external_map.values()), list(internal_map.values())


def migrate():
    """Main migration function"""
    print("=" * 60)
    print("🔄 KNOWLEDGE GRAPH MIGRATION")
    print("=" * 60)
    
    # 1. Backup original
    if GRAPH_PATH.exists():
        backup_path = GRAPH_PATH.with_suffix(".backup.json")
        shutil.copy(GRAPH_PATH, backup_path)
        print(f"✅ Backed up to: {backup_path}")
    else:
        print(f"❌ Original graph not found: {GRAPH_PATH}")
        return 1
    
    # 2. Load original graph
    with open(GRAPH_PATH, 'r') as f:
        original_graph = json.load(f)
    
    nodes = original_graph.get("nodes", [])
    print(f"📊 Loaded {len(nodes)} nodes from original graph")
    
    # 3. Categorize nodes
    external_nodes = []
    internal_nodes = []
    
    today = datetime.now().strftime("%Y-%m-%d")
    
    for node in nodes:
        category = categorize_node(node)
        
        if category == "external":
            # Add timestamp for freshness tracking
            node["last_updated"] = today
            external_nodes.append(node)
        else:
            internal_nodes.append(node)
    
    print(f"📦 Categorized: {len(external_nodes)} external, {len(internal_nodes)} internal")
    
    # 4. Add cross-references
    external_nodes, internal_nodes = add_cross_references(external_nodes, internal_nodes)
    print(f"🔗 Added cross-references between graphs")
    
    # 5. Create external_knowledge.json
    external_graph = {
        "metadata": {
            "version": "1.0",
            "source": "context7",
            "description": "External library/framework documentation cache",
            "last_global_refresh": today,
            "node_count": len(external_nodes)
        },
        "nodes": external_nodes
    }
    
    with open(EXTERNAL_GRAPH_PATH, 'w') as f:
        json.dump(external_graph, f, indent=2)
    
    print(f"✅ Created: {EXTERNAL_GRAPH_PATH} ({len(external_nodes)} nodes)")
    
    # 6. Create project_knowledge.json
    project_graph = {
        "metadata": {
            "version": "1.0",
            "source": "project",
            "description": "BrainBox project-specific architecture and patterns",
            "project_name": "BrainBox - AI Chat Organizer",
            "node_count": len(internal_nodes)
        },
        "nodes": internal_nodes
    }
    
    with open(PROJECT_GRAPH_PATH, 'w') as f:
        json.dump(project_graph, f, indent=2)
    
    print(f"✅ Created: {PROJECT_GRAPH_PATH} ({len(internal_nodes)} nodes)")
    
    # 7. Summary
    print("\n" + "=" * 60)
    print("📊 MIGRATION SUMMARY")
    print("=" * 60)
    print(f"Original nodes: {len(nodes)}")
    print(f"External nodes: {len(external_nodes)}")
    print(f"Internal nodes: {len(internal_nodes)}")
    print(f"Cross-references added: ✅")
    print("=" * 60)
    print("\n✅ Migration complete!")
    print("\n📋 Next steps:")
    print("1. Review external_knowledge.json and project_knowledge.json")
    print("2. Manually adjust categorization if needed")
    print("3. Run tests to verify dual graph system")
    
    return 0


if __name__ == "__main__":
    exit(migrate())
