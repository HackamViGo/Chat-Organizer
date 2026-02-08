"""
graph_query.py - Knowledge Graph Query Module
Superior Meta-Architect+ System

Production implementation of Graph-RAG queries for the Meta-Architect.
Serves as the Single Source of Truth for GraphNode and GraphQuery logic.
"""

import json
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass

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

class GraphQuery:
    """
    Graph-RAG query interface for Meta-Architect.
    
    Implements:
    - Priority-based filtering
    - Category extraction
    - Connection traversal
    - Identity lock verification
    """
    
    def __init__(self, graph_path: str = "knowledge_graph.json"):
        # Allow path to be relative to .agent/skills/meta_architect/resources if not found at root
        self.graph_path = Path(graph_path)
        if not self.graph_path.exists():
            # Fallback for relative run
            alt_path = Path(".agent/skills/meta_architect/resources") / graph_path
            if alt_path.exists():
                self.graph_path = alt_path
            elif Path(f".agent/skills/meta_architect/resources/{graph_path}").exists():
                 self.graph_path = Path(f".agent/skills/meta_architect/resources/{graph_path}")
        
        self.graph = self._load_graph()
        
    def _load_graph(self) -> Dict:
        """Load and validate the knowledge graph"""
        if not self.graph_path.exists():
            raise RuntimeError(
                f"CRITICAL: Graph not found at {self.graph_path}. "
                "Cannot proceed without graph data."
            )
        
        with open(self.graph_path, 'r', encoding='utf-8') as f:
            graph = json.load(f)
        
        if "nodes" not in graph:
            raise ValueError("Graph missing 'nodes' key")
        
        # print(f"[GraphQuery] Loaded {len(graph['nodes'])} nodes") # Quiet mode for purity
        return graph
    
    def query_by_category(
        self,
        category: str,
        priority_threshold: int = 2,
        max_depth: int = 1
    ) -> List[GraphNode]:
        """
        Extract nodes by category and priority.
        
        Args:
            category: Target category
            priority_threshold: Max priority (1=highest)
            max_depth: Connection traversal depth
        """
        nodes = []
        
        for node_data in self.graph.get("nodes", []):
            metadata = node_data.get("metadata", {})
            
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
                nodes.append(node)
        
        return sorted(nodes, key=lambda x: x.priority)
    
    def _get_connections(self, node_id: str, depth: int) -> List[str]:
        """Get connected node IDs up to specified depth"""
        if depth == 0:
            return []
        
        for node in self.graph.get("nodes", []):
            if node["id"] == node_id:
                return node.get("connections", [])
        
        return []
    
    def filter_by_keywords(
        self,
        nodes: List[GraphNode],
        keywords: List[str]
    ) -> List[GraphNode]:
        """Filter nodes by keyword matching"""
        keywords_lower = [kw.lower() for kw in keywords]
        
        return [
            node for node in nodes
            if any(kw in f"{node.id} {node.sub_category}".lower() 
                   for kw in keywords_lower)
        ]
    
    def get_locked_nodes(self, category: str) -> List[str]:
        """Get all priority=1 (identity-locked) node IDs"""
        return [
            node["id"] for node in self.graph.get("nodes", [])
            if (node.get("metadata", {}).get("category") == category and
                node.get("metadata", {}).get("priority") == 1)
        ]
    
    def verify_identity_lock(self, node_id: str) -> bool:
        """Check if a node is identity-locked (priority=1)"""
        for node in self.graph.get("nodes", []):
            if node["id"] == node_id:
                return node.get("metadata", {}).get("priority") == 1
        return False
    
    def safe_query(
        self,
        category: str,
        keywords: List[str],
        priority: int = 2
    ) -> Dict:
        """
        Execute a safe query with HALT logic.
        
        Returns:
            Dict with status (OK/HALT), data, and suggested_actions
        """
        nodes = self.query_by_category(category, priority)
        filtered = self.filter_by_keywords(nodes, keywords)
        
        if not filtered:
            return {
                "status": "HALT",
                "message": f"No Graph data for {keywords}",
                "suggested_actions": [
                    "Use MCP web_search to find documentation",
                    "Request user to upload specs",
                    "Mark as undefined and escalate"
                ]
            }
        
        return {
            "status": "OK",
            "data": filtered,
            "node_count": len(filtered)
        }

ROLE_CATEGORY_MAP = {
    "frontend_specialist": "Programming Languages & Frameworks",
    "backend_specialist": "Programming Languages & Frameworks",
    "devops_engineer": "Code Quality Standards",
    "meta_architect": "System Architecture",
    "security_specialist": "Security Standards",
    "ai_architect": "AI Models & LLM Development"
}

if __name__ == "__main__":
    # Test execution
    gq = GraphQuery(".agent/skills/meta_architect/resources/knowledge_graph.json")
    print("GraphQuery Module Loaded Successfully")
