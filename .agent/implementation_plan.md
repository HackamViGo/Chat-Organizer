# 🎯 Implementation Plan: Agent System Remediation

**Project:** BrainBox - AI Chat Organizer  
**Target:** `.agent` System Refactoring  
**Based On:** [AGENT_SYSTEM_REMEDIATION_PLAN.md](../docs/user/AGENT_SYSTEM_REMEDIATION_PLAN.md)  
**Start Date:** 2026-02-09  
**Estimated Duration:** 10-12 hours  
**Target Health Score:** 90/100

---

## 📊 Executive Summary

### Current State
- **Health Score:** 75/100
- **Critical Issues:** 5
- **Logical Conflicts:** 3
- **Files Affected:** 53

### Target State
- **Health Score:** 90/100
- **Critical Issues:** 0
- **Code Duplication:** Eliminated
- **Test Coverage:** >80%

---

## ✅ Phase 1: Critical Fixes (URGENT)

**Duration:** 1-2 hours  
**Priority:** 🔴 CRITICAL  
**Blocker:** YES - System cannot function reliably without these

### Task 1.1: Fix Path Resolution in `agent_factory.py`

**Status:** ⬜ Not Started  
**Assignee:** Meta-Architect  
**Estimated Time:** 30 minutes

**Files to Modify:**
- [ ] `.agent/skills/meta_architect/scripts/agent_factory.py`

**Implementation Steps:**

1. **Replace hardcoded path calculation**
   ```python
   # Line 26 - BEFORE
   PROJECT_ROOT = SCRIPT_DIR.parents[4]
   
   # Line 26 - AFTER
   def find_project_root() -> Path:
       """Find project root by locating .agent directory."""
       current = Path(__file__).resolve().parent
       while current != current.parent:
           if (current / '.agent').exists():
               return current
           current = current.parent
       raise RuntimeError("Cannot find project root (.agent directory not found)")
   
   PROJECT_ROOT = find_project_root()
   ```

2. **Add environment variable fallback**
   ```python
   import os
   
   PROJECT_ROOT = Path(os.getenv('BRAINBOX_PROJECT_ROOT', find_project_root()))
   ```

3. **Update dependent paths**
   ```python
   SKILL_ROOT = PROJECT_ROOT / ".agent" / "skills" / "meta_architect"
   PROFILES_DIR = SKILL_ROOT / "profiles"
   TEMPLATE_PATH = SKILL_ROOT / "resources" / "sub_agent_template.md"
   GRAPH_PATH = SKILL_ROOT / "resources" / "knowledge_graph.json"
   STATE_DIR = PROJECT_ROOT / "agent_states"
   ```

**Validation:**
```bash
# Test from project root
cd /home/stefanov/Projects/Chat\ Organizer\ Cursor
python .agent/skills/meta_architect/scripts/agent_factory.py --help

# Test from scripts directory
cd .agent/skills/meta_architect/scripts
python agent_factory.py --help

# Test from /tmp
cd /tmp
python /home/stefanov/Projects/Chat\ Organizer\ Cursor/.agent/skills/meta_architect/scripts/agent_factory.py --help
```

**Success Criteria:**
- ✅ Script runs from any directory
- ✅ No `FileNotFoundError` for profiles/templates
- ✅ `STATE_DIR` resolves correctly

**Rollback Plan:**
```bash
git checkout .agent/skills/meta_architect/scripts/agent_factory.py
```

---

### Task 1.2: Unify Health Score Thresholds

**Status:** ⬜ Not Started  
**Assignee:** Meta-Architect  
**Estimated Time:** 20 minutes

**Files to Modify:**
- [ ] `.agent/skills/meta_architect/audit_config.yml`
- [ ] `.agent/skills/meta_architect/scripts/project_health_check.py`

**Implementation Steps:**

1. **Update `audit_config.yml`**
   ```yaml
   # Line 8 - BEFORE
   thresholds:
     critical: 70
   
   # Line 8 - AFTER
   thresholds:
     critical: 80
     warning: 85
     good: 90
     excellent: 95
   ```

2. **Update `project_health_check.py`**
   ```python
   # Line 13 - Add config loading
   with open(CONFIG_PATH, 'r') as f:
       config = yaml.safe_load(f)
   
   DEFAULT_MIN_SCORE = config['thresholds']['critical']  # 80
   
   # Line 180 - Use config value
   min_score = float(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_MIN_SCORE
   ```

**Validation:**
```bash
# Verify threshold is 80
python .agent/skills/meta_architect/scripts/project_health_check.py
# Should use 80 as default

# Test with custom threshold
python .agent/skills/meta_architect/scripts/project_health_check.py --min-score 85
```

**Success Criteria:**
- ✅ All configs use threshold 80
- ✅ `project_health_check.py` reads from `audit_config.yml`
- ✅ No hardcoded thresholds remain

---

### Task 1.3: Fix Import Fallback Logic

**Status:** ⬜ Not Started  
**Assignee:** Meta-Architect  
**Estimated Time:** 15 minutes

**Files to Modify:**
- [ ] `.agent/skills/meta_architect/scripts/agent_factory.py`
- [ ] `.agent/skills/meta_architect/scripts/knowledge_injector.py`

**Implementation Steps:**

1. **Replace try/except with sys.path manipulation**
   ```python
   # Lines 16-22 - BEFORE
   try:
       from graph_query import GraphQuery
       from state_manager import StateManager, TaskStatus
   except ImportError:
       from meta_architect.scripts.graph_query import GraphQuery
       from meta_architect.scripts.state_manager import StateManager, TaskStatus
   
   # Lines 16-22 - AFTER
   import sys
   from pathlib import Path
   
   SCRIPT_DIR = Path(__file__).resolve().parent
   if str(SCRIPT_DIR) not in sys.path:
       sys.path.insert(0, str(SCRIPT_DIR))
   
   from graph_query import GraphQuery
   from state_manager import StateManager, TaskStatus
   ```

2. **Apply same fix to `knowledge_injector.py`**

**Validation:**
```bash
# Test imports
cd .agent/skills/meta_architect/scripts
python -c "from agent_factory import generate_system_prompt; print('✅ Import OK')"
python -c "from knowledge_injector import KnowledgeInjector; print('✅ Import OK')"
```

**Success Criteria:**
- ✅ No ImportError from any directory
- ✅ Cleaner code without fallback logic

---

### Phase 1 Checkpoint

**Command:**
```bash
pnpm verify
```

**Expected Output:**
- Health Score: ≥ 80
- No critical path resolution errors
- All imports working

**If Failed:**
- Review error logs
- Rollback problematic changes
- Re-test individually

---

## ✅ Phase 2: Centralization (HIGH)

**Duration:** 2-3 hours  
**Priority:** 🟡 HIGH  
**Blocker:** NO - But significantly improves maintainability

### Task 2.1: Create Central Configuration Module

**Status:** ⬜ Not Started  
**Assignee:** Meta-Architect  
**Estimated Time:** 1 hour

**Files to Create:**
- [ ] `.agent/skills/meta_architect/config.py`

**Files to Modify:**
- [ ] `.agent/skills/meta_architect/scripts/agent_factory.py`
- [ ] `.agent/skills/meta_architect/scripts/graph_query.py`
- [ ] `.agent/skills/meta_architect/scripts/knowledge_injector.py`
- [ ] `.agent/skills/meta_architect/scripts/project_planner.py`
- [ ] `.agent/skills/meta_architect/scripts/project_health_check.py`

**Implementation Steps:**

1. **Create `config.py`**
   ```python
   """Central configuration for Meta-Architect skill."""
   from pathlib import Path
   import os
   import yaml
   
   # === PATH RESOLUTION ===
   def find_project_root() -> Path:
       current = Path(__file__).resolve().parent
       while current != current.parent:
           if (current / '.agent').exists():
               return current
           current = current.parent
       if env_root := os.getenv('BRAINBOX_PROJECT_ROOT'):
           return Path(env_root)
       raise RuntimeError("Cannot find project root")
   
   # === CORE PATHS ===
   SKILL_ROOT = Path(__file__).parent
   PROJECT_ROOT = find_project_root()
   
   GRAPH_PATH = SKILL_ROOT / "resources" / "knowledge_graph.json"
   TEMPLATE_PATH = SKILL_ROOT / "resources" / "sub_agent_template.md"
   AUDIT_CONFIG = SKILL_ROOT / "audit_config.yml"
   
   PROFILES_DIR = SKILL_ROOT / "profiles"
   STATE_DIR = PROJECT_ROOT / "agent_states"
   CONTEXT_DIR = PROJECT_ROOT / "context_packages"
   LOGS_DIR = PROJECT_ROOT / "logs"
   
   # === CONSTANTS ===
   ROLE_CATEGORY_MAP = {
       "frontend_specialist": "Programming Languages & Frameworks",
       "backend_specialist": "Programming Languages & Frameworks",
       "db_architect": "Database Systems",
       "qa_examiner": "Testing & Quality Assurance",
       "qa_engineer": "Testing & Quality Assurance",
       "devops_engineer": "DevOps & Infrastructure",
       "docs_librarian": "Documentation & Technical Writing",
       "graph_guardian": "AI Models & LLM Development",
       "ai_integrator": "AI Models & LLM Development",
       "extension_builder": "Browser Extensions & Web APIs",
       "dashboard_builder": "Web Development & Frameworks",
       "ui_specialist": "UI/UX Design & Accessibility",
   }
   
   # === VALIDATION ===
   def validate_paths() -> bool:
       critical = [GRAPH_PATH, TEMPLATE_PATH, AUDIT_CONFIG, PROFILES_DIR]
       missing = [p for p in critical if not p.exists()]
       if missing:
           raise FileNotFoundError(f"Missing: {', '.join(str(p) for p in missing)}")
       return True
   
   def ensure_directories() -> None:
       for d in [STATE_DIR, CONTEXT_DIR, LOGS_DIR]:
           d.mkdir(parents=True, exist_ok=True)
           (d / ".gitkeep").touch(exist_ok=True)
   
   # Auto-initialize
   validate_paths()
   ensure_directories()
   ```

2. **Migrate `agent_factory.py`**
   ```python
   # Add at top
   from config import (
       PROJECT_ROOT, PROFILES_DIR, TEMPLATE_PATH,
       GRAPH_PATH, STATE_DIR, ROLE_CATEGORY_MAP
   )
   
   # Remove lines 26-32 (old path definitions)
   ```

3. **Migrate `graph_query.py`**
   ```python
   # Remove ROLE_CATEGORY_MAP definition (lines 173-180)
   # Add import
   from config import ROLE_CATEGORY_MAP
   ```

4. **Migrate other scripts similarly**

**Validation:**
```bash
# Test config import
cd .agent/skills/meta_architect
python -c "from config import validate_paths; validate_paths(); print('✅ Config OK')"

# Test all scripts still work
python scripts/agent_factory.py --help
python scripts/project_health_check.py --min-score 80
```

**Success Criteria:**
- ✅ Single source of truth for paths
- ✅ No hardcoded paths in scripts
- ✅ All scripts import from `config`

---

### Task 2.2: Unify State Management

**Status:** ⬜ Not Started  
**Assignee:** Meta-Architect  
**Estimated Time:** 45 minutes

**Files to Modify:**
- [ ] `.agent/skills/meta_architect/scripts/state_manager.py`
- [ ] `.agent/skills/meta_architect/scripts/project_planner.py`

**Implementation Steps:**

1. **Extend `StateManager` in `state_manager.py`**
   ```python
   # Add new method after line 110
   def create_state_by_role(
       self,
       role: str,
       mission_id: str,
       capabilities: List[str],
       knowledge_context: str
   ) -> Path:
       """Create state using role as filename (backward compatibility)."""
       agent_id = f"{role}_{mission_id[:8]}"
       state = AgentState(
           agent_id=agent_id,
           role=AgentRole[role.upper()] if hasattr(AgentRole, role.upper()) else AgentRole.BUILDER,
           status=TaskStatus.IDLE,
           capabilities=capabilities,
           knowledge_context=knowledge_context,
           created_at=datetime.now(),
           updated_at=datetime.now()
       )
       
       filepath = self.state_dir / f"{role}.yml"
       temp_path = filepath.with_suffix('.tmp')
       
       with open(temp_path, 'w', encoding='utf-8') as f:
           yaml.dump(asdict(state), f, default_flow_style=False, allow_unicode=True)
       
       temp_path.rename(filepath)
       return filepath
   ```

2. **Remove `AgentStateManager` from `project_planner.py`**
   ```python
   # Delete lines 496-531 (entire AgentStateManager class)
   
   # Replace usage at line 697
   from state_manager import StateManager
   
   state_mgr = StateManager(state_dir=Path("agent_states"))
   state_mgr.create_state_by_role(
       role=role,
       mission_id=mission_id,
       capabilities=capabilities,
       knowledge_context=context
   )
   ```

**Validation:**
```bash
# Test state creation
python -c "
from state_manager import StateManager
from pathlib import Path

mgr = StateManager(Path('test_states'))
mgr.create_state_by_role('extension_builder', 'test123', ['chrome'], 'context')
print('✅ State created')
"

cat test_states/extension_builder.yml
rm -rf test_states
```

**Success Criteria:**
- ✅ Single `StateManager` class
- ✅ Atomic writes for all state operations
- ✅ Backward compatible with role-based filenames

---

### Task 2.3: Remove Duplicate Content

**Status:** ⬜ Not Started  
**Assignee:** Meta-Architect  
**Estimated Time:** 15 minutes

**Files to Modify:**
- [ ] `.agent/workflows/main.md`

**Implementation Steps:**

1. **Replace content with reference**
   ```markdown
   ---
   description: Main orchestration
   ---
   
   # Main Orchestration Pipeline
   
   **Source of Truth:** `.agent/skills/meta_architect/config/workflows/main_orchestration.yml`
   
   This workflow delegates to the Meta-Architect skill's orchestration pipeline.
   
   ## Usage
   
   ```bash
   python .agent/skills/meta_architect/scripts/project_planner.py
   ```
   
   ## Pipeline Stages
   
   See [main_orchestration.yml](../skills/meta_architect/config/workflows/main_orchestration.yml) for full details.
   ```

**Success Criteria:**
- ✅ No duplicate pipeline definitions
- ✅ Clear reference to source of truth

---

### Task 2.4: Remove Duplicate ROLE_CATEGORY_MAP

**Status:** ⬜ Not Started  
**Assignee:** Meta-Architect  
**Estimated Time:** 10 minutes

**Files to Modify:**
- [ ] `.agent/skills/meta_architect/scripts/graph_query.py`
- [ ] `.agent/skills/meta_architect/scripts/project_planner.py`

**Implementation Steps:**

1. **Already done in Task 2.1** (moved to `config.py`)
2. **Verify no duplicates remain**
   ```bash
   grep -n "ROLE_CATEGORY_MAP = {" .agent/skills/meta_architect/scripts/*.py
   # Should only show config.py
   ```

**Success Criteria:**
- ✅ Single definition in `config.py`
- ✅ All scripts import from `config`

---

### Phase 2 Checkpoint

**Command:**
```bash
# Run integration tests
cd .agent/skills/meta_architect
python scripts/agent_factory.py --help
python scripts/project_planner.py --dry-run
python scripts/project_health_check.py --min-score 80
```

**Expected Output:**
- All scripts execute without errors
- No import errors
- No path resolution errors

---

## ✅ Phase 3: Improvements (MEDIUM)

**Duration:** 2-3 hours  
**Priority:** 🟢 MEDIUM  
**Blocker:** NO - Quality of life improvements

### Task 3.1: Add Fallback for knowledge_graph.json

**Status:** ⬜ Not Started  
**Assignee:** Meta-Architect  
**Estimated Time:** 30 minutes

**Files to Modify:**
- [ ] `.agent/skills/meta_architect/scripts/graph_query.py`

**Implementation Steps:**

1. **Add partial mode support**
   ```python
   def __init__(self, graph_path: str):
       self.graph_path = Path(graph_path)
       self._partial_mode = False
       self._load_graph()
   
   def _load_graph(self) -> None:
       if not self.graph_path.exists():
           logger.warning(
               f"Graph not found at {self.graph_path}. "
               "Running in PARTIAL MODE with empty graph."
           )
           self.nodes = []
           self._partial_mode = True
           return
       
       with open(self.graph_path, 'r', encoding='utf-8') as f:
           data = json.load(f)
           self.nodes = [GraphNode(**node) for node in data.get('nodes', [])]
           self._partial_mode = False
   
   def query_by_category(self, category: str, priority: int = None) -> List[GraphNode]:
       if self._partial_mode:
           logger.warning("Partial mode - returning empty results")
           return []
       # ... existing logic
   ```

2. **Create backup graph**
   ```bash
   cp .agent/skills/meta_architect/resources/knowledge_graph.json \
      .agent/skills/meta_architect/resources/knowledge_graph.backup.json
   ```

**Success Criteria:**
- ✅ System doesn't crash if graph is missing
- ✅ Warning logged in partial mode
- ✅ Backup graph available

---

### Task 3.2: Create Missing Directories

**Status:** ⬜ Not Started  
**Assignee:** Meta-Architect  
**Estimated Time:** 15 minutes

**Files to Create:**
- [ ] `agent_states/.gitkeep`
- [ ] `context_packages/.gitkeep`
- [ ] `logs/.gitkeep`
- [ ] `agent_states/.gitignore`
- [ ] `context_packages/.gitignore`
- [ ] `logs/.gitignore`

**Implementation Steps:**

1. **Already done in Task 2.1** (`config.py` creates directories)

2. **Create .gitignore files**
   ```bash
   # agent_states/.gitignore
   echo "*.yml
   !.gitkeep" > agent_states/.gitignore
   
   # context_packages/.gitignore
   echo "*.md
   !.gitkeep" > context_packages/.gitignore
   
   # logs/.gitignore
   echo "*.log
   !.gitkeep" > logs/.gitignore
   ```

**Success Criteria:**
- ✅ Directories exist
- ✅ .gitkeep files tracked
- ✅ Generated files ignored

---

### Task 3.3: Add Docstrings

**Status:** ⬜ Not Started  
**Assignee:** Meta-Architect  
**Estimated Time:** 2 hours

**Files to Modify:**
- [ ] `.agent/skills/meta_architect/scripts/agent_factory.py`
- [ ] `.agent/skills/meta_architect/scripts/graph_query.py`
- [ ] `.agent/skills/meta_architect/scripts/state_manager.py`
- [ ] `.agent/skills/meta_architect/scripts/knowledge_injector.py`
- [ ] `.agent/skills/meta_architect/scripts/project_planner.py`

**Implementation Steps:**

1. **Add Google-style docstrings to all public functions**
2. **Include Args, Returns, Raises, Example sections**
3. **Add module-level docstrings**

**Example:**
```python
def generate_system_prompt(
    role: str,
    mission_id: str,
    task_description: str,
    context_package: str
) -> str:
    """
    Generate system prompt for a sub-agent from template.
    
    Args:
        role: Agent role identifier (e.g., 'extension_builder')
        mission_id: Unique mission identifier (UUID format)
        task_description: Detailed task description
        context_package: Pre-generated knowledge context (Markdown)
    
    Returns:
        Complete system prompt ready for LLM injection
    
    Raises:
        FileNotFoundError: If template or profile files are missing
        ValueError: If role is not recognized
    
    Example:
        >>> prompt = generate_system_prompt(
        ...     role='extension_builder',
        ...     mission_id='abc123',
        ...     task_description='Fix CORS issue',
        ...     context_package='# Chrome APIs\\n...'
        ... )
    """
```

**Success Criteria:**
- ✅ All public functions documented
- ✅ Consistent style (Google format)
- ✅ Examples where applicable

---

## ✅ Phase 4: Cleanup (LOW)

**Duration:** 1 hour  
**Priority:** 🔵 LOW  
**Blocker:** NO - Organizational tasks

### Task 4.1: Remove/Implement Missing Scripts

**Status:** ⬜ Not Started  
**Assignee:** Meta-Architect  
**Estimated Time:** 30 minutes

**Files to Check:**
- [ ] `.agent/skills/meta_architect/scripts/agent_hooks.py`
- [ ] `.agent/skills/meta_architect/scripts/infra_validator.py`

**Implementation Steps:**

1. **Check usage**
   ```bash
   grep -r "agent_hooks\|infra_validator" .agent/
   ```

2. **If unused - delete**
   ```bash
   rm .agent/skills/meta_architect/scripts/agent_hooks.py
   rm .agent/skills/meta_architect/scripts/infra_validator.py
   ```

3. **If used - implement or document**

**Success Criteria:**
- ✅ No unused stub files
- ✅ All scripts have purpose

---

### Task 4.2: Document Unused Workflows

**Status:** ⬜ Not Started  
**Assignee:** Meta-Architect  
**Estimated Time:** 10 minutes

**Files to Create:**
- [ ] `.agent/skills/meta_architect/config/workflows/README.md`

**Implementation Steps:**

1. **Create README**
   ```markdown
   # Workflow Configurations
   
   ## Active
   - **main_orchestration.yml** - Primary pipeline
   
   ## Inactive/Deprecated
   - escalation_handler.yml
   - escalation_recovery.yml
   - knowledge_injection.yml
   - verification_gate.yml
   
   TODO: Document or remove inactive workflows
   ```

**Success Criteria:**
- ✅ Clear documentation of workflow status

---

## ✅ Phase 5: Testing

**Duration:** 2-3 hours  
**Priority:** 🟢 MEDIUM  
**Blocker:** NO - But critical for validation

### Task 5.1: Write Unit Tests

**Status:** ⬜ Not Started  
**Assignee:** Meta-Architect  
**Estimated Time:** 1 hour

**Files to Create:**
- [ ] `.agent/skills/meta_architect/tests/test_graph_query.py`
- [ ] `.agent/skills/meta_architect/tests/test_state_manager.py`
- [ ] `.agent/skills/meta_architect/tests/test_config.py`

**Implementation Steps:**

1. **Install pytest**
   ```bash
   pip install pytest pytest-cov
   ```

2. **Create test files** (see remediation plan for examples)

3. **Run tests**
   ```bash
   cd .agent/skills/meta_architect
   pytest tests/ -v
   ```

**Success Criteria:**
- ✅ All tests pass
- ✅ Coverage > 70%

---

### Task 5.2: Write Integration Tests

**Status:** ⬜ Not Started  
**Assignee:** Meta-Architect  
**Estimated Time:** 1 hour

**Files to Create:**
- [ ] `.agent/skills/meta_architect/tests/test_integration.py`
- [ ] `.agent/skills/meta_architect/tests/test_path_resolution.py`

**Success Criteria:**
- ✅ End-to-end pipeline works
- ✅ Path resolution works from any directory

---

### Task 5.3: Final Verification

**Status:** ⬜ Not Started  
**Assignee:** Meta-Architect  
**Estimated Time:** 30 minutes

**Commands:**
```bash
# Health check
pnpm verify

# Run all tests
cd .agent/skills/meta_architect
pytest tests/ -v --cov=scripts --cov-report=html

# Manual smoke tests
python scripts/agent_factory.py --help
python scripts/project_health_check.py --min-score 80
python scripts/project_planner.py --dry-run
```

**Success Criteria:**
- ✅ Health Score ≥ 90
- ✅ All tests pass
- ✅ No regressions

---

## 📊 Progress Tracking

### Overall Progress: 0/25 Tasks (0%)

#### Phase 1: Critical Fixes
- [ ] Task 1.1: Path Resolution (0%)
- [ ] Task 1.2: Health Thresholds (0%)
- [ ] Task 1.3: Import Fallback (0%)

#### Phase 2: Centralization
- [ ] Task 2.1: Central Config (0%)
- [ ] Task 2.2: Unify State Management (0%)
- [ ] Task 2.3: Remove Duplicates (0%)
- [ ] Task 2.4: Remove ROLE_CATEGORY_MAP Duplicate (0%)

#### Phase 3: Improvements
- [ ] Task 3.1: Graph Fallback (0%)
- [ ] Task 3.2: Create Directories (0%)
- [ ] Task 3.3: Add Docstrings (0%)

#### Phase 4: Cleanup
- [ ] Task 4.1: Remove Stubs (0%)
- [ ] Task 4.2: Document Workflows (0%)

#### Phase 5: Testing
- [ ] Task 5.1: Unit Tests (0%)
- [ ] Task 5.2: Integration Tests (0%)
- [ ] Task 5.3: Final Verification (0%)

---

## 🚨 Risk Management

### High Risk Items
1. **Path Resolution Changes** - Could break existing workflows
   - Mitigation: Test from multiple directories
   - Rollback: Git checkout

2. **State Management Refactor** - Could corrupt state files
   - Mitigation: Backup agent_states/ before changes
   - Rollback: Restore from backup

3. **Import Changes** - Could cause ImportError
   - Mitigation: Test imports before committing
   - Rollback: Git checkout

### Rollback Strategy
```bash
# Backup before starting
tar -czf agent_backup_$(date +%Y%m%d_%H%M%S).tar.gz .agent/

# Rollback if needed
tar -xzf agent_backup_YYYYMMDD_HHMMSS.tar.gz
```

---

## 📝 Commit Strategy

### Commit Messages Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Example Commits

**Phase 1:**
```
fix(agent-factory): robust path resolution

- Replace hardcoded parents[4] with dynamic root finding
- Add environment variable fallback
- Test from multiple execution contexts

Fixes: Path resolution errors when running from different directories
```

**Phase 2:**
```
refactor(config): centralize configuration

- Create config.py with all paths and constants
- Migrate all scripts to use central config
- Remove duplicate ROLE_CATEGORY_MAP definitions

Improves: Maintainability, reduces code duplication
```

**Phase 5:**
```
test(meta-architect): add comprehensive test suite

- Add unit tests for graph_query, state_manager, config
- Add integration tests for full pipeline
- Add path resolution tests

Coverage: 82%
```

---

## ✅ Definition of Done

### For Each Task
- [ ] Code implemented and tested
- [ ] No linting errors
- [ ] Docstrings added (if applicable)
- [ ] Tests written (if applicable)
- [ ] Committed with clear message

### For Each Phase
- [ ] All tasks completed
- [ ] Checkpoint tests pass
- [ ] No regressions
- [ ] Documentation updated

### For Overall Project
- [ ] Health Score ≥ 90
- [ ] All critical issues resolved
- [ ] Test coverage > 80%
- [ ] Documentation complete
- [ ] Final commit and tag

---

## 🎯 Success Metrics

### Before Remediation
- Health Score: 75/100
- Security: 85
- Maintainability: 70
- Reliability: 65
- Documentation: 80

### After Remediation (Target)
- Health Score: 90/100
- Security: 90 (+5)
- Maintainability: 90 (+20)
- Reliability: 88 (+23)
- Documentation: 92 (+12)

### Key Improvements
1. ✅ Zero hardcoded paths
2. ✅ Single source of truth for config
3. ✅ Robust path resolution
4. ✅ Unified state management
5. ✅ Comprehensive test coverage
6. ✅ Complete documentation

---

## 📅 Timeline

| Phase | Duration | Start | End | Status |
|-------|----------|-------|-----|--------|
| Phase 1 | 1-2h | TBD | TBD | ⬜ Not Started |
| Phase 2 | 2-3h | TBD | TBD | ⬜ Not Started |
| Phase 3 | 2-3h | TBD | TBD | ⬜ Not Started |
| Phase 4 | 1h | TBD | TBD | ⬜ Not Started |
| Phase 5 | 2-3h | TBD | TBD | ⬜ Not Started |
| **Total** | **10-12h** | **TBD** | **TBD** | **0%** |

---

## 🚀 Next Steps

1. **Review this plan** - Confirm approach and priorities
2. **Create backup** - `tar -czf agent_backup.tar.gz .agent/`
3. **Start Phase 1** - Begin with critical fixes
4. **Track progress** - Update checkboxes as you go
5. **Commit frequently** - After each task completion
6. **Run checkpoints** - After each phase
7. **Final verification** - Run full test suite
8. **Update audit** - Reflect changes in AGENT_SYSTEM_AUDIT.md

**Ready to begin? 🎯**
