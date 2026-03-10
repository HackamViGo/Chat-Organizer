import os
import json
from pathlib import Path

# Configuration
ROOT_DIR = Path(".")
PACKAGES_TO_CHECK = [
    ROOT_DIR / "package.json",
    ROOT_DIR / "apps/dashboard/package.json",
    ROOT_DIR / "apps/extension/package.json",
    ROOT_DIR / "packages/shared/package.json",
    ROOT_DIR / "packages/validation/package.json",
    ROOT_DIR / "packages/ui/package.json",
    ROOT_DIR / "packages/database/package.json"
]

def load_json(path):
    if not path.exists(): return None
    with open(path, 'r') as f:
        return json.load(f)

def log_guardian(script, error, cause, action="PENDING"):
    log_path = ROOT_DIR / ".agent/logs/guardians.log"
    entry = f"""
Agent: SYSTEM_GUARDIAN
Date: {os.popen('date "+%Y-%m-%d %H:%M"').read().strip()}
Guardian: {script}
Error: {error}
Cause: {cause}
Action: {action}
----------------------------------------
"""
    with open(log_path, 'a') as f:
        f.write(entry)

def check_sync():
    root_pkg = load_json(ROOT_DIR / "package.json")
    if not root_pkg: return

    root_deps = {**root_pkg.get("dependencies", {}), **root_pkg.get("devDependencies", {})}
    
    mismatches = []
    
    for pkg_path in PACKAGES_TO_CHECK:
        if pkg_path == ROOT_DIR / "package.json": continue
        
        pkg = load_json(pkg_path)
        if not pkg: continue
        
        rel_path = pkg_path.relative_to(ROOT_DIR)
        pkg_deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
        
        for dep, ver in pkg_deps.items():
            if dep.startswith("@brainbox/"): continue # Local workspace
            if ver == "workspace:*": continue
            
            root_ver = root_deps.get(dep)
            if not root_ver:
                mismatches.append(f"MISSING FROM ROOT: '{dep}' found in {rel_path} but not in root package.json")
            elif root_ver != ver:
                mismatches.append(f"VERSION MISMATCH: '{dep}' has {ver} in {rel_path} but {root_ver} in Root")

    # THE TRACING LOGIC (Joker logic)
    # Check if a package exports validation but doesn't have zod in its own dependencies (Rule #3/Logic)
    shared_pkg = load_json(ROOT_DIR / "packages/shared/package.json")
    if shared_pkg:
        exports = shared_pkg.get("exports", {})
        if "./validation" in exports and "zod" not in shared_pkg.get("dependencies", {}):
            # This is a ticking bomb if used in a environment without hoisted deps
            mismatches.append("LOGIC BOMB: @brainbox/shared exports validation but lacks 'zod' in its own dependencies. Relying on hoisting is dangerous for runtime.")

    return mismatches

def main():
    print("🔍 RUNNING PACKAGE SYNC CHECKER...")
    mismatches = check_sync()
    
    if mismatches:
        print(f"\n❌ FAILED: Found {len(mismatches)} synchronization issues.")
        for m in mismatches:
            print(f"  - {m}")
            log_guardian("package_sync_checker.py", m, "Monorepo dependency drift")
        exit(1)
    else:
        print("\n✅ SUCCESS: All dependencies are synchronized.")

if __name__ == "__main__":
    main()
