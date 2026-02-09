#!/usr/bin/env python3
"""
Test escalation chain: Graph → Context7 → USER
"""
import sys
from pathlib import Path

# Add scripts to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from graph_query import GraphQuery

def test_escalation():
    """Test the escalation chain"""
    print("=" * 60)
    print("TEST: Escalation Chain (Graph → Context7 → USER)")
    print("=" * 60)
    
    gq = GraphQuery()
    
    # Test 1: Query that EXISTS in graph (should return OK)
    print("\n📊 Test 1: Query existing knowledge (Next.js)")
    result = gq.safe_query(keywords=["next.js"])
    print(f"Status: {result['status']}")
    if result['status'] == 'OK':
        print(f"✅ Found {result['node_count']} nodes")
    else:
        print(f"❌ Unexpected status: {result}")
    
    # Test 2: Query that DOESN'T EXIST (should escalate to Context7)
    print("\n📊 Test 2: Query non-existent knowledge (FakeFramework9000)")
    result = gq.safe_query(keywords=["FakeFramework9000"])
    print(f"Status: {result['status']}")
    if result['status'] == 'ESCALATION_REQUIRED':
        print(f"✅ Correctly escalated to {result['target']}")
        print(f"📋 Query: {result['query']}")
        print(f"📋 Instruction: {result['instruction']}")
    else:
        print(f"❌ Should have escalated but got: {result}")
    
    # Test 3: Empty graph scenario (move graph temporarily)
    print("\n📊 Test 3: Missing graph file (should CRASH with instructions)")
    from config import GRAPH_PATH
    import shutil
    
    backup_path = GRAPH_PATH.parent / "knowledge_graph_backup.json"
    try:
        shutil.move(str(GRAPH_PATH), str(backup_path))
        print("Moved graph file to simulate missing scenario...")
        
        try:
            gq_missing = GraphQuery()
            print("❌ Should have raised RuntimeError!")
        except RuntimeError as e:
            print("✅ Correctly raised RuntimeError:")
            print(str(e))
    finally:
        # Restore graph
        if backup_path.exists():
            shutil.move(str(backup_path), str(GRAPH_PATH))
            print("\n✅ Graph file restored")
    
    print("\n" + "=" * 60)
    print("ESCALATION CHAIN TEST COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    test_escalation()
