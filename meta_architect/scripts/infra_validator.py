
import json
import os
import sys
import re

def verify_gate():
    print("🚀 Running Meta-Architect Verification Gate (Strict Mode)...")
    
    # 1. Check Graph integrity
    graph_path = "meta_architect/resources/knowledge_graph.json"
    if not os.path.exists(graph_path):
        # Fallback for flat structure
        graph_path = "knowledge_graph.json"
        
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

    # 2. Check Health Score (Parsing Logic)
    report_files = ["audit_report.md", "meta_architect/resources/audit_report.md", "walkthrough.md"]
    found_score = False
    
    for report in report_files:
        if os.path.exists(report):
            try:
                with open(report, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Regex to find "Score: 89.4/100" or "Score: 90/100"
                match = re.search(r"Score:\s*([\d\.]+)/100", content)
                
                if match:
                    score = float(match.group(1))
                    print(f"📄 Analyzed {report}: Score is {score}")
                    
                    if score >= 85:
                        print(f"✅ Security Gate: PASS (Threshold: 85)")
                        found_score = True
                        break
                    else:
                        print(f"❌ Security Gate: FAIL (Score {score} < 85)")
                        return False
                else:
                    print(f"⚠️ Found {report} but could not parse score.")
            except Exception as e:
                print(f"⚠️ Error reading {report}: {e}")

    if not found_score:
        print("❌ No valid audit report with a score found. Run 'pnpm audit' first.")
        return False

    print("🎉 All Systems Go.")
    return True

if __name__ == "__main__":
    if verify_gate():
        sys.exit(0)
    else:
        sys.exit(1)
