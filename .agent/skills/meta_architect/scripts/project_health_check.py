"""
Project Guardian Engine v3.5 - UNCOMPROMISING PRODUCTION AUDITOR
Deterministic security, manifest hardening & secret leak scanner.
"""

import os
import re
import json
import sys
from pathlib import Path

class HealthEngine:
    def __init__(self):
        self.base_score = 100
        # Тежки наказания за сигурност
        self.weights = {
            "manifest_localhost": 40,      # localhost в host_permissions/CSP
            "manifest_dynamic_url": 20,    # Липса на use_dynamic_url (Fingerprinting)
            "hardcoded_secret": 50,       # API Keys, Sk-..., Sbp-...
            "build_placeholder": 30,      # Забравени __DASHBOARD_URL__ или TODO
            "console_log": 5              # Debug остатъци
        }
        
        self.issues = {k: 0 for k in self.weights.keys()}
        self.details = []

    def audit_manifest(self, path):
        """Проверява дали манифестът е 'втвърден' за продукция."""
        if not os.path.exists(path): return
        is_dist = "dist" in str(path)
        
        try:
            with open(path, 'r') as f:
                m = json.load(f)

            # 1. Localhost Check (Само за DIST)
            if is_dist:
                hps = str(m.get('host_permissions', []))
                csp = str(m.get('content_security_policy', {}))
                if 'localhost' in hps or '127.0.0.1' in hps or 'localhost' in csp:
                    self.issues["manifest_localhost"] += 1
                    self.details.append(f"❌ CRITICAL: Localhost leaked in DIST Manifest: {path}")

            # 2. Dynamic URL Check (Задължително)
            war = m.get('web_accessible_resources', [])
            for i, res in enumerate(war):
                if not res.get('use_dynamic_url'):
                    self.issues["manifest_dynamic_url"] += 1
                    self.details.append(f"⚠️ SECURITY: Block #{i+1} in {path} missing use_dynamic_url: true")
        except Exception as e:
            self.details.append(f"❌ Manifest Error {path}: {e}")

    def audit_code(self, path):
        """Търси секрети и хардкоднати данни."""
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                
                # Secret Leak Detection (sk-..., sbp_...)
                if re.search(r'(sk-[a-zA-Z0-9]{32,}|sbp_[a-zA-Z0-9]{40,})', content):
                    self.issues["hardcoded_secret"] += 1
                    self.details.append(f"❌ EXPOSURE: Potential API Key in {path}")

                # Placeholder Leak (Само в DIST)
                if "dist" in str(path) and re.search(r'(__[A-Z_]+__|TODO|FIXME)', content):
                    self.issues["build_placeholder"] += 1
                    self.details.append(f"❌ BUILD ERROR: Unresolved placeholder/TODO in {path}")

                # Console Logs (Изключваме коментари)
                logs = re.findall(r'^(?!\s*//).*console\.log', content, re.MULTILINE)
                if logs:
                    self.issues["console_log"] += len(logs)
                    self.details.append(f"⚠️ CLEANUP: console.log in {path}")
        except: pass

    def scan(self):
        # Сканираме манимфестите
        self.audit_manifest('apps/extension/manifest.json')
        self.audit_manifest('apps/extension/dist/manifest.json')

        # Сканираме сорса и билда
        for root, _, files in os.walk('.'):
            if any(d in root for d in ['node_modules', '.git', 'tests']): continue
            for file in files:
                if file.endswith(('.ts', '.js', '.json')) and file != 'package.json':
                    self.audit_code(os.path.join(root, file))

        score = self.base_score
        for key, count in self.issues.items():
            score -= self.weights[key] * count
        
        return max(0, score)

    def report(self, score):
        print(f"\n{'='*60}\n🛡️  BRAINBOX PRODUCTION GUARDIAN REPORT\n{'='*60}")
        print(f"FINAL SECURITY SCORE: {score}/100")
        
        for d in self.details: print(f"  {d}")
        
        if score < 80:
            print(f"\n❌ STATUS: REJECTED (Score {score} < 80)")
            sys.exit(1)
        print("\n✅ STATUS: PASSED (Secure for Shipping)")
        sys.exit(0)

if __name__ == "__main__":
    engine = HealthEngine()
    engine.report(engine.scan())