import os
import re
from pathlib import Path

# Paths
BASE_DIR = Path("meta_architect")
SCRIPTS_DIR = BASE_DIR / "scripts"
HEALTH_CHECK_FILE = SCRIPTS_DIR / "project_health_check.py"
VALIDATOR_FILE = SCRIPTS_DIR / "infra_validator.py"
CONFIG_FILE = BASE_DIR / "audit_config.yml"

def create_strict_config():
    """1. Create the strict YAML config"""
    print(f"🔨 Creating strict config at {CONFIG_FILE}...")
    
    config_content = """weights:
  hardcoded_token: 20       # Immediate fail if > 4 tokens found (High Risk)
  missing_gitignore_env: 50 # Immediate fail (Critical Risk)
  broken_import: 10         # High Risk
  console_log: 0.5          # 20 logs = -10 points. 200 logs = Fail.

thresholds:
  critical: 85              # Raised from 70
  warning: 95

exclusions:
  directories: 
    - "node_modules"
    - ".git"
    - "dist"
    - ".next"
    - "coverage"
    - ".agent"
    - "agent_states"
  files: 
    - "pnpm-lock.yaml"
    - "package-lock.json"

allowed_patterns:
  - "example"
  - "placeholder"
  - "00000000000000000000000000000000"
"""
    # Ensure directory exists
    BASE_DIR.mkdir(exist_ok=True)
    
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        f.write(config_content)
    print("✅ Config created.")

def patch_health_check():
    """2. Fix weak defaults and pathing in health checker"""
    print(f"🔨 Patching {HEALTH_CHECK_FILE}...")
    
    if not HEALTH_CHECK_FILE.exists():
        print(f"❌ Error: {HEALTH_CHECK_FILE} not found.")
        return

    with open(HEALTH_CHECK_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    # Fix 1: Change default console_log penalty from 0.1 to 0.5
    content = content.replace('"console_log": 0.1', '"console_log": 0.5')
    
    # Fix 2: Point to the correct config path
    # We change the default arg from "audit_config.yml" to ".agent/skills/meta_architect/audit_config.yml"
    content = content.replace('config_path="audit_config.yml"', 'config_path=".agent/skills/meta_architect/audit_config.yml"')

    with open(HEALTH_CHECK_FILE, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ Health Check patched (Strictness increased).")

def rewrite_validator():
    """3. Rewrite validator to actually PARSE the score"""
    print(f"🔨 Rewriting {VALIDATOR_FILE} to parse scores...")

    new_validator_code = """
import json
import os
import sys
import re

def verify_gate():
    print("🚀 Running Meta-Architect Verification Gate (Strict Mode)...")
    
    # 1. Check Graph integrity
    graph_path = ".agent/skills/meta_architect/resources/knowledge_graph.json"
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
    report_files = ["audit_report.md", ".agent/skills/meta_architect/resources/audit_report.md", "walkthrough.md"]
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
"""
    # Ensure directory exists
    SCRIPTS_DIR.mkdir(parents=True, exist_ok=True)

    with open(VALIDATOR_FILE, "w", encoding="utf-8") as f:
        f.write(new_validator_code)
    print("✅ Validator rewritten (Now parses scores).")

if __name__ == "__main__":
    print("🛡️  Starting Meta-Architect Security Patch...")
    create_strict_config()
    patch_health_check()
    rewrite_validator()
    print("\n🏁 Done. You can now run 'pnpm verify' to test the strict rules.")