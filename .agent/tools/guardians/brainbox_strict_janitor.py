import os
import time
import json
from pathlib import Path

# Configuration
ROOT = Path(".")
DOCS_DIR = ROOT / "docs"
FORBIDDEN_FILES = ["package-lock.json", "yarn.lock"]
PROTECTED_MD_LOCATIONS = ["docs", "README.md"] # Rule #0: .md files only in docs/ except root/app README

def scream(message, count=1):
    for _ in range(count):
        print(f"\033[1;31;40m 🚨 {message.upper()} 🚨 \033[0m")

def check_rule_integrity():
    issues = []
    
    # Check for forbidden lock files (Rule #1)
    for lock_file in FORBIDDEN_FILES:
        for path in ROOT.rglob(lock_file):
            if "node_modules" not in str(path):
                issues.append(f"FORBIDDEN LOCK FILE FOUND: {path}")

    # Check for stray .md files (Rule #0)
    for md_file in ROOT.rglob("*.md"):
        if "node_modules" in str(md_file): continue
        if ".cursor" in str(md_file): continue
        if ".agent" in str(md_file): continue
        if ".agents" in str(md_file): continue
        if ".github" in str(md_file): continue
        
        # Rule #0 Exception: README.md at root of package/app
        is_allowed = False
        if str(md_file).endswith("README.md"):
            is_allowed = True
        elif str(md_file).startswith("docs/"):
            is_allowed = True
            
        if not is_allowed:
            issues.append(f"STRAY .MD FILE DETECTED OUTSIDE DOCS/: {md_file}")

    return issues

def check_folder_integrity():
    issues = []
    inventory_path = ROOT / ".agent/tools/automators/inventory.json"
    if not inventory_path.exists(): return issues
    
    with open(inventory_path, 'r') as f:
        inventory = json.load(f)
        
    monitored = {
        "agent_states": ROOT / "agent_states",
        "roles": ROOT / "docs/agents/roles"
    }
    
    for key, path in monitored.items():
        if path.exists():
            current_count = len([f for f in os.listdir(path) if os.path.isfile(path / f)])
            if current_count != inventory.get(key):
                issues.append(f"FOLDER INTEGRITY VIOLATION in {key}: Expected {inventory.get(key)} files, found {current_count}. (Did someone add/remove a role/state without updating inventory?)")
    
    return issues

def main():
    issues = check_rule_integrity() + check_folder_integrity()
    
    if not issues:
        print("\033[1;32m✅ JANITOR: System hygiene is perfect.\033[0m")
        return

    # THE LOUD WARNING SEQUENCE
    print("\n" + "="*60)
    scream("CORE RULE VIOLATION DETECTED", 10)
    
    print("\nFound the following issues:")
    for issue in issues:
        print(f"  ❌ {issue}")
    
    print("\nWaiting for 2 seconds...")
    time.sleep(2)
    
    scream("ACTION REQUIRED IMMEDIATELY", 5)
    
    print("\nWaiting for 8 seconds for you to read this carefully...")
    time.sleep(8)
    
    print("\n" + "!"*60)
    print("\033[1;33;41m НАПРАВИ ЛИ ПРОМЕНИТЕ? \033[0m")
    print("!"*60 + "\n")

if __name__ == "__main__":
    main()
