"""
state_manager.py - Agent State Management Module
Superior Meta-Architect+ System

Manages agent state files (YAML) with atomic writes and state validation.
"""

import yaml
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime, timezone
from enum import Enum
from dataclasses import dataclass, asdict


class TaskStatus(Enum):
    """Agent task execution states"""
    IDLE = "IDLE"
    ACTIVE = "ACTIVE"
    WAITING = "WAITING"
    BLOCKED = "BLOCKED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class AgentRole(Enum):
    """Supported builder agent roles"""
    FRONTEND_SPECIALIST = "frontend_specialist"
    BACKEND_SPECIALIST = "backend_specialist"
    DB_ARCHITECT = "db_architect"
    DEVOPS_ENGINEER = "devops_engineer"
    AI_INTEGRATOR = "ai_integrator"


@dataclass
class AgentState:
    """Complete state representation for an agent"""
    agent_id: str
    role: str
    status: str
    assigned_task: Dict
    context_injection: Dict
    checkpoints: List[Dict]
    escalations: List[Dict]
    output_artifacts: List[Dict]


class StateManager:
    """
    Manages agent state files with atomic writes.
    
    Provides CRUD operations for agent states.
    """
    
    def __init__(self, state_dir: str = "./agent_states"):
        self.state_dir = Path(state_dir)
        self.state_dir.mkdir(parents=True, exist_ok=True)
    
    def create_state(
        self,
        role: str,
        task_description: str,
        context_package_path: str
    ) -> AgentState:
        """Create a new agent state"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        agent_id = f"{role}_{timestamp}"
        
        return AgentState(
            agent_id=agent_id,
            role=role,
            status=TaskStatus.IDLE.value,
            assigned_task={
                "id": f"TASK_{timestamp}",
                "description": task_description,
                "started_at": None,
                "completed_at": None
            },
            context_injection={
                "last_update": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
                "package_path": context_package_path
            },
            checkpoints=[],
            escalations=[],
            output_artifacts=[]
        )
    
    def save_state(self, state: AgentState) -> Path:
        """Persist agent state to YAML file (atomic write)"""
        filepath = self.state_dir / f"{state.agent_id}.yml"
        temp_path = filepath.with_suffix('.tmp')
        
        state_dict = {
            "agent_id": state.agent_id,
            "role": state.role,
            "status": state.status,
            "assigned_task": state.assigned_task,
            "context_injection": state.context_injection,
            "checkpoints": state.checkpoints,
            "escalations": state.escalations,
            "output_artifacts": state.output_artifacts
        }
        
        with open(temp_path, 'w', encoding='utf-8') as f:
            yaml.dump(state_dict, f, default_flow_style=False, sort_keys=False)
        
        temp_path.rename(filepath)
        print(f"[StateManager] Saved: {filepath}")
        
        return filepath
    
    def load_state(self, agent_id: str) -> AgentState:
        """Load agent state from file"""
        filepath = self.state_dir / f"{agent_id}.yml"
        
        with open(filepath, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
        
        return AgentState(**data)
    
    def update_status(self, agent_id: str, new_status: str) -> None:
        """Update agent status"""
        state = self.load_state(agent_id)
        state.status = new_status
        
        if new_status == TaskStatus.ACTIVE.value:
            state.assigned_task["started_at"] = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
        elif new_status == TaskStatus.COMPLETED.value:
            state.assigned_task["completed_at"] = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
        
        self.save_state(state)
        print(f"[StateManager] {agent_id} -> {new_status}")
    
    def add_checkpoint(
        self,
        agent_id: str,
        action: str,
        files_modified: List[str]
    ) -> None:
        """Add checkpoint to agent history"""
        state = self.load_state(agent_id)
        
        checkpoint = {
            "timestamp": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            "action": action,
            "files_modified": files_modified
        }
        
        state.checkpoints.append(checkpoint)
        self.save_state(state)
        print(f"[StateManager] Checkpoint: {action}")
    
    def add_escalation(self, agent_id: str, issue: str) -> None:
        """Record an escalation"""
        state = self.load_state(agent_id)
        
        escalation = {
            "timestamp": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            "issue": issue,
            "status": "PENDING"
        }
        
        state.escalations.append(escalation)
        state.status = TaskStatus.BLOCKED.value
        self.save_state(state)
        print(f"[StateManager] ESCALATION: {issue}")
    
    def resolve_escalation(
        self,
        agent_id: str,
        resolution: str
    ) -> None:
        """Resolve a pending escalation"""
        state = self.load_state(agent_id)
        
        for esc in state.escalations:
            if esc["status"] == "PENDING":
                esc["status"] = "RESOLVED"
                esc["resolution"] = resolution
                esc["resolved_at"] = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
        
        state.status = TaskStatus.ACTIVE.value
        self.save_state(state)
    
    def list_agents(self, status_filter: Optional[str] = None) -> List[str]:
        """List all agent IDs, optionally filtered by status"""
        agents = []
        
        for filepath in self.state_dir.glob("*.yml"):
            with open(filepath, 'r') as f:
                data = yaml.safe_load(f)
            
            if status_filter is None or data.get("status") == status_filter:
                agents.append(data["agent_id"])
        
        return agents


if __name__ == "__main__":
    # Test state management
    sm = StateManager("./agent_states")
    
    print("\n=== Testing State Manager ===")
    
    state = sm.create_state(
        role="frontend_specialist",
        task_description="Test task",
        context_package_path="./context_packages/test.md"
    )
    
    sm.save_state(state)
    sm.update_status(state.agent_id, TaskStatus.ACTIVE.value)
    sm.add_checkpoint(state.agent_id, "Created component", ["App.tsx"])
    
    print(f"Agent {state.agent_id} created and updated")
