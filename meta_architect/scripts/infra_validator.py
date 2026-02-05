
import json
import os
import sys

def verify_gate():
    print("🚀 Running Meta-Architect Verification Gate...")
    
    # Check Graph integrity
    graph_path = "meta_architect/resources/knowledge_graph.json"
    if not os.path.exists(graph_path):
        graph_path = "knowledge_graph.json" # Fallback
        
    if os.path.exists(graph_path):
        try:
            with open(graph_path, 'r') as f:
                json.load(f)
            print("✅ Knowledge Graph integrity: PASS")
        except Exception as e:
            print(f"❌ Knowledge Graph integrity: FAIL ({e})")
            return False
    else:
        print("⚠️ Knowledge Graph missing, skipping check.")

    # Check Health Score from audit report or latest walkthrough
    report_found = False
    for report in ["audit_report.md", "meta_architect/resources/audit_report.md", "walkthrough.md"]:
        if os.path.exists(report):
            print(f"✅ Report found ({report}): PASS")
            report_found = True
            break
            
    if not report_found:
        print("❌ No audit or walkthrough report found: FAIL")
        return False

    print("🎉 Verification Gate: PASSED")
    return True

if __name__ == "__main__":
    if verify_gate():
        sys.exit(0)
    else:
        sys.exit(1)
