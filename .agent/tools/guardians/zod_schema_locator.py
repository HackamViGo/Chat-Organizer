import os
import re
from pathlib import Path

# Configuration
ROOT_DIR = Path(".")
API_DIR = ROOT_DIR / "apps/dashboard/src/app/api"
ALLOWED_IMPORT = "from '@brainbox/validation'"

# Regex to find z.object definition (ignoring comments)
ZOD_OBJECT_PATTERN = re.compile(r'z\.object\s*\(\{', re.MULTILINE)

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

def find_violations():
    violations = []
    
    if not API_DIR.exists(): return []

    for file in API_DIR.rglob("route.ts"):
        content = file.read_text()
        
        # Check for z.object definitions
        if ZOD_OBJECT_PATTERN.search(content):
            # Check if it's imported correctly
            if ALLOWED_IMPORT not in content:
                violations.append(f"INLINE ZOD SCHEMA: {file} contains z.object but does not import from @brainbox/validation (Rule #3)")

    return violations

def main():
    print("🧪 RUNNING ZOD SCHEMA LOCATOR...")
    violations = find_violations()
    
    if violations:
        print(f"\n❌ FAILED: Found {len(violations)} Rule #3 violations.")
        for v in violations:
            print(f"  - {v}")
            log_guardian("zod_schema_locator.py", v, "Inline validation schemas in API routes")
        exit(1)
    else:
        print("\n✅ SUCCESS: No inline Zod schemas found in API routes.")

if __name__ == "__main__":
    main()
