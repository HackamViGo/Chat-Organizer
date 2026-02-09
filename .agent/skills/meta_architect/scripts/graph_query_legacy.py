"""
graph_query.py - Knowledge Graph Query Module
Superior Meta-Architect+ System

Production implementation of Graph-RAG queries for the Meta-Architect.
Serves as the Single Source of Truth for GraphNode and GraphQuery logic.
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass

# Ensure script directory is in path for imports
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from config import GRAPH_PATH, ROLE_CATEGORY_MAP

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
    
    def __init__(self, graph_path: Optional[Path] = None):
        # Use config default if not provided
        if graph_path is None:
            self.graph_path = GRAPH_PATH
        elif isinstance(graph_path, str):
            self.graph_path = Path(graph_path)
        else:
            self.graph_path = graph_path
        self.graph = self._load_graph()
        
    def _load_graph(self) -> Dict:
        """
        Load and validate the knowledge graph.
        
        ESCALATION CHAIN:
        1. Try local graph file
        2. If missing/invalid -> ESCALATE to Context7 MCP
        3. If Context7 fails -> STOP and require USER intervention
        
        NO SILENT FALLBACKS. NO CONTINUATION WITHOUT KNOWLEDGE.
        """
        if not self.graph_path.exists():
            raise RuntimeError(
                f"🚨 CRITICAL: Knowledge graph not found at {self.graph_path}\n"
                f"📋 ESCALATION REQUIRED:\n"
                f"   1. Check if file exists\n"
                f"   2. If missing, agent MUST query @mcp:context7\n"
                f"   3. If Context7 fails, agent MUST escalate to USER\n"
                f"❌ SYSTEM CANNOT PROCEED WITHOUT KNOWLEDGE SOURCE"
            )
        
        try:
            with open(self.graph_path, 'r', encoding='utf-8') as f:
                graph = json.load(f)
            
            if "nodes" not in graph:
                raise ValueError("Graph missing 'nodes' key")
            
            if len(graph.get("nodes", [])) == 0:
                raise RuntimeError(
                    f"🚨 CRITICAL: Knowledge graph is EMPTY\n"
                    f"📋 ESCALATION REQUIRED:\n"
                    f"   1. Agent MUST query @mcp:context7 for knowledge\n"
                    f"   2. If Context7 fails, agent MUST escalate to USER\n"
                    f"❌ SYSTEM CANNOT PROCEED WITH EMPTY KNOWLEDGE BASE"
                )
            
            print(f"✅ Loaded {len(graph['nodes'])} nodes from graph")
            return graph
            
        except json.JSONDecodeError as e:
            raise RuntimeError(
                f"🚨 CRITICAL: Invalid JSON in graph file\n"
                f"📋 ERROR: {e}\n"
                f"📋 ESCALATION REQUIRED:\n"
                f"   1. Fix JSON syntax in {self.graph_path}\n"
                f"   2. OR query @mcp:context7 for fresh knowledge\n"
                f"   3. If Context7 fails, agent MUST escalate to USER\n"
                f"❌ SYSTEM CANNOT PROCEED WITH CORRUPTED KNOWLEDGE"
            )
    
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
    
    def escalate_to_context7(self, query: str) -> Dict:
        """
        Escalate knowledge query to Context7 MCP server.
        
        This is Step 2 in the escalation chain:
        Graph (failed) → Context7 (here) → USER (if this fails)
        
        Args:
            query: The knowledge query string
            
        Returns:
            Dict with 'status' and 'data' or 'error'
        """
        print(f"📡 ESCALATING to @mcp:context7...")
        print(f"🔍 Query: {query}")
        
        # NOTE: This requires MCP integration to be active
        # The actual MCP call should be handled by the agent runtime
        # This method documents the escalation requirement
        
        return {
            "status": "ESCALATION_REQUIRED",
            "target": "@mcp:context7",
            "query": query,
            "instruction": (
                "Agent MUST call @mcp:context7 with this query. "
                "If Context7 returns no results, agent MUST escalate to USER."
            )
        }
    
    def safe_query(
        self,
        keywords: Optional[List[str]] = None,
        category: Optional[str] = None,
        priority: int = 2
    ) -> Dict:
        """
        Safe query wrapper with STRICT escalation chain.
        
        ESCALATION CHAIN:
        1. Query local graph
        2. If no results → escalate_to_context7()
        3. If Context7 fails → STOP and require USER
        
        Returns dict with status and results.
        """
        if not keywords and not category:
            return {
                "status": "HALT",
                "message": "Either 'keywords' or 'category' must be provided for safe_query.",
                "suggested_actions": ["Refine query with specific keywords or category."]
            }

        results: List[GraphNode] = []
        
        # 1. Query local graph
        if category:
            results = self.query_by_category(category, priority)
        elif keywords:
            # If only keywords are provided, search across all nodes
            for node_data in self.graph.get("nodes", []):
                metadata = node_data.get("metadata", {})
                node_id_lower = node_data.get("id", "").lower()
                sub_category_lower = metadata.get("sub_category", "").lower()
                
                if any(kw.lower() in node_id_lower or kw.lower() in sub_category_lower for kw in keywords):
                    results.append(GraphNode(
                        id=node_data["id"],
                        type=node_data.get("type", "unknown"),
                        url=metadata.get("access_url", ""),
                        category=metadata.get("category", ""),
                        sub_category=metadata.get("sub_category", ""),
                        priority=metadata.get("priority", 99),
                        connections=self._get_connections(node_data["id"], 1) # Default depth 1 for keyword search
                    ))
            # If keywords are provided, also apply the filter_by_keywords logic
            results = self.filter_by_keywords(results, keywords)

        if not results:
            # 2. If no results → escalate_to_context7()
            query_str = f"category: {category}" if category else ""
            query_str += f" keywords: {', '.join(keywords)}" if keywords else ""
            return self.escalate_to_context7(query_str.strip())
        
        return {
            "status": "OK",
            "data": results,
            "node_count": len(results)
        }


if __name__ == "__main__":
    # Test execution
    gq = GraphQuery()
    print("GraphQuery Module Loaded Successfully")
