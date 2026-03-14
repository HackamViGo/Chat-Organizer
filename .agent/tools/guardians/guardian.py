import sys
import subprocess
import argparse
from pathlib import Path

# Configuration
GUARDIAN_DIR = Path(__file__).parent
SCRIPTS = {
    "sync": "package_sync_checker.py",
    "janitor": "brainbox_strict_janitor.py",
    "zod": "zod_schema_locator.py"
}

ROLE_MAP = {
    "ENV_ENGINEER": ["sync", "janitor"],
    "DASHBOARD_BUILDER": ["zod", "janitor"],
    "EXTENSION_ENGINEER": ["sync", "janitor"],
    "AI_ENGINEER": ["janitor"],
    "BRAINBOX_AUDITOR": ["sync", "janitor", "zod"],
    "QA_EXAMINER": ["sync", "zod"]
}

def run_script(name):
    script_path = GUARDIAN_DIR / SCRIPTS[name]
    if not script_path.exists():
        print(f"⚠️ Guardian script missing: {SCRIPTS[name]}")
        return False
    
    print(f"\n--- Running {name.upper()} ---")
    try:
        # We use subprocess.run to allow the script to take control of output (for the screaming janitor)
        subprocess.run([sys.executable, str(script_path)], check=True)
        return True
    except subprocess.CalledProcessError:
        return False

def main():
    parser = argparse.ArgumentParser(description="BrainBox Guardians Master Orchestrator")
    parser.add_argument("--role", help="Current Agent Role", choices=ROLE_MAP.keys())
    parser.add_argument("--all", action="store_true", help="Run all guardians")
    
    args = parser.parse_args()
    
    scripts_to_run = []
    
    if args.all:
        scripts_to_run = list(SCRIPTS.keys())
    elif args.role:
        scripts_to_run = ROLE_MAP[args.role]
        print(f"🛡️ Guarding role: {args.role}")
    else:
        print("Usage: python3 guardian.py --role [ROLE] or --all")
        sys.exit(1)

    all_passed = True
    for s in scripts_to_run:
        if not run_script(s):
            all_passed = False
            
    if not all_passed:
        print("\n" + "!"*40)
        print("  GUARDIANS DETECTED SYSTEM INSTABILITY")
        print("  PLEASE RESOLVE ERRORS BEFORE PROCEEDING")
        print("!"*40)
        sys.exit(1)
    else:
        print("\n✨ ALL GUARDIANS SATISFIED ✨")

if __name__ == "__main__":
    main()
