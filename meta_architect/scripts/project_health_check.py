"""
Project Auditor Engine v2.5
Deterministic security & health scanner.
"""

import os
import re
import yaml
from pathlib import Path

class HealthEngine:
    def __init__(self, config_path="audit_config.yml"):
        self.base_score = 100
        self.config = self._load_config(config_path)
        # Logic Drift Fix: Enforce config weights, do not use hardcoded fallbacks
        self.deductions = self.config.get("weights", {})
        if not self.deductions:
             # Fallback only if config is completely broken, but warn
             print("⚠️ Warning: No weights found in config, using defaults.")
             self.deductions = {
                "hardcoded_token": 5, 
                "missing_gitignore_env": 20, 
                "broken_import": 10,  
                "console_log": 0.1
             }
        self.issues = {
            "hardcoded_token": 0,
            "missing_gitignore_env": 0,
            "broken_import": 0,
            "console_log": 0
        }

    def _load_config(self, path):
        if os.path.exists(path):
            with open(path, 'r') as f:
                return yaml.safe_load(f)
        return {"exclusions": {"directories": [], "files": []}}

    def should_skip(self, path):
        exclusions = self.config.get("exclusions", {})
        dir_exclusions = exclusions.get("directories", [])
        file_exclusions = exclusions.get("files", [])
        
        # Normalize path
        p = Path(path)
        parts = p.parts
        
        # 1. Global Recursive Ignores (Standard infrastructure folders)
        always_ignore = {".git", "node_modules", ".next", "dist", "artifacts", "public", ".agent", "agent_states", ".cursor", "logs", "coverage"}
        if set(parts).intersection(always_ignore):
            return True
            
        # 2. Config Directory Exclusions
        for excl in dir_exclusions:
            if excl in always_ignore:
                continue
                
            # Logic Refactor: Handle both specific paths and generic folder names
            
            # Check A: Path Prefix (e.g., "apps/legacy")
            # Normalize exclusion path to match OS separator
            norm_excl = str(Path(excl))
            if path.startswith(norm_excl) or path.startswith(f"./{norm_excl}"):
                return True
                
            # Check B: exact folder name match (Recursive)
            # Only applies if 'excl' is a simple name (no separators)
            if os.sep not in excl and '/' not in excl:
                if excl in parts:
                    return True
                    
        # 3. File Exclusions
        if p.name in file_exclusions:
            return True
            
        return False

    def scan_project(self):
        print("🚩 Starting Project Audit...")
        
        # Check .gitignore
        self._check_gitignore()
        
        # Scan files
        for root, dirs, files in os.walk("."):
            for file in files:
                full_path = os.path.join(root, file)
                if self.should_skip(full_path):
                    continue
                
                if file.endswith(('.ts', '.tsx', '.py', '.js', '.css')):
                    self._audit_file(full_path)
        
        score = self.calculate_score()
        self._report(score)
        return score

    def _check_gitignore(self):
        if not os.path.exists(".gitignore"):
            self.issues["missing_gitignore_env"] += 1
            return
            
        with open(".gitignore", 'r') as f:
            content = f.read()
            if ".env" not in content:
                self.issues["missing_gitignore_env"] += 1

    def _audit_file(self, path):
        try:
            allowed_patterns = self.config.get("allowed_patterns", [])
            with open(path, 'r', errors='ignore') as f:
                content = f.read()
                
                # Hardcoded tokens
                potential_tokens = re.findall(r'[a-zA-Z0-9]{32,}', content)
                for token in potential_tokens:
                    # Filter out URLs and config files
                    if f"://{token}" in content or f"/{token}" in content:
                        continue
                    
                    # Filter by allowed patterns
                    if any(p in token.lower() for p in allowed_patterns):
                        continue
                        
                    print(f"⚠️ Token found in: {path}") # DEBUG
                    self.issues["hardcoded_token"] += 1
                
                # Console logs
                if path.endswith(('.ts', '.tsx', '.js')):
                    logs = re.findall(r'console\.log\(', content)
                    if logs:
                        print(f"⚠️ Console log found in: {path} ({len(logs)})") # DEBUG
                    self.issues["console_log"] += len(logs)
                    
        except Exception as e:
            print(f"⚠️ Could not audit file {path}: {e}")

    def calculate_score(self):
        score = self.base_score
        for issue_type, count in self.issues.items():
            score -= self.deductions.get(issue_type, 0) * count
        return max(0, score)

    def _report(self, score):
        print(f"\n📊 Audit Report")
        print(f"Score: {score}/100")
        for issue, count in self.issues.items():
            if count > 0:
                print(f"  - {issue}: {count} found")
        
        if score < self.config.get("thresholds", {}).get("critical", 90):
            print("❌ SECURITY GATE FAILED")
        else:
            print("✅ SECURITY GATE PASSED")

if __name__ == "__main__":
    import sys
    engine = HealthEngine()
    score = engine.scan_project()
    
    # Exit code based on thresholds
    min_score = 90
    if len(sys.argv) > 2 and sys.argv[1] == "--min-score":
        min_score = int(sys.argv[2])
        
    if score < min_score:
        sys.exit(1)
    sys.exit(0)
