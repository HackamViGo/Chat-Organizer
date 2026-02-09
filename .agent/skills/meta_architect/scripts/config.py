"""
config.py - Central Configuration Module
Single Source of Truth for Meta-Architect System
"""
import os
from pathlib import Path
from typing import Dict

# ============================================================================
# PROJECT ROOT FINDER
# ============================================================================

def find_project_root() -> Path:
    """
    Find project root by locating .agent directory.
    
    Returns:
        Path to project root
        
    Raises:
        RuntimeError: If project root cannot be found
    """
    current = Path(__file__).resolve().parent
    while current != current.parent:
        if (current / '.agent').exists():
            return current
        current = current.parent
    
    # Fallback to environment variable
    if env_root := os.getenv('BRAINBOX_PROJECT_ROOT'):
        return Path(env_root)
    
    raise RuntimeError(
        "Cannot find project root (.agent directory not found). "
        "Set BRAINBOX_PROJECT_ROOT environment variable."
    )

# ============================================================================
# PATH CONSTANTS
# ============================================================================

PROJECT_ROOT = find_project_root()
AGENT_DIR = PROJECT_ROOT / ".agent"
SKILL_ROOT = AGENT_DIR / "skills" / "meta_architect"
SCRIPTS_DIR = SKILL_ROOT / "scripts"
PROFILES_DIR = SKILL_ROOT / "profiles"
RESOURCES_DIR = SKILL_ROOT / "resources"
CONFIG_DIR = SKILL_ROOT / "config"
STATE_DIR = PROJECT_ROOT / "agent_states"

# Resource Files
TEMPLATE_PATH = RESOURCES_DIR / "sub_agent_template.md"

# Graph paths (Dual Graph Architecture)
GRAPH_PATH = RESOURCES_DIR / "knowledge_graph.json"  # Legacy - kept for backup
EXTERNAL_GRAPH_PATH = RESOURCES_DIR / "external_knowledge.json"  # Context7 cache
PROJECT_GRAPH_PATH = RESOURCES_DIR / "project_knowledge.json"  # Project truth

# Freshness threshold for external knowledge
FRESHNESS_THRESHOLD_DAYS = 15  # Auto-refresh external nodes older than 15 days

AUDIT_CONFIG_PATH = SKILL_ROOT / "audit_config.yml"

# ============================================================================
# DEFAULT THRESHOLDS
# ============================================================================

DEFAULT_HEALTH_THRESHOLD = 80
DEFAULT_MIN_SCORE = 80

# ============================================================================
# ROLE-CATEGORY MAPPING
# ============================================================================

ROLE_CATEGORY_MAP: Dict[str, str] = {
    "frontend_specialist": "Programming Languages & Frameworks",
    "backend_specialist": "Programming Languages & Frameworks",
    "db_architect": "Databases & Data Infrastructure",
    "devops_engineer": "Cloud Platforms & DevOps",
    "ai_integrator": "AI Models & LLM Development",
    "qa_examiner": "Testing & Quality Assurance",
    "docs_librarian": "Documentation & Knowledge Management",
    "extension_builder": "Programming Languages & Frameworks",
    "dashboard_builder": "Programming Languages & Frameworks",
}

# ============================================================================
# VALIDATION
# ============================================================================

def validate_paths() -> bool:
    """
    Validate that critical paths exist.
    
    Returns:
        True if all critical paths exist, False otherwise
    """
    critical_paths = [
        AGENT_DIR,
        SKILL_ROOT,
        SCRIPTS_DIR,
        PROFILES_DIR,
        RESOURCES_DIR,
        GRAPH_PATH,
    ]
    
    for path in critical_paths:
        if not path.exists():
            print(f"⚠️  Missing critical path: {path}")
            return False
    
    return True

if __name__ == "__main__":
    print(f"PROJECT_ROOT: {PROJECT_ROOT}")
    print(f"SKILL_ROOT: {SKILL_ROOT}")
    print(f"GRAPH_PATH: {GRAPH_PATH}")
    print(f"Validation: {'✅ PASS' if validate_paths() else '❌ FAIL'}")
