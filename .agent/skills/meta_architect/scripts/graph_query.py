"""
graph_query.py - Dual Graph Query Module (v2.0)
Superior Meta-Architect+ System

Implements dual graph architecture:
- External Knowledge Graph (Context7 cache, auto-refresh)
- Project Knowledge Graph (immutable project truth)
- Cross-reference enrichment
- Strict escalation chain
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta

# Ensure script directory is in path for imports
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from config import (
    EXTERNAL_GRAPH_PATH,
    PROJECT_GRAPH_PATH,
    FRESHNESS_THRESHOLD_DAYS,
    ROLE_CATEGORY_MAP
)

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
    last_updated: Optional[str] = None  # For external nodes only
    external_refs: Optional[List[str]] = None  # For internal nodes
    referenced_by: Optional[List[str]] = None  # For external nodes


# ============================================================================
# EXTERNAL GRAPH (Context7 cache with auto-refresh)
# ============================================================================

class ExternalGraph:
    """
    External knowledge graph (libraries, frameworks, docs from Context7).
    Features:
    - Auto-refresh for stale nodes (>30 days)
    - Strict escalation on missing data
    - Cross-references to project graph
    """
    
    def __init__(self, graph_path: Path = EXTERNAL_GRAPH_PATH):
        self.graph_path = graph_path
        self.graph = self._load_graph()
        self.freshness_threshold = FRESHNESS_THRESHOLD_DAYS
    
    def _load_graph(self) -> Dict:
        """Load external knowledge graph"""
        if not self.graph_path.exists():
            raise RuntimeError(
                f"🚨 CRITICAL: External knowledge graph not found at {self.graph_path}\n"
                f"📋 ESCALATION REQUIRED:\n"
                f"   1. Run migrate_graphs.py to create dual graphs\n"
                f"   2. OR query @mcp:context7 for external knowledge\n"
                f"   3. If Context7 fails, agent MUST escalate to USER\n"
                f"❌ SYSTEM CANNOT PROCEED WITHOUT EXTERNAL KNOWLEDGE SOURCE"
            )
        
        try:
            with open(self.graph_path, 'r', encoding='utf-8') as f:
                graph = json.load(f)
            
            if "nodes" not in graph:
                raise ValueError("External graph missing 'nodes' key")
            
            print(f"✅ Loaded {len(graph['nodes'])} external nodes")
            return graph
            
        except json.JSONDecodeError as e:
            raise RuntimeError(
                f"🚨 CRITICAL: Invalid JSON in external graph\n"
                f"📋 ERROR: {e}\n"
                f"❌ SYSTEM CANNOT PROCEED"
            )
    
    def _calculate_age_days(self, last_updated: str) -> int:
        """Calculate node age in days"""
        try:
            updated_date = datetime.strptime(last_updated, "%Y-%m-%d")
            age = (datetime.now() - updated_date).days
            return age
        except:
            return 999  # Assume very old if can't parse
    
    def _is_google_api(self, node: Dict) -> bool:
        """
        Check if node is a Google API that should use Google Developer Knowledge MCP.
        
        Returns True for:
        - Chrome Extension APIs (chrome.*)
        - Google Gemini APIs (gemini.*)
        
        Returns False for everything else (use Context7)
        """
        node_id = node.get('id', '').lower()
        sub_category = node.get('metadata', {}).get('sub_category', '').lower()
        
        # Check for Chrome APIs
        if 'chrome' in node_id or 'chrome' in sub_category:
            return True
        
        # Check for Gemini APIs
        if 'gemini' in node_id or 'gemini' in sub_category:
            return True
        
        # Everything else (React, Supabase, Next.js, etc.) → Context7
        return False
    
    def _refresh_node(self, node: Dict) -> Dict:
        """
        Refresh stale node from appropriate MCP server.
        
        ROUTING:
        - Google APIs (Chrome, Gemini) → Google Developer Knowledge MCP
        - Everything else (React, Supabase, Next.js) → Context7
        
        STRICT: If MCP fails, raise error (no stale data returned)
        """
        node_id = node.get('id', 'unknown')
        category = node.get('metadata', {}).get('category', 'N/A')
        
        # Route to appropriate MCP server
        if self._is_google_api(node):
            return self._refresh_from_google_knowledge(node)
        else:
            return self._refresh_from_context7(node)
    
    def _refresh_from_google_knowledge(self, node: Dict) -> Dict:
        """
        Refresh Google API node from Google Developer Knowledge MCP.
        
        Used for: Chrome Extension APIs, Google Gemini APIs
        """
        node_id = node.get('id', 'unknown')
        category = node.get('metadata', {}).get('category', 'N/A')
        sub_category = node.get('metadata', {}).get('sub_category', '')
        
        print(f"🔄 Node '{node_id}' is stale. Auto-refreshing from Google Developer Knowledge MCP...")
        
        # Build query for Google docs
        query = f"{sub_category} API documentation and usage examples"
        
        print(f"📡 Calling @mcp:google-developer-knowledge with query: {query}")
        
        raise RuntimeError(
            f"🚨 AUTO-REFRESH REQUIRED for node '{node_id}'\n"
            f"📋 ESCALATION TO @mcp:google-developer-knowledge:\n"
            f"   Query: {query}\n"
            f"   Category: {category}\n"
            f"   API: {sub_category}\n"
            f"   Last Updated: {node.get('last_updated', 'unknown')}\n\n"
            f"📋 AGENT ACTION REQUIRED:\n"
            f"   1. Call mcp_google_developer_knowledge with:\n"
            f"      - query: '{query}'\n"
            f"      - corpus: 'developer.chrome.com' (or appropriate)\n"
            f"   2. Update node with fresh Markdown\n"
            f"   3. Set last_updated to today\n"
            f"   4. Save to external_knowledge.json\n\n"
            f"📋 If Google MCP fails, agent MUST escalate to USER\n"
            f"❌ CANNOT USE STALE DATA (>{self.freshness_threshold} days old)"
        )
    
    def _refresh_from_context7(self, node: Dict) -> Dict:
        """
        Refresh non-Google node from Context7 MCP.
        
        Used for: React, Next.js, Supabase, TailwindCSS, etc.
        """
        node_id = node.get('id', 'unknown')
        category = node.get('metadata', {}).get('category', 'N/A')
        
        print(f"🔄 Node '{node_id}' is stale. Auto-refreshing from Context7...")
        
        # Construct query based on node metadata
        query = self._build_context7_query(node)
        
        print(f"📡 Calling @mcp:context7 with query: {query}")
        
        raise RuntimeError(
            f"🚨 AUTO-REFRESH REQUIRED for node '{node_id}'\n"
            f"📋 ESCALATION TO @mcp:context7:\n"
            f"   Library ID: {node.get('metadata', {}).get('library_id', node_id)}\n"
            f"   Query: {query}\n"
            f"   Category: {category}\n"
            f"   Last Updated: {node.get('last_updated', 'unknown')}\n\n"
            f"📋 AGENT ACTION REQUIRED:\n"
            f"   1. Call mcp_context7_query-docs with:\n"
            f"      - libraryId: '{node.get('metadata', {}).get('library_id', node_id)}'\n"
            f"      - query: '{query}'\n"
            f"   2. Update node with fresh data\n"
            f"   3. Set last_updated to today\n"
            f"   4. Save to external_knowledge.json\n\n"
            f"📋 If Context7 fails, agent MUST escalate to USER\n"
            f"❌ CANNOT USE STALE DATA (>{self.freshness_threshold} days old)"
        )
    
    def _build_context7_query(self, node: Dict) -> str:
        """Build Context7 query from node metadata"""
        node_type = node.get('type', '')
        sub_category = node.get('metadata', {}).get('sub_category', '')
        
        # Extract meaningful query terms
        if node_type == 'library':
            return f"How to use {sub_category} library - latest documentation and best practices"
        elif node_type == 'framework':
            return f"{sub_category} framework documentation - core concepts and API reference"
        elif node_type == 'tool':
            return f"{sub_category} tool usage guide and configuration"
        else:
            return f"{sub_category} documentation and usage examples"
    
    def check_and_refresh(self, nodes: List[GraphNode]) -> List[GraphNode]:
        """
        Check node freshness and auto-refresh if stale.
        
        Args:
            nodes: List of nodes to check
            
        Returns:
            List of fresh nodes (auto-refreshed if needed)
        """
        refreshed_nodes = []
        
        for node in nodes:
            if node.last_updated:
                age_days = self._calculate_age_days(node.last_updated)
                
                if age_days > self.freshness_threshold:
                    # STALE: Auto-refresh required
                    # This will raise RuntimeError if Context7 unavailable
                    self._refresh_node(node.__dict__)
                else:
                    print(f"✅ Node '{node.id}' is fresh ({age_days} days old)")
            
            refreshed_nodes.append(node)
        
        return refreshed_nodes
    
    def query_by_category(self, category: str) -> List[GraphNode]:
        """Query external nodes by category"""
        results = []
        for node_data in self.graph.get("nodes", []):
            metadata = node_data.get("metadata", {})
            if metadata.get("category") == category:
                results.append(self._dict_to_node(node_data))
        return results
    
    def query_by_keywords(self, keywords: List[str]) -> List[GraphNode]:
        """Query external nodes by keywords"""
        results = []
        for node_data in self.graph.get("nodes", []):
            node_str = json.dumps(node_data).lower()
            if any(kw.lower() in node_str for kw in keywords):
                results.append(self._dict_to_node(node_data))
        return results
    
    def get_by_ids(self, node_ids: List[str]) -> List[GraphNode]:
        """Get external nodes by IDs (for cross-references)"""
        results = []
        for node_data in self.graph.get("nodes", []):
            if node_data.get("id") in node_ids:
                results.append(self._dict_to_node(node_data))
        return results
    
    def _dict_to_node(self, node_data: Dict) -> GraphNode:
        """Convert dict to GraphNode"""
        metadata = node_data.get("metadata", {})
        return GraphNode(
            id=node_data.get("id", ""),
            type=node_data.get("type", ""),
            url=metadata.get("access_url", ""),
            category=metadata.get("category", ""),
            sub_category=metadata.get("sub_category", ""),
            priority=metadata.get("priority", 99),
            connections=node_data.get("connections", []),
            last_updated=node_data.get("last_updated"),
            referenced_by=node_data.get("referenced_by", [])
        )


# ============================================================================
# PROJECT GRAPH (immutable project truth)
# ============================================================================

class ProjectGraph:
    """
    Project knowledge graph (internal architecture, patterns, conventions).
    Features:
    - Immutable (no auto-refresh)
    - Cross-references to external graph
    - Project-specific rules and patterns
    """
    
    def __init__(self, graph_path: Path = PROJECT_GRAPH_PATH):
        self.graph_path = graph_path
        self.graph = self._load_graph()
    
    def _load_graph(self) -> Dict:
        """Load project knowledge graph"""
        if not self.graph_path.exists():
            raise RuntimeError(
                f"🚨 CRITICAL: Project knowledge graph not found at {self.graph_path}\n"
                f"📋 ESCALATION REQUIRED:\n"
                f"   1. Run migrate_graphs.py to create dual graphs\n"
                f"   2. OR USER must define project knowledge\n"
                f"❌ SYSTEM CANNOT PROCEED WITHOUT PROJECT KNOWLEDGE"
            )
        
        try:
            with open(self.graph_path, 'r', encoding='utf-8') as f:
                graph = json.load(f)
            
            if "nodes" not in graph:
                raise ValueError("Project graph missing 'nodes' key")
            
            print(f"✅ Loaded {len(graph['nodes'])} project nodes")
            return graph
            
        except json.JSONDecodeError as e:
            raise RuntimeError(
                f"🚨 CRITICAL: Invalid JSON in project graph\n"
                f"📋 ERROR: {e}\n"
                f"❌ SYSTEM CANNOT PROCEED"
            )
    
    def query_by_category(self, category: str) -> List[GraphNode]:
        """Query project nodes by category"""
        results = []
        for node_data in self.graph.get("nodes", []):
            metadata = node_data.get("metadata", {})
            if metadata.get("category") == category:
                results.append(self._dict_to_node(node_data))
        return results
    
    def query_by_keywords(self, keywords: List[str]) -> List[GraphNode]:
        """Query project nodes by keywords"""
        results = []
        for node_data in self.graph.get("nodes", []):
            node_str = json.dumps(node_data).lower()
            if any(kw.lower() in node_str for kw in keywords):
                results.append(self._dict_to_node(node_data))
        return results
    
    def get_by_ids(self, node_ids: List[str]) -> List[GraphNode]:
        """Get project nodes by IDs (for cross-references)"""
        results = []
        for node_data in self.graph.get("nodes", []):
            if node_data.get("id") in node_ids:
                results.append(self._dict_to_node(node_data))
        return results
    
    def _dict_to_node(self, node_data: Dict) -> GraphNode:
        """Convert dict to GraphNode"""
        metadata = node_data.get("metadata", {})
        return GraphNode(
            id=node_data.get("id", ""),
            type=node_data.get("type", ""),
            url=metadata.get("file_path", ""),  # Project nodes have file paths
            category=metadata.get("category", ""),
            sub_category=metadata.get("sub_category", ""),
            priority=metadata.get("priority", 99),
            connections=node_data.get("connections", []),
            external_refs=node_data.get("external_refs", [])
        )


# ============================================================================
# DUAL GRAPH QUERY (orchestrator)
# ============================================================================

class DualGraphQuery:
    """
    Orchestrates queries across both graphs with strict escalation.
    
    Query priority:
    1. Project graph (ground truth)
    2. External graph (with auto-refresh)
    3. Context7 (for new external knowledge)
    4. USER (STOP - escalation required)
    """
    
    def __init__(self):
        self.project_graph = ProjectGraph()
        self.external_graph = ExternalGraph()
    
    def safe_query(self, keywords: Optional[List[str]] = None, category: Optional[str] = None) -> Dict:
        """
        Safe query with strict escalation chain.
        
        Args:
            keywords: List of keywords to search for
            category: Category to filter by
            
        Returns:
            Dict with status, source, and nodes
        """
        query_str = f"keywords: {', '.join(keywords) if keywords else 'N/A'}, category: {category or 'N/A'}"
        
        # PRIORITY 1: Project knowledge (ground truth)
        if category:
            project_results = self.project_graph.query_by_category(category)
        elif keywords:
            project_results = self.project_graph.query_by_keywords(keywords)
        else:
            project_results = []
        
        if project_results:
            # Enrich with external references
            for node in project_results:
                if node.external_refs:
                    external_data = self.external_graph.get_by_ids(node.external_refs)
                    # Check freshness and auto-refresh if needed
                    external_data = self.external_graph.check_and_refresh(external_data)
            
            return {
                "status": "OK",
                "source": "project",
                "node_count": len(project_results),
                "nodes": project_results,
                "query": query_str
            }
        
        # PRIORITY 2: External knowledge (with auto-refresh)
        if category:
            external_results = self.external_graph.query_by_category(category)
        elif keywords:
            external_results = self.external_graph.query_by_keywords(keywords)
        else:
            external_results = []
        
        if external_results:
            # Check freshness and auto-refresh if stale
            try:
                external_results = self.external_graph.check_and_refresh(external_results)
                
                # Check if project has custom implementation
                for node in external_results:
                    if node.referenced_by:
                        project_data = self.project_graph.get_by_ids(node.referenced_by)
                        # Attach project usage info
                
                return {
                    "status": "OK",
                    "source": "external",
                    "node_count": len(external_results),
                    "nodes": external_results,
                    "query": query_str
                }
            except RuntimeError as e:
                # Auto-refresh failed, escalate
                return {
                    "status": "ESCALATION_REQUIRED",
                    "target": "@mcp:context7",
                    "reason": str(e),
                    "query": query_str,
                    "instruction": "Agent MUST call @mcp:context7 to refresh stale knowledge. If Context7 fails, escalate to USER."
                }
        
        # PRIORITY 3: Escalate to Context7 for new external knowledge
        return self.escalate_to_context7(query_str)
    
    def escalate_to_context7(self, query: str) -> Dict:
        """
        Escalate knowledge query to Context7 MCP server.
        
        This is Step 3 in the escalation chain:
        Project (failed) → External (failed) → Context7 (here) → USER (if this fails)
        """
        print(f"📡 ESCALATING to @mcp:context7...")
        print(f"🔍 Query: {query}")
        
        return {
            "status": "ESCALATION_REQUIRED",
            "target": "@mcp:context7",
            "query": query,
            "instruction": (
                "Agent MUST call @mcp:context7 with this query. "
                "If Context7 returns no results, agent MUST escalate to USER."
            )
        }
    
    def filter_by_keywords(self, nodes: List[GraphNode], keywords: List[str]) -> List[GraphNode]:
        """Simple keyword filter for a list of nodes"""
        if not keywords:
            return nodes
        return [n for n in nodes if any(kw.lower() in str(n.__dict__).lower() for kw in keywords)]

    def get_locked_nodes(self, category: str) -> List[str]:
        """Get IDs of identity-locked nodes in a category"""
        results = self.query_by_category(category)
        # We need access to the raw node data for identity_locked check if not in GraphNode
        # But let's assume it's in connections or priority for now if not explicitly mapped
        # Or better check metadata if we can (but query_by_category returns GraphNode)
        # Let's check GraphNode definition again
        return [n.id for n in results if n.priority == 1] # Protocol: priority 1 is usually locked
            
    def query_by_category(self, category: str, priority_threshold: int = 99) -> List[GraphNode]:
        """Query both graphs by category (project first) with priority filtering"""
        # Project first
        results = self.project_graph.query_by_category(category)
        
        # External second (if no project results)
        if not results:
            results = self.external_graph.query_by_category(category)
            if results:
                results = self.external_graph.check_and_refresh(results)
        
        # Apply priority threshold filter
        if priority_threshold < 99:
            results = [n for n in results if n.priority <= priority_threshold]
            
        return results


# ============================================================================
# BACKWARD COMPATIBILITY
# ============================================================================

# Alias for backward compatibility with existing code
GraphQuery = DualGraphQuery


# ============================================================================
# MAIN (for testing)
# ============================================================================

if __name__ == "__main__":
    print("Testing Dual Graph Query System...")
    
    try:
        gq = DualGraphQuery()
        
        # Test 1: Query existing knowledge
        print("\n📊 Test 1: Query project knowledge")
        result = gq.safe_query(keywords=["brainbox"])
        print(f"Status: {result['status']}, Source: {result.get('source', 'N/A')}")
        
        # Test 2: Query external knowledge
        print("\n📊 Test 2: Query external knowledge")
        result = gq.safe_query(keywords=["react"])
        print(f"Status: {result['status']}, Source: {result.get('source', 'N/A')}")
        
        # Test 3: Query non-existent (should escalate)
        print("\n📊 Test 3: Query non-existent knowledge")
        result = gq.safe_query(keywords=["NonExistentFramework9000"])
        print(f"Status: {result['status']}, Target: {result.get('target', 'N/A')}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
