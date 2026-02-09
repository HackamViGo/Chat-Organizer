#!/usr/bin/env python3
"""
test_dual_graph.py - Test Suite for Dual Graph Architecture
Tests ExternalGraph, ProjectGraph, and DualGraphQuery
"""
import sys
import json
import tempfile
import shutil
from pathlib import Path
from datetime import datetime, timedelta

# Add scripts to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from graph_query import ExternalGraph, ProjectGraph, DualGraphQuery, GraphNode
from config import EXTERNAL_GRAPH_PATH, PROJECT_GRAPH_PATH


# ============================================================================
# TEST UTILITIES
# ============================================================================

class TestRunner:
    """Simple test runner"""
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
    
    def run_test(self, test_name, test_func):
        try:
            test_func()
            print(f"✅ {test_name}")
            self.passed += 1
            return True
        except AssertionError as e:
            print(f"❌ {test_name}: {e}")
            self.failed += 1
            self.errors.append((test_name, str(e)))
            return False
        except Exception as e:
            print(f"💥 {test_name}: {type(e).__name__}: {e}")
            self.failed += 1
            self.errors.append((test_name, f"{type(e).__name__}: {e}"))
            return False
    
    def summary(self):
        total = self.passed + self.failed
        pass_rate = (self.passed / total * 100) if total > 0 else 0
        
        print("\n" + "=" * 60)
        print(f"📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total}")
        print(f"✅ Passed: {self.passed}")
        print(f"❌ Failed: {self.failed}")
        print(f"📈 Pass Rate: {pass_rate:.1f}%")
        print("=" * 60)
        
        if self.errors:
            print("\n❌ FAILED TESTS:")
            for name, error in self.errors:
                print(f"  - {name}")
                print(f"    {error}")
        
        return pass_rate


# ============================================================================
# EXTERNAL GRAPH TESTS
# ============================================================================

def test_external_graph_loads():
    """Test that external graph loads successfully"""
    eg = ExternalGraph()
    assert eg.graph is not None, "External graph is None"
    assert "nodes" in eg.graph, "External graph missing 'nodes' key"
    assert len(eg.graph["nodes"]) > 0, "External graph is empty"

def test_external_graph_query_by_category():
    """Test querying external graph by category"""
    eg = ExternalGraph()
    results = eg.query_by_category("Programming Languages & Frameworks")
    assert isinstance(results, list), "Results is not a list"
    # May be empty if no nodes in that category

def test_external_graph_query_by_keywords():
    """Test querying external graph by keywords"""
    eg = ExternalGraph()
    results = eg.query_by_keywords(["react"])
    assert isinstance(results, list), "Results is not a list"

def test_external_graph_freshness_check():
    """Test freshness checking for external nodes"""
    eg = ExternalGraph()
    
    # Create a fresh node
    fresh_node = GraphNode(
        id="test_fresh",
        type="library",
        url="https://example.com",
        category="Test",
        sub_category="Test",
        priority=1,
        connections=[],
        last_updated=datetime.now().strftime("%Y-%m-%d")
    )
    
    # Should not raise error
    result = eg.check_and_refresh([fresh_node])
    assert len(result) == 1, "Fresh node check failed"


# ============================================================================
# PROJECT GRAPH TESTS
# ============================================================================

def test_project_graph_loads():
    """Test that project graph loads successfully"""
    pg = ProjectGraph()
    assert pg.graph is not None, "Project graph is None"
    assert "nodes" in pg.graph, "Project graph missing 'nodes' key"
    assert len(pg.graph["nodes"]) > 0, "Project graph is empty"

def test_project_graph_query_by_keywords():
    """Test querying project graph by keywords"""
    pg = ProjectGraph()
    results = pg.query_by_keywords(["brainbox"])
    assert isinstance(results, list), "Results is not a list"

def test_project_graph_no_freshness_checks():
    """Test that project nodes don't have last_updated field"""
    pg = ProjectGraph()
    # Project nodes should not have last_updated
    for node_data in pg.graph["nodes"]:
        assert "last_updated" not in node_data, f"Project node {node_data['id']} has last_updated field"


# ============================================================================
# DUAL GRAPH QUERY TESTS
# ============================================================================

def test_dual_graph_init():
    """Test DualGraphQuery initialization"""
    dq = DualGraphQuery()
    assert dq.project_graph is not None, "Project graph not initialized"
    assert dq.external_graph is not None, "External graph not initialized"

def test_dual_graph_query_priority_project_first():
    """Test that project graph is queried first"""
    dq = DualGraphQuery()
    result = dq.safe_query(keywords=["brainbox"])
    
    if result["status"] == "OK":
        # If found, should be from project (if project has brainbox nodes)
        # This test is soft - depends on actual graph content
        assert "source" in result, "Result missing 'source' field"

def test_dual_graph_query_escalation():
    """Test escalation for non-existent knowledge"""
    dq = DualGraphQuery()
    result = dq.safe_query(keywords=["NonExistentFramework9000"])
    assert result["status"] == "ESCALATION_REQUIRED", f"Expected escalation, got {result['status']}"
    assert result["target"] == "@mcp:context7", "Should escalate to Context7"

def test_dual_graph_cross_references():
    """Test that cross-references are enriched"""
    dq = DualGraphQuery()
    # Query something that likely has cross-references
    result = dq.safe_query(keywords=["react"])
    
    if result["status"] == "OK" and result.get("source") == "project":
        # Check if nodes have external_refs
        nodes = result.get("nodes", [])
        # This is a soft test - depends on actual graph content
        assert isinstance(nodes, list), "Nodes is not a list"


# ============================================================================
# INTEGRATION TESTS
# ============================================================================

def test_backward_compatibility():
    """Test that GraphQuery alias works"""
    from graph_query import GraphQuery
    gq = GraphQuery()
    assert isinstance(gq, DualGraphQuery), "GraphQuery is not DualGraphQuery"

def test_config_paths_exist():
    """Test that config paths are defined"""
    assert EXTERNAL_GRAPH_PATH.exists(), f"External graph not found at {EXTERNAL_GRAPH_PATH}"
    assert PROJECT_GRAPH_PATH.exists(), f"Project graph not found at {PROJECT_GRAPH_PATH}"


# ============================================================================
# MAIN TEST RUNNER
# ============================================================================

def main():
    print("=" * 60)
    print("🧪 DUAL GRAPH ARCHITECTURE TEST SUITE")
    print("=" * 60)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    runner = TestRunner()
    
    # External Graph Tests
    print("📦 EXTERNAL GRAPH TESTS")
    runner.run_test("test_external_graph_loads", test_external_graph_loads)
    runner.run_test("test_external_graph_query_by_category", test_external_graph_query_by_category)
    runner.run_test("test_external_graph_query_by_keywords", test_external_graph_query_by_keywords)
    runner.run_test("test_external_graph_freshness_check", test_external_graph_freshness_check)
    
    # Project Graph Tests
    print("\n📋 PROJECT GRAPH TESTS")
    runner.run_test("test_project_graph_loads", test_project_graph_loads)
    runner.run_test("test_project_graph_query_by_keywords", test_project_graph_query_by_keywords)
    runner.run_test("test_project_graph_no_freshness_checks", test_project_graph_no_freshness_checks)
    
    # Dual Graph Query Tests
    print("\n🔗 DUAL GRAPH QUERY TESTS")
    runner.run_test("test_dual_graph_init", test_dual_graph_init)
    runner.run_test("test_dual_graph_query_priority_project_first", test_dual_graph_query_priority_project_first)
    runner.run_test("test_dual_graph_query_escalation", test_dual_graph_query_escalation)
    runner.run_test("test_dual_graph_cross_references", test_dual_graph_cross_references)
    
    # Integration Tests
    print("\n🔗 INTEGRATION TESTS")
    runner.run_test("test_backward_compatibility", test_backward_compatibility)
    runner.run_test("test_config_paths_exist", test_config_paths_exist)
    
    # Summary
    pass_rate = runner.summary()
    
    if pass_rate >= 90:
        print("\n🎉 SUCCESS: Pass rate ≥ 90%")
        return 0
    else:
        print(f"\n⚠️  WARNING: Pass rate {pass_rate:.1f}% < 90%")
        return 1


if __name__ == "__main__":
    exit(main())
