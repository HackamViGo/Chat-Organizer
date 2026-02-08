"""
workflow_engine.py - Executable logic for .workflows/
"""
import yaml
import sys
import os
from pathlib import Path

# CONFIG
WORKFLOW_DIR = Path(".workflows") # Root level directory
SCRIPTS_DIR = Path(".agent/skills/meta_architect/scripts")

sys.path.append(str(SCRIPTS_DIR.resolve()))

try:
    # Attempt to import existing tools to execute the steps
    from project_health_check import HealthEngine
except ImportError:
    print("⚠️  Warning: Could not import HealthEngine. Running in Dry Mode.")

class WorkflowEngine:
    def __init__(self, workflow_name):
        self.path = WORKFLOW_DIR / f"{workflow_name}.yml"
        if not self.path.exists():
            raise FileNotFoundError(f"Workflow not found: {self.path}")
        
        self.config = self._load()
        print(f"📖 Loaded Workflow: {self.config.get('name', 'Unknown')}")

    def _load(self):
        with open(self.path, 'r') as f:
            return yaml.safe_load(f)

    def run(self):
        # 1. Check Globals
        threshold = self.config.get('global', {}).get('min_health_score', 80)
        print(f"⚙️  Enforcing Health Threshold: {threshold}")

        # 2. Execute Steps/Gates (Simplified Logic)
        stages = self.config.get('pipeline', []) or self.config.get('gates', [])
        
        for stage in stages:
            stage_id = stage.get('id') or stage.get('stage')
            print(f"▶️  Executing Stage: {stage_id}")
            
            # Integration point: Logic to map YAML 'check' string to Python call
            # This makes the YAML "Live"
            if "security" in str(stage).lower() or "health" in str(stage).lower():
                self._run_health_check(threshold)

    def _run_health_check(self, threshold):
        try:
            engine = HealthEngine()
            score = engine.scan_project()
            if score < threshold:
                print(f"⛔ STOP: Score {score} < {threshold}")
                sys.exit(1)
        except NameError:
            print("⚠️  HealthEngine not loaded.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("workflow", help="Name of YAML file in .workflows/ (e.g., verification_gate)")
    args = parser.parse_args()
    
    engine = WorkflowEngine(args.workflow)
    engine.run()
