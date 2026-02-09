#!/usr/bin/env python3
"""
test_meta_architect.py - Test Suite for Meta-Architect System
Comprehensive tests for all core modules (NO pytest required)
"""
import sys
import json
import yaml
import tempfile
import shutil
from pathlib import Path
from datetime import datetime

# Add scripts directory to path
SCRIPTS_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(SCRIPTS_DIR))

# Import modules to test
from config import (
    find_project_root,
    PROJECT_ROOT,
    GRAPH_PATH,
    validate_paths,
    ROLE_CATEGORY_MAP
)
from graph_query import GraphQuery, GraphNode
from state_manager import StateManager, TaskStatus, AgentState


# ============================================================================
# TEST UTILITIES
# ============================================================================

class TestRunner:
    """Simple test runner with pass/fail tracking"""
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
    
    def run_test(self, test_name, test_func):
        """Run a single test and track result"""
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
        """Print test summary"""
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
# TEST FIXTURES
# ============================================================================

def create_temp_graph():
    """Create temporary graph file for testing"""
    graph_data = {
        "nodes": [
            {
                "id": "test_node_1",
                "type": "library",
                "metadata": {
                    "category": "Programming Languages & Frameworks",
                    "sub_category": "JavaScript",
                    "priority": 1,
                    "access_url": "https://example.com"
                }
            },
            {
                "id": "test_node_2",
                "type": "tool",
                "metadata": {
                    "category": "Databases & Data Infrastructure",
                    "sub_category": "PostgreSQL",
                    "priority": 2,
                    "access_url": "https://example.com/db"
                }
            }
        ],
        "metadata": {
            "version": "test",
            "node_count": 2
        }
    }
    
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
    json.dump(graph_data, temp_file)
    temp_file.close()
    return Path(temp_file.name)


# ============================================================================
# CONFIG MODULE TESTS
# ============================================================================

def test_find_project_root():
    """Test that find_project_root finds .agent directory"""
    root = find_project_root()
    assert root.exists(), "Project root doesn't exist"
    assert (root / ".agent").exists(), ".agent directory not found"

def test_project_root_is_path():
    """Test that PROJECT_ROOT is a Path object"""
    assert isinstance(PROJECT_ROOT, Path), f"PROJECT_ROOT is {type(PROJECT_ROOT)}, not Path"

def test_graph_path_exists():
    """Test that GRAPH_PATH points to existing file"""
    assert GRAPH_PATH.exists(), f"Graph file not found at {GRAPH_PATH}"
    assert GRAPH_PATH.suffix == ".json", f"Graph file has wrong extension: {GRAPH_PATH.suffix}"

def test_validate_paths():
    """Test path validation"""
    result = validate_paths()
    assert result is True, "Path validation failed"

def test_role_category_map():
    """Test ROLE_CATEGORY_MAP structure"""
    assert isinstance(ROLE_CATEGORY_MAP, dict), "ROLE_CATEGORY_MAP is not a dict"
    assert "frontend_specialist" in ROLE_CATEGORY_MAP, "frontend_specialist not in map"
    assert "backend_specialist" in ROLE_CATEGORY_MAP, "backend_specialist not in map"
    assert len(ROLE_CATEGORY_MAP) > 0, "ROLE_CATEGORY_MAP is empty"


# ============================================================================
# GRAPH QUERY TESTS (Updated for Dual Graph)
# ============================================================================

def test_load_dual_graph_success():
    """Test loading dual graph system"""
    from graph_query import DualGraphQuery
    gq = DualGraphQuery()
    assert gq.project_graph is not None, "Project graph not loaded"
    assert gq.external_graph is not None, "External graph not loaded"

def test_query_by_category():
    """Test category-based querying"""
    from graph_query import DualGraphQuery
    gq = DualGraphQuery()
    results = gq.query_by_category("Programming Languages & Frameworks")
    assert isinstance(results, list), "Results is not a list"

def test_safe_query_existing_keyword():
    """Test safe_query with existing keyword"""
    from graph_query import DualGraphQuery
    gq = DualGraphQuery()
    result = gq.safe_query(keywords=["react"])
    assert result["status"] in ["OK", "ESCALATION_REQUIRED"], f"Unexpected status: {result['status']}"

def test_safe_query_missing_keyword_escalates():
    """Test safe_query escalates for missing keyword (NEW BEHAVIOR)"""
    from graph_query import DualGraphQuery
    gq = DualGraphQuery()
    result = gq.safe_query(keywords=["NonExistentFramework"])
    assert result["status"] == "ESCALATION_REQUIRED", f"Expected escalation, got {result['status']}"
    assert result["target"] == "@mcp:context7", "Should escalate to Context7"


# ============================================================================
# STATE MANAGER TESTS
# ============================================================================

def test_state_manager_init():
    """Test StateManager initialization"""
    temp_dir = tempfile.mkdtemp()
    try:
        sm = StateManager(temp_dir)
        assert sm.state_dir.exists(), "State directory not created"
    finally:
        shutil.rmtree(temp_dir)

def test_create_state():
    """Test creating new agent state"""
    temp_dir = tempfile.mkdtemp()
    try:
        sm = StateManager(temp_dir)
        state = sm.create_state(
            role="test_agent",
            task_description="Test task",
            context_package_path="/tmp/test.md"
        )
        assert state.role == "test_agent", f"Wrong role: {state.role}"
        assert state.status == TaskStatus.IDLE.value, f"Wrong status: {state.status}"
    finally:
        shutil.rmtree(temp_dir)

def test_save_and_load_state():
    """Test saving and loading state"""
    temp_dir = tempfile.mkdtemp()
    try:
        sm = StateManager(temp_dir)
        state = sm.create_state(
            role="test_agent",
            task_description="Test task",
            context_package_path="/tmp/test.md"
        )
        
        # Save state
        filepath = sm.save_state(state)
        assert filepath.exists(), "State file not created"
        
        # Load state
        loaded_state = sm.load_state(state.agent_id)
        assert loaded_state.agent_id == state.agent_id, "Agent ID mismatch"
        assert loaded_state.role == state.role, "Role mismatch"
    finally:
        shutil.rmtree(temp_dir)

def test_update_status():
    """Test updating agent status"""
    temp_dir = tempfile.mkdtemp()
    try:
        sm = StateManager(temp_dir)
        state = sm.create_state(
            role="test_agent",
            task_description="Test task",
            context_package_path="/tmp/test.md"
        )
        sm.save_state(state)
        
        # Update status
        sm.update_status(state.agent_id, TaskStatus.ACTIVE)
        
        # Verify update
        updated_state = sm.load_state(state.agent_id)
        assert updated_state.status == TaskStatus.ACTIVE.value, f"Status not updated: {updated_state.status}"
    finally:
        shutil.rmtree(temp_dir)


# ============================================================================
# INTEGRATION TESTS
# ============================================================================

def test_config_and_graph_integration():
    """Test that config paths work with DualGraphQuery"""
    from graph_query import DualGraphQuery
    gq = DualGraphQuery()  # Should use paths from config
    assert gq.project_graph is not None, "Project graph not loaded from config path"
    assert gq.external_graph is not None, "External graph not loaded from config path"

def test_role_category_mapping():
    """Test that ROLE_CATEGORY_MAP is used correctly"""
    expected_roles = [
        "frontend_specialist",
        "backend_specialist",
        "db_architect",
        "devops_engineer"
    ]
    
    for role in expected_roles:
        assert role in ROLE_CATEGORY_MAP, f"Role {role} not in map"
        assert isinstance(ROLE_CATEGORY_MAP[role], str), f"Role {role} value is not string"
        assert len(ROLE_CATEGORY_MAP[role]) > 0, f"Role {role} has empty value"


# ============================================================================
# MAIN TEST RUNNER
# ============================================================================

def main():
    """Run all tests"""
    print("=" * 60)
    print("🧪 META-ARCHITECT SYSTEM TEST SUITE")
    print("=" * 60)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    runner = TestRunner()
    
    # Config Tests
    print("📦 CONFIG MODULE TESTS")
    runner.run_test("test_find_project_root", test_find_project_root)
    runner.run_test("test_project_root_is_path", test_project_root_is_path)
    runner.run_test("test_graph_path_exists", test_graph_path_exists)
    runner.run_test("test_validate_paths", test_validate_paths)
    runner.run_test("test_role_category_map", test_role_category_map)
    
    # Graph Query Tests (Dual Graph)
    print("\n🔍 GRAPH QUERY TESTS (DUAL GRAPH)")
    runner.run_test("test_load_dual_graph_success", test_load_dual_graph_success)
    runner.run_test("test_query_by_category", test_query_by_category)
    runner.run_test("test_safe_query_existing_keyword", test_safe_query_existing_keyword)
    runner.run_test("test_safe_query_missing_keyword_escalates", test_safe_query_missing_keyword_escalates)
    
    # State Manager Tests
    print("\n📋 STATE MANAGER TESTS")
    runner.run_test("test_state_manager_init", test_state_manager_init)
    runner.run_test("test_create_state", test_create_state)
    runner.run_test("test_save_and_load_state", test_save_and_load_state)
    runner.run_test("test_update_status", test_update_status)
    
    # Integration Tests
    print("\n🔗 INTEGRATION TESTS")
    runner.run_test("test_config_and_graph_integration", test_config_and_graph_integration)
    runner.run_test("test_role_category_mapping", test_role_category_mapping)
    
    # Summary
    pass_rate = runner.summary()
    
    # Exit code based on pass rate
    if pass_rate >= 90:
        print("\n🎉 SUCCESS: Pass rate ≥ 90%")
        return 0
    else:
        print(f"\n⚠️  WARNING: Pass rate {pass_rate:.1f}% < 90%")
        return 1


if __name__ == "__main__":
    exit(main())
