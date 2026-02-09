# 🔧 План за Ремедиация на `.agent` Система

**Базиран на:** [AGENT_SYSTEM_AUDIT.md](./AGENT_SYSTEM_AUDIT.md)  
**Дата:** 2026-02-09  
**Приоритизация:** URGENT → HIGH → MEDIUM → LOW

---

## 📋 Съдържание

1. [Критични Проблеми (URGENT)](#1-критични-проблеми-urgent)
2. [Високо Приоритетни (HIGH)](#2-високо-приоритетни-high)
3. [Средно Приоритетни (MEDIUM)](#3-средно-приоритетни-medium)
4. [Ниско Приоритетни (LOW)](#4-ниско-приоритетни-low)
5. [Тестова Стратегия](#5-тестова-стратегия)
6. [Времева Линия](#6-времева-линия)

---

## 1. Критични Проблеми (URGENT)

### 🔴 Task 1.1: Фиксирай Path Resolution в `agent_factory.py`

**Проблем:**
```python
# Текущ код (ред 26)
PROJECT_ROOT = SCRIPT_DIR.parents[4]  # Крехко!
```

**Решение:**
```python
# Нов подход
import os
from pathlib import Path

# Метод 1: Динамично търсене на .agent директория
def find_project_root() -> Path:
    """Find project root by locating .agent directory."""
    current = Path(__file__).resolve().parent
    while current != current.parent:
        if (current / '.agent').exists():
            return current
        current = current.parent
    raise RuntimeError("Cannot find project root (.agent directory not found)")

PROJECT_ROOT = find_project_root()

# Метод 2: Използвай environment variable като fallback
PROJECT_ROOT = Path(os.getenv('BRAINBOX_PROJECT_ROOT', Path.cwd()))
```

**Файлове за промяна:**
- `.agent/skills/meta_architect/scripts/agent_factory.py` (ред 26-32)

**Тестване:**
```bash
# Тествай от различни директории
cd /home/stefanov/Projects/Chat\ Organizer\ Cursor
python .agent/skills/meta_architect/scripts/agent_factory.py --test

cd .agent/skills/meta_architect/scripts
python agent_factory.py --test

cd /tmp
python /home/stefanov/Projects/Chat\ Organizer\ Cursor/.agent/skills/meta_architect/scripts/agent_factory.py --test
```

**Очакван Резултат:**
- ✅ Скриптът работи от всяка директория
- ✅ `STATE_DIR`, `PROFILES_DIR` се резолват коректно
- ✅ Няма `FileNotFoundError`

**Време:** 30 минути  
**Риск:** 🔴 CRITICAL - системата не работи без това

---

### 🔴 Task 1.2: Унифицирай Health Score Thresholds

**Проблем:**
- `audit_config.yml`: `thresholds.critical: 70`
- `project_health_check.py`: `min_score = 80`
- `main_orchestration.yml`: `min_health_score: 80`
- `SKILL.md`: `Health Score < 80`

**Решение:**

**Стъпка 1:** Актуализирай `audit_config.yml`
```yaml
thresholds:
  critical: 80      # Унифициран праг
  warning: 85
  good: 90
  excellent: 95
```

**Стъпка 2:** Актуализирай `project_health_check.py`
```python
# Ред 13 - Зареди от config
config = yaml.safe_load(open(CONFIG_PATH))
DEFAULT_MIN_SCORE = config['thresholds']['critical']  # 80

# Ред 180 - Използвай от config
min_score = float(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_MIN_SCORE
```

**Стъпка 3:** Актуализирай документацията
- `SKILL.md` (ред 52): Потвърди `Health Score < 80`
- `main_orchestration.yml` (ред 5): Запази `min_health_score: 80`

**Файлове за промяна:**
1. `.agent/skills/meta_architect/audit_config.yml` (ред 8)
2. `.agent/skills/meta_architect/scripts/project_health_check.py` (ред 13, 180)
3. `.agent/skills/meta_architect/SKILL.md` (ред 52)

**Валидация:**
```bash
# Тествай дали всички използват еднакъв праг
grep -r "critical.*70\|min_score.*80" .agent/
# Очакван резултат: Само 80 навсякъде
```

**Време:** 20 минути  
**Риск:** 🟡 MEDIUM - може да доведе до unexpected failures

---

### 🔴 Task 1.3: Фиксирай Import Fallback Логика

**Проблем:**
```python
# agent_factory.py (ред 16-22)
try:
    from graph_query import GraphQuery
except ImportError:
    # Този fallback НИКОГА няма да работи!
    from meta_architect.scripts.graph_query import GraphQuery
```

**Решение:**
```python
# Премахни fallback, добави sys.path manipulation
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

# Сега импортът винаги ще работи
from graph_query import GraphQuery
from state_manager import StateManager, TaskStatus
```

**Файлове за промяна:**
- `.agent/skills/meta_architect/scripts/agent_factory.py` (ред 16-22)
- `.agent/skills/meta_architect/scripts/knowledge_injector.py` (ред 13)
- `.agent/skills/meta_architect/scripts/project_planner.py` (ако има подобна логика)

**Тестване:**
```bash
# Тествай импортите
cd .agent/skills/meta_architect/scripts
python -c "from agent_factory import generate_system_prompt; print('OK')"
```

**Време:** 15 минути  
**Риск:** 🟡 MEDIUM - ImportError при неправилен execution context

---

## 2. Високо Приоритетни (HIGH)

### 🟡 Task 2.1: Централизирай Конфигурацията

**Цел:** Създай единен `config.py` модул за всички пътища и константи.

**Имплементация:**

**Файл:** `.agent/skills/meta_architect/config.py` (НОВ)
```python
"""
Central configuration for Meta-Architect skill.
All paths and constants should be imported from here.
"""
from pathlib import Path
import os

# === PATH RESOLUTION ===
def find_project_root() -> Path:
    """Find project root by locating .agent directory."""
    current = Path(__file__).resolve().parent
    while current != current.parent:
        if (current / '.agent').exists():
            return current
        current = current.parent
    
    # Fallback to environment variable
    if env_root := os.getenv('BRAINBOX_PROJECT_ROOT'):
        return Path(env_root)
    
    raise RuntimeError(
        "Cannot find project root. Ensure .agent/ exists or set BRAINBOX_PROJECT_ROOT"
    )

# === CORE PATHS ===
SKILL_ROOT = Path(__file__).parent
PROJECT_ROOT = find_project_root()

# Resources
GRAPH_PATH = SKILL_ROOT / "resources" / "knowledge_graph.json"
TEMPLATE_PATH = SKILL_ROOT / "resources" / "sub_agent_template.md"
ESCALATION_POLICY = SKILL_ROOT / "resources" / "escalation_policy.yml"

# Configuration
AUDIT_CONFIG = SKILL_ROOT / "audit_config.yml"
MAIN_ORCHESTRATION = SKILL_ROOT / "config" / "workflows" / "main_orchestration.yml"

# Directories
PROFILES_DIR = SKILL_ROOT / "profiles"
SCRIPTS_DIR = SKILL_ROOT / "scripts"
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

# === HEALTH THRESHOLDS ===
# Loaded from audit_config.yml at runtime
DEFAULT_HEALTH_THRESHOLD = 80

# === VALIDATION ===
def validate_paths() -> bool:
    """Validate that all critical paths exist."""
    critical_paths = [GRAPH_PATH, TEMPLATE_PATH, AUDIT_CONFIG, PROFILES_DIR]
    missing = [p for p in critical_paths if not p.exists()]
    
    if missing:
        raise FileNotFoundError(
            f"Critical paths missing: {', '.join(str(p) for p in missing)}"
        )
    
    return True

# Auto-validate on import
validate_paths()
```

**Миграция на Съществуващи Файлове:**

**1. `agent_factory.py`**
```python
# Преди
PROJECT_ROOT = SCRIPT_DIR.parents[4]
PROFILES_DIR = SKILL_ROOT / "profiles"
# ...

# След
from config import (
    PROJECT_ROOT, PROFILES_DIR, TEMPLATE_PATH,
    GRAPH_PATH, STATE_DIR, ROLE_CATEGORY_MAP
)
```

**2. `graph_query.py`**
```python
# Преди
ROLE_CATEGORY_MAP = { ... }

# След
from config import ROLE_CATEGORY_MAP
```

**3. `project_planner.py`**
```python
# Преди
graph_path = ".agent/skills/meta_architect/resources/knowledge_graph.json"

# След
from config import GRAPH_PATH
graph_path = str(GRAPH_PATH)
```

**Файлове за промяна:**
1. `.agent/skills/meta_architect/config.py` (СЪЗДАЙ)
2. `.agent/skills/meta_architect/scripts/agent_factory.py`
3. `.agent/skills/meta_architect/scripts/graph_query.py`
4. `.agent/skills/meta_architect/scripts/knowledge_injector.py`
5. `.agent/skills/meta_architect/scripts/project_planner.py`
6. `.agent/skills/meta_architect/scripts/project_health_check.py`

**Тестване:**
```bash
# Тествай импорта
cd .agent/skills/meta_architect
python -c "from config import validate_paths; validate_paths(); print('✅ All paths valid')"

# Тествай че скриптовете работят
python scripts/agent_factory.py --help
python scripts/project_health_check.py --min-score 80
```

**Време:** 1 час  
**Риск:** 🟡 MEDIUM - изисква промени в 6+ файла

---

### 🟡 Task 2.2: Унифицирай State Management

**Проблем:**
- `state_manager.py` → `StateManager` (създава `{agent_id}.yml`)
- `project_planner.py` → `AgentStateManager` (създава `{role}.yml`)

**Решение:**

**Стъпка 1:** Разшири `StateManager` в `state_manager.py`
```python
# Добави нов метод
def create_state_by_role(
    self,
    role: str,
    mission_id: str,
    capabilities: List[str],
    knowledge_context: str
) -> Path:
    """
    Create agent state using role as filename (for compatibility).
    
    Args:
        role: Agent role (e.g., 'extension_builder')
        mission_id: Unique mission identifier
        capabilities: List of agent capabilities
        knowledge_context: Knowledge graph context
    
    Returns:
        Path to created state file
    """
    agent_id = f"{role}_{mission_id[:8]}"
    state = AgentState(
        agent_id=agent_id,
        role=AgentRole[role.upper()] if hasattr(AgentRole, role.upper()) else AgentRole.BUILDER,
        status=TaskStatus.IDLE,
        current_task=None,
        capabilities=capabilities,
        knowledge_context=knowledge_context,
        checkpoints=[],
        escalations=[],
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    
    # Save with role as filename for backward compatibility
    filepath = self.state_dir / f"{role}.yml"
    temp_path = filepath.with_suffix('.tmp')
    
    with open(temp_path, 'w', encoding='utf-8') as f:
        yaml.dump(asdict(state), f, default_flow_style=False, allow_unicode=True)
    
    temp_path.rename(filepath)
    return filepath
```

**Стъпка 2:** Премахни `AgentStateManager` от `project_planner.py`
```python
# Ред 496-531 - ИЗТРИЙ целия клас

# Ред 697 - Замени с:
from state_manager import StateManager

state_mgr = StateManager(state_dir=Path("agent_states"))
state_mgr.create_state_by_role(
    role=role,
    mission_id=mission_id,
    capabilities=capabilities,
    knowledge_context=context
)
```

**Файлове за промяна:**
1. `.agent/skills/meta_architect/scripts/state_manager.py` (добави метод)
2. `.agent/skills/meta_architect/scripts/project_planner.py` (премахни клас, ред 496-531)

**Тестване:**
```bash
# Тествай създаване на state файлове
python -c "
from state_manager import StateManager
from pathlib import Path

mgr = StateManager(Path('test_states'))
mgr.create_state_by_role(
    role='extension_builder',
    mission_id='test123',
    capabilities=['chrome_api', 'react'],
    knowledge_context='Test context'
)
print('✅ State created')
"

# Провери файла
cat test_states/extension_builder.yml
rm -rf test_states
```

**Време:** 45 минути  
**Риск:** 🟢 LOW - добре дефинирана промяна

---

### 🟡 Task 2.3: Премахни Дублирано Съдържание

**Проблем:**
- `.agent/workflows/main.md` дублира `.agent/skills/meta_architect/config/workflows/main_orchestration.yml`

**Решение:**

**Опция 1: Референция (Препоръчително)**

Актуализирай `.agent/workflows/main.md`:
```markdown
---
description: Main orchestration
---

# Main Orchestration Pipeline

**Source of Truth:** `.agent/skills/meta_architect/config/workflows/main_orchestration.yml`

This workflow delegates to the Meta-Architect skill's orchestration pipeline.

## Usage

```bash
# Run full pipeline
python .agent/skills/meta_architect/scripts/project_planner.py

# Run with custom health threshold
python .agent/skills/meta_architect/scripts/project_health_check.py --min-score 85
```

## Pipeline Stages

See [main_orchestration.yml](../skills/meta_architect/config/workflows/main_orchestration.yml) for details:

1. **initial_sync** - Audit + Context7 scan
2. **planning** - Generate remediation plan
3. **execution** - Execute tasks
4. **final_verification** - Health check (min: 80)

## Manual Execution

```bash
# Stage 1: Initial Sync
python .agent/skills/meta_architect/scripts/project_planner.py
# @mcp:context7/scan_workspace (manual via Antigravity)

# Stage 2: Planning
python .agent/skills/meta_architect/scripts/knowledge_injector.py --role extension_builder

# Stage 3: Execution
# (Handled by Antigravity based on remediation plan)

# Stage 4: Verification
python .agent/skills/meta_architect/scripts/project_health_check.py --min-score 80
```
```

**Опция 2: Премахване**

Ако `.agent/workflows/main.md` не се използва активно:
```bash
# Backup
mv .agent/workflows/main.md .agent/workflows/main.md.deprecated

# Добави коментар в YAML
echo "# This file replaces .agent/workflows/main.md" >> .agent/skills/meta_architect/config/workflows/main_orchestration.yml
```

**Файлове за промяна:**
- `.agent/workflows/main.md` (актуализирай ИЛИ премахни)

**Време:** 15 минути  
**Риск:** 🟢 LOW - документационна промяна

---

### 🟡 Task 2.4: Премахни Дублиран `ROLE_CATEGORY_MAP`

**Проблем:**
- `graph_query.py` (ред 173-180) - оригинал
- `project_planner.py` (ред 441-448) - дубликат

**Решение:**

**Стъпка 1:** Премести в `config.py` (вече направено в Task 2.1)

**Стъпка 2:** Актуализирай `project_planner.py`
```python
# Ред 441-448 - ИЗТРИЙ

# Ред 1 - Добави импорт
from config import ROLE_CATEGORY_MAP

# Ред 697 - Използвай директно
categories = ROLE_CATEGORY_MAP.get(role, "General Development")
```

**Стъпка 3:** Актуализирай `graph_query.py`
```python
# Ред 173-180 - ИЗТРИЙ

# Ред 1 - Добави импорт
from config import ROLE_CATEGORY_MAP
```

**Файлове за промяна:**
1. `.agent/skills/meta_architect/scripts/graph_query.py` (премахни дефиниция)
2. `.agent/skills/meta_architect/scripts/project_planner.py` (премахни дефиниция)

**Тестване:**
```bash
# Тествай импорта
python -c "
from config import ROLE_CATEGORY_MAP
from graph_query import GraphQuery
print('✅ No duplicate ROLE_CATEGORY_MAP')
"
```

**Време:** 10 минути  
**Риск:** 🟢 LOW - straightforward refactor

---

## 3. Средно Приоритетни (MEDIUM)

### 🟢 Task 3.1: Добави Fallback за `knowledge_graph.json`

**Проблем:**
```python
# graph_query.py (ред 51-54)
if not self.graph_path.exists():
    raise RuntimeError("CRITICAL: Graph not found")
```

**Решение:**

**Опция 1: Partial Mode**
```python
def _load_graph(self) -> None:
    """Load graph with fallback to minimal mode."""
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
    """Query with partial mode check."""
    if self._partial_mode:
        logger.warning("Running in partial mode - returning empty results")
        return []
    
    # ... existing logic
```

**Опция 2: Cached Fallback**
```python
FALLBACK_GRAPH_PATH = SKILL_ROOT / "resources" / "knowledge_graph.backup.json"

def _load_graph(self) -> None:
    """Load graph with fallback to cached version."""
    paths_to_try = [self.graph_path, FALLBACK_GRAPH_PATH]
    
    for path in paths_to_try:
        if path.exists():
            logger.info(f"Loading graph from {path}")
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.nodes = [GraphNode(**node) for node in data.get('nodes', [])]
            return
    
    raise RuntimeError(
        f"CRITICAL: No graph found at {self.graph_path} or {FALLBACK_GRAPH_PATH}"
    )
```

**Файлове за промяна:**
- `.agent/skills/meta_architect/scripts/graph_query.py` (ред 51-54)

**Допълнително:**
```bash
# Създай backup
cp .agent/skills/meta_architect/resources/knowledge_graph.json \
   .agent/skills/meta_architect/resources/knowledge_graph.backup.json
```

**Време:** 30 минути  
**Риск:** 🟡 MEDIUM - променя core логика

---

### 🟢 Task 3.2: Създай Липсващи Директории

**Проблем:**
- `agent_states/` - създава се динамично, но може да фейлне
- `context_packages/` - създава се динамично
- `logs/` - споменат, но не съществува

**Решение:**

**Стъпка 1:** Добави в `config.py`
```python
# config.py
def ensure_directories() -> None:
    """Create required directories if they don't exist."""
    dirs = [STATE_DIR, CONTEXT_DIR, LOGS_DIR]
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)
        # Create .gitkeep to track in git
        gitkeep = d / ".gitkeep"
        if not gitkeep.exists():
            gitkeep.touch()

# Auto-create on import
ensure_directories()
```

**Стъпка 2:** Създай `.gitignore` за динамични файлове
```bash
# .agent/agent_states/.gitignore
*.yml
!.gitkeep

# .agent/context_packages/.gitignore
*.md
!.gitkeep

# .agent/logs/.gitignore
*.log
!.gitkeep
```

**Файлове за промяна:**
1. `.agent/skills/meta_architect/config.py` (добави функция)
2. `.agent/agent_states/.gitignore` (СЪЗДАЙ)
3. `.agent/context_packages/.gitignore` (СЪЗДАЙ)
4. `.agent/logs/.gitignore` (СЪЗДАЙ)

**Тестване:**
```bash
# Тествай създаването
rm -rf agent_states context_packages logs
python -c "from config import ensure_directories; ensure_directories()"
ls -la agent_states/ context_packages/ logs/
```

**Време:** 15 минути  
**Риск:** 🟢 LOW - defensive programming

---

### 🟢 Task 3.3: Добави Docstrings

**Проблем:**
- Много функции нямат docstrings
- Особено критично за `agent_factory.py`

**Решение:**

**Пример за `agent_factory.py`:**
```python
def generate_system_prompt(
    role: str,
    mission_id: str,
    task_description: str,
    context_package: str
) -> str:
    """
    Generate system prompt for a sub-agent from template.
    
    This function loads the sub-agent template, fetches relevant knowledge
    from the graph, and populates placeholders to create a complete system
    prompt for the specified agent role.
    
    Args:
        role: Agent role identifier (e.g., 'extension_builder', 'qa_examiner')
        mission_id: Unique mission identifier (UUID format recommended)
        task_description: Detailed description of the task to be performed
        context_package: Pre-generated knowledge context (Markdown format)
    
    Returns:
        Complete system prompt ready for LLM injection
    
    Raises:
        FileNotFoundError: If template or profile files are missing
        ValueError: If role is not recognized or profile is invalid
    
    Example:
        >>> prompt = generate_system_prompt(
        ...     role='extension_builder',
        ...     mission_id='abc123',
        ...     task_description='Fix CORS issue in content script',
        ...     context_package='# Chrome APIs\\n...'
        ... )
        >>> print(prompt[:100])
        # IDENTITY\\nYou are Extension Builder Agent...
    """
    # ... existing code
```

**Файлове за промяна:**
1. `.agent/skills/meta_architect/scripts/agent_factory.py` (всички функции)
2. `.agent/skills/meta_architect/scripts/graph_query.py` (всички методи)
3. `.agent/skills/meta_architect/scripts/state_manager.py` (всички методи)
4. `.agent/skills/meta_architect/scripts/knowledge_injector.py` (всички функции)
5. `.agent/skills/meta_architect/scripts/project_planner.py` (основни класове)

**Стандарт:**
- Google-style docstrings
- Включи Args, Returns, Raises, Example (ако е приложимо)
- Type hints в сигнатурата

**Време:** 2 часа  
**Риск:** 🟢 LOW - документационна промяна

---

## 4. Ниско Приоритетни (LOW)

### 🔵 Task 4.1: Премахни/Имплементирай Липсващи Скриптове

**Проблем:**
- `agent_hooks.py` - празен или stub
- `infra_validator.py` - празен или stub

**Решение:**

**Стъпка 1:** Провери дали се използват
```bash
grep -r "agent_hooks\|infra_validator" .agent/
```

**Стъпка 2:** Ако НЕ се използват - изтрий
```bash
rm .agent/skills/meta_architect/scripts/agent_hooks.py
rm .agent/skills/meta_architect/scripts/infra_validator.py
```

**Стъпка 3:** Ако СЕ използват - имплементирай

**Пример за `agent_hooks.py`:**
```python
"""
Lifecycle hooks for agent execution.
Called by agent_factory.py at specific lifecycle events.
"""
from typing import Dict, Any
from datetime import datetime

def on_agent_spawn(agent_id: str, role: str, context: Dict[str, Any]) -> None:
    """Called when agent is spawned."""
    print(f"[{datetime.now()}] Agent {agent_id} ({role}) spawned")

def on_task_start(agent_id: str, task: str) -> None:
    """Called when task starts."""
    print(f"[{datetime.now()}] Agent {agent_id} started task: {task}")

def on_task_complete(agent_id: str, task: str, result: Any) -> None:
    """Called when task completes."""
    print(f"[{datetime.now()}] Agent {agent_id} completed task: {task}")

def on_escalation(agent_id: str, reason: str) -> None:
    """Called when agent escalates."""
    print(f"[{datetime.now()}] Agent {agent_id} escalated: {reason}")
```

**Време:** 30 минути (ако имплементация) / 5 минути (ако изтриване)  
**Риск:** 🟢 LOW - cleanup task

---

### 🔵 Task 4.2: Документирай Unused Workflows

**Проблем:**
- `escalation_handler.yml`
- `escalation_recovery.yml`
- `knowledge_injection.yml`
- `verification_gate.yml`

Не е ясно кога се използват.

**Решение:**

**Опция 1:** Добави README
```markdown
# Workflow Configurations

## Active Workflows

- **main_orchestration.yml** - Primary pipeline (used by `/main` command)

## Inactive/Deprecated Workflows

The following workflows are currently not in use:

- **escalation_handler.yml** - [TODO: Document purpose or remove]
- **escalation_recovery.yml** - [TODO: Document purpose or remove]
- **knowledge_injection.yml** - [TODO: Document purpose or remove]
- **verification_gate.yml** - [TODO: Document purpose or remove]

If you need to activate these, update this README and reference them in `main_orchestration.yml`.
```

**Опция 2:** Премести в `deprecated/`
```bash
mkdir -p .agent/skills/meta_architect/config/workflows/deprecated
mv .agent/skills/meta_architect/config/workflows/escalation_*.yml deprecated/
mv .agent/skills/meta_architect/config/workflows/knowledge_injection.yml deprecated/
mv .agent/skills/meta_architect/config/workflows/verification_gate.yml deprecated/
```

**Време:** 10 минути  
**Риск:** 🟢 LOW - organizational task

---

## 5. Тестова Стратегия

### Unit Tests

**Файл:** `.agent/skills/meta_architect/tests/test_graph_query.py`
```python
import pytest
from pathlib import Path
from graph_query import GraphQuery, GraphNode

@pytest.fixture
def test_graph(tmp_path):
    """Create minimal test graph."""
    graph_data = {
        "nodes": [
            {
                "id": "test-1",
                "type": "Documentation",
                "metadata": {
                    "category": "AI Models & LLM Development",
                    "sub_category": "OpenAI",
                    "priority": 1,
                    "access_url": "https://example.com"
                }
            }
        ]
    }
    graph_file = tmp_path / "test_graph.json"
    graph_file.write_text(json.dumps(graph_data))
    return graph_file

def test_query_by_category(test_graph):
    gq = GraphQuery(str(test_graph))
    nodes = gq.query_by_category("AI Models & LLM Development", priority=1)
    assert len(nodes) == 1
    assert nodes[0].id == "test-1"

def test_partial_mode_fallback(tmp_path):
    """Test fallback when graph is missing."""
    gq = GraphQuery(str(tmp_path / "nonexistent.json"))
    assert gq._partial_mode is True
    nodes = gq.query_by_category("Any Category")
    assert len(nodes) == 0
```

**Файл:** `.agent/skills/meta_architect/tests/test_state_manager.py`
```python
import pytest
from pathlib import Path
from state_manager import StateManager, TaskStatus, AgentRole

def test_create_and_load_state(tmp_path):
    mgr = StateManager(tmp_path)
    
    state = mgr.create_state(
        agent_id="test-agent",
        role=AgentRole.BUILDER,
        mission_id="mission-123"
    )
    
    assert state.agent_id == "test-agent"
    assert state.status == TaskStatus.IDLE
    
    # Test persistence
    loaded = mgr.load_state("test-agent")
    assert loaded.agent_id == "test-agent"

def test_atomic_write(tmp_path):
    """Test that writes are atomic."""
    mgr = StateManager(tmp_path)
    state = mgr.create_state("test", AgentRole.BUILDER, "m1")
    
    # Simulate concurrent write
    state.status = TaskStatus.ACTIVE
    mgr.save_state(state)
    
    # Verify no .tmp files left
    assert not list(tmp_path.glob("*.tmp"))
```

### Integration Tests

**Файл:** `.agent/skills/meta_architect/tests/test_integration.py`
```python
import subprocess
from pathlib import Path

def test_project_health_check():
    """Test full health check pipeline."""
    result = subprocess.run(
        ["python", ".agent/skills/meta_architect/scripts/project_health_check.py", "--min-score", "70"],
        capture_output=True,
        text=True
    )
    
    assert result.returncode == 0
    assert "Health Score:" in result.stdout

def test_agent_factory_generation():
    """Test system prompt generation."""
    result = subprocess.run(
        ["python", "-c", """
from agent_factory import generate_system_prompt
prompt = generate_system_prompt(
    role='extension_builder',
    mission_id='test',
    task_description='Test task',
    context_package='# Test context'
)
print('OK' if len(prompt) > 100 else 'FAIL')
        """],
        capture_output=True,
        text=True,
        cwd=".agent/skills/meta_architect/scripts"
    )
    
    assert "OK" in result.stdout
```

### Path Resolution Tests

**Файл:** `.agent/skills/meta_architect/tests/test_path_resolution.py`
```python
import subprocess
from pathlib import Path
import os

def test_path_resolution_from_root():
    """Test script execution from project root."""
    result = subprocess.run(
        ["python", ".agent/skills/meta_architect/scripts/agent_factory.py", "--help"],
        capture_output=True,
        cwd=Path.cwd()
    )
    assert result.returncode == 0

def test_path_resolution_from_scripts_dir():
    """Test script execution from scripts directory."""
    result = subprocess.run(
        ["python", "agent_factory.py", "--help"],
        capture_output=True,
        cwd=".agent/skills/meta_architect/scripts"
    )
    assert result.returncode == 0

def test_path_resolution_from_tmp():
    """Test script execution from /tmp."""
    script_path = Path.cwd() / ".agent/skills/meta_architect/scripts/agent_factory.py"
    result = subprocess.run(
        ["python", str(script_path), "--help"],
        capture_output=True,
        cwd="/tmp"
    )
    assert result.returncode == 0
```

### Запускане на Тестове

```bash
# Инсталирай pytest
pip install pytest pytest-cov

# Пусни всички тестове
cd .agent/skills/meta_architect
pytest tests/ -v

# С coverage
pytest tests/ --cov=scripts --cov-report=html

# Само unit tests
pytest tests/test_graph_query.py tests/test_state_manager.py -v

# Само integration tests
pytest tests/test_integration.py -v
```

---

## 6. Времева Линия

### Фаза 1: Критични Фиксове (1-2 часа)
- ✅ Task 1.1: Path Resolution (30 мин)
- ✅ Task 1.2: Health Thresholds (20 мин)
- ✅ Task 1.3: Import Fallback (15 мин)
- ✅ **Checkpoint:** Пусни `pnpm verify` - очакван score > 80

### Фаза 2: Централизация (2-3 часа)
- ✅ Task 2.1: Централизирай Config (1 час)
- ✅ Task 2.2: Унифицирай State Management (45 мин)
- ✅ Task 2.3: Премахни Дублирано Съдържание (15 мин)
- ✅ Task 2.4: Премахни Дублиран ROLE_CATEGORY_MAP (10 мин)
- ✅ **Checkpoint:** Пусни integration tests

### Фаза 3: Подобрения (2-3 часа)
- ✅ Task 3.1: Fallback за Graph (30 мин)
- ✅ Task 3.2: Създай Директории (15 мин)
- ✅ Task 3.3: Добави Docstrings (2 часа)
- ✅ **Checkpoint:** Генерирай документация с `pydoc`

### Фаза 4: Cleanup (1 час)
- ✅ Task 4.1: Премахни Липсващи Скриптове (30 мин)
- ✅ Task 4.2: Документирай Workflows (10 мин)
- ✅ **Checkpoint:** Финален `pnpm verify` - очакван score > 85

### Фаза 5: Тестване (2-3 часа)
- ✅ Напиши unit tests (1 час)
- ✅ Напиши integration tests (1 час)
- ✅ Напиши path resolution tests (30 мин)
- ✅ **Checkpoint:** 100% test pass rate

---

## 📊 Очаквани Резултати

### Преди Ремедиация
- Health Score: 🟡 **75/100**
- Security: 🟢 85
- Maintainability: 🟡 70
- Reliability: 🟡 65
- Documentation: 🟢 80

### След Ремедиация
- Health Score: 🟢 **90/100**
- Security: 🟢 90 (+5)
- Maintainability: 🟢 90 (+20)
- Reliability: 🟢 88 (+23)
- Documentation: 🟢 92 (+12)

### Ключови Подобрения
1. ✅ Няма hardcoded paths
2. ✅ Единен източник на истина за config
3. ✅ Robust path resolution
4. ✅ Атомарен state management
5. ✅ Comprehensive test coverage
6. ✅ Пълна документация

---

## 🚀 Следващи Стъпки

1. **Review:** Прегледай този план и одобри приоритизацията
2. **Execute:** Започни с Фаза 1 (критични фиксове)
3. **Test:** След всяка фаза пусни checkpoint тестове
4. **Document:** Актуализирай `AGENT_SYSTEM_AUDIT.md` след завършване
5. **Commit:** Направи commit с ясно описание на промените

**Готов за стартиране?** 🎯
