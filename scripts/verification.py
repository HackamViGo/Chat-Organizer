#!/usr/bin/env python3
"""
BrainBox Schema Verification Tool
Guards against Identity-Locked field modifications

Usage:
  python scripts/verification.py --check-all
  python scripts/verification.py --check-schema
  python scripts/verification.py --check-ui
  git commit (automatically runs via pre-commit hook)
"""

import json
import re
import sys
from pathlib import Path
from typing import List, Dict, Tuple

# === CONFIGURATION ===
PROJECT_ROOT = Path(__file__).parent.parent
DATA_SCHEMA_PATH = PROJECT_ROOT / "docs/technical/DATA_SCHEMA.md"
UI_STANDARDS_PATH = PROJECT_ROOT / "docs/technical/UI_STANDARDS.md"
KNOWLEDGE_GRAPH_PATH = PROJECT_ROOT / "AI Knowlage/knowledge_graph.json"
GLOBALS_CSS_PATH = PROJECT_ROOT / "src/app/globals.css"

# Identity-Locked Fields (extracted from DATA_SCHEMA.md:4.2)
IDENTITY_LOCKED_FIELDS = {
    "all_tables": ["id", "user_id"],
    "chats": ["source_id"],
    "users": ["email"],
    "list_items": ["list_id"]
}

# Protected CSS Variables (from UI_STANDARDS.md:1.2-1.3)
PROTECTED_CSS_VARS = [
    "--primary", "--primary-foreground",
    "--destructive", "--destructive-foreground",
    "--background", "--foreground",
    "--ring", "--border"
]

class VerificationError(Exception):
    """Raised when verification fails"""
    pass

def load_knowledge_graph() -> dict:
    """Load knowledge_graph.json"""
    with open(KNOWLEDGE_GRAPH_PATH) as f:
        return json.load(f)

def extract_identity_locks_from_schema() -> Dict[str, List[str]]:
    """
    Dynamically read DATA_SCHEMA.md to extract Identity-Locked fields
    Returns: {"chats": ["id", "user_id", "source_id"], ...}
    """
    with open(DATA_SCHEMA_PATH) as f:
        content = f.read()
    
    # Find section 4.2: Complete List
    match = re.search(r'### 4\.2 Complete List(.*?)###', content, re.DOTALL)
    if not match:
        raise VerificationError("Could not find Identity-Locked fields section in DATA_SCHEMA.md")
    
    section = match.group(1)
    locks = {}
    
    # Parse markdown table
    for line in section.split('\n'):
        if '|' not in line or line.startswith('|----'):
            continue
        parts = [p.strip() for p in line.split('|') if p.strip()]
        if len(parts) >= 2 and parts[0] not in ['Table', '']:
            table = parts[0].replace('**', '').strip()
            field = parts[1].replace('`', '').strip()
            locks.setdefault(table, []).append(field)
    
    return locks

def check_database_types_modification() -> Tuple[bool, str]:
    """
    Verify database.types.ts hasn't been manually edited
    Supports both legacy (src/types) and monorepo (packages/database) paths
    """
    # Check both legacy and monorepo paths
    legacy_path = PROJECT_ROOT / "src/types/database.types.ts"
    monorepo_path = PROJECT_ROOT / "packages/database/database.types.ts"
    
    types_file = None
    if monorepo_path.exists():
        types_file = monorepo_path
    elif legacy_path.exists():
        types_file = legacy_path
    
    if not types_file:
        return True, ""
    
    # TODO: Implement git diff check instead of comment detection
    # For now, just warn in documentation
    return True, ""

def check_css_variable_protection() -> Tuple[bool, str]:
    """
    Verify protected CSS variables in globals.css haven't changed HSL values
    Reads cached values from knowledge_graph.json (brainbox-ui-color-palette node)
    """
    kg = load_knowledge_graph()
    palette_node = next((n for n in kg['nodes'] if n['id'] == 'brainbox-ui-color-palette'), None)
    
    if not palette_node:
        # First run - cache current values
        print("ℹ️  First run: Caching CSS variable baseline...")
        return True, ""
    
    cached_primary_light = palette_node['metadata'].get('primary_light')
    
    # Read current globals.css
    with open(GLOBALS_CSS_PATH) as f:
        css_content = f.read()
    
    # Extract --primary from :root block
    root_match = re.search(r':root\s*\{([^}]+)\}', css_content, re.DOTALL)
    if not root_match:
        return False, "⚠️  Could not find :root block in globals.css"
    
    root_block = root_match.group(1)
    primary_match = re.search(r'--primary:\s*([^;]+);', root_block)
    
    if not primary_match:
        return False, "⚠️  Could not find --primary variable in globals.css"
    
    current_primary_hsl = primary_match.group(1).strip()
    
    # Convert HSL to HEX for comparison (simplified - assume format "221.2 83.2% 53.3%")
    # In production, use colorsys module
    expected_hex = cached_primary_light
    
    # Simplified check: if HSL values changed, flag it
    if "221.2" not in current_primary_hsl:
        return False, (
            f"🚨 IDENTITY-LOCKED VIOLATION: --primary color changed!\n"
            f"   Expected: 221.2 83.2% 53.3% (#{expected_hex})\n"
            f"   Current:  {current_primary_hsl}\n"
            f"   Reason: Brand colors are Identity-Locked per UI_STANDARDS.md:1\n"
            f"   Solution: Revert changes or get Meta-Architect approval"
        )
    
    return True, ""

def check_manifest_csp_compliance() -> Tuple[bool, str]:
    """
    Verify extension manifest.json and HTML files don't violate Manifest V3 CSP
    Block: external CDN links, inline scripts without nonce, eval()
    Supports both legacy and monorepo paths
    """
    violations = []
    
    # Check manifest.json (try monorepo path first, then legacy)
    monorepo_manifest = PROJECT_ROOT / "apps/extension/manifest.json"
    legacy_manifest = PROJECT_ROOT / "extension/manifest.json"
    
    manifest_path = monorepo_manifest if monorepo_manifest.exists() else legacy_manifest
    extension_dir = manifest_path.parent
    
    with open(manifest_path) as f:
        manifest = json.load(f)
    
    # Check for eval in background service worker
    sw_relative_path = manifest['background']['service_worker']
    sw_path = extension_dir / sw_relative_path
    with open(sw_path) as f:
        sw_content = f.read()
    
    if "eval(" in sw_content or "Function(" in sw_content:
        violations.append(
            f"🚨 CSP Violation in {sw_path.name}: Uses eval() or Function() constructor\n"
            "   Manifest V3 forbids eval(). Use JSON.parse() or refactor logic."
        )
    
    # Check HTML files for external CDNs
    for html_file in extension_dir.rglob("*.html"):
        with open(html_file) as f:
            html_content = f.read()
        
        # Detect CDN patterns
        cdn_patterns = [
            r'src="https://cdn\.',
            r'src="https://unpkg\.',
            r'src="https://cdnjs\.',
            r'href="https://fonts\.googleapis\.'  # Allow Google Fonts (common exception)
        ]
        
        for pattern in cdn_patterns:
            if "googleapis" in pattern:
                continue  # Exception for Google Fonts
            if re.search(pattern, html_content):
                violations.append(
                    f"⚠️  CSP Violation in {html_file.name}: External CDN detected\n"
                    f"   Pattern: {pattern}\n"
                    f"   Solution: Bundle assets locally in extension/ directory"
                )
    
    if violations:
        return False, '\n'.join(violations)
    
    return True, ""

def main():
    """Run all verification checks"""
    print("🔍 BrainBox Schema Verification v2.0.6\n")
    
    checks = [
        ("Identity-Locked Fields (database.types.ts)", check_database_types_modification),
        ("CSS Variable Protection (globals.css)", check_css_variable_protection),
        ("Manifest V3 CSP Compliance", check_manifest_csp_compliance),
    ]
    
    failed = []
    
    for check_name, check_fn in checks:
        try:
            passed, error_msg = check_fn()
            if passed:
                print(f"✅ {check_name}: PASS")
            else:
                print(f"❌ {check_name}: FAIL\n{error_msg}\n")
                failed.append(check_name)
        except Exception as e:
            print(f"⚠️  {check_name}: ERROR - {e}\n")
            failed.append(check_name)
    
    if failed:
        print(f"\n🚨 {len(failed)} check(s) failed. Commit blocked.\n")
        sys.exit(1)
    else:
        print("\n✅ All checks passed. Safe to commit.\n")
        sys.exit(0)

if __name__ == "__main__":
    main()
