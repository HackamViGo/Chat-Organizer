# models.py
"""Основни модели за точкуване, чекпоинти и ролбак."""

from __future__ import annotations
import time
import uuid
import json
import copy
import hashlib
from enum import Enum, auto
from dataclasses import dataclass, field, asdict
from typing import Any, Callable, Optional


class EventType(Enum):
    """Типове събития, които генерират точки."""
    TASK_COMPLETE = auto()
    BONUS_EARNED = auto()
    PENALTY_APPLIED = auto()
    MILESTONE_REACHED = auto()
    STREAK_BONUS = auto()
    MULTIPLIER_CHANGE = auto()
    MANUAL_ADJUSTMENT = auto()
    CHECKPOINT_CREATED = auto()
    ROLLBACK_PERFORMED = auto()


@dataclass
class ScoreEvent:
    """Едно събитие, което променя точките."""
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    timestamp: float = field(default_factory=time.time)
    event_type: EventType = EventType.TASK_COMPLETE
    description: str = ""
    points_delta: float = 0.0          # +/-  промяна
    multiplier: float = 1.0            # множител
    effective_points: float = 0.0      # points_delta * multiplier
    source_rule: str = ""              # коя правило го е генерирало
    metadata: dict = field(default_factory=dict)

    def __post_init__(self):
        self.effective_points = self.points_delta * self.multiplier


@dataclass
class ScoreState:
    """Пълно състояние на точкуването в даден момент."""
    total_score: float = 0.0
    level: int = 1
    streak: int = 0
    multiplier: float = 1.0
    combo_count: int = 0
    penalties: float = 0.0
    bonuses: float = 0.0
    events_count: int = 0
    custom_data: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> ScoreState:
        return cls(**data)

    def fingerprint(self) -> str:
        """SHA256 хеш на състоянието за верификация."""
        raw = json.dumps(self.to_dict(), sort_keys=True)
        return hashlib.sha256(raw.encode()).hexdigest()[:16]


@dataclass
class Checkpoint:
    """Запазено състояние (snapshot) в определен момент."""
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:10])
    timestamp: float = field(default_factory=time.time)
    label: str = ""
    description: str = ""
    state: ScoreState = field(default_factory=ScoreState)
    state_fingerprint: str = ""
    events_snapshot: list = field(default_factory=list)
    auto_created: bool = False         # автоматичен или ръчен
    parent_checkpoint_id: str = ""     # предходен чекпоинт
    tags: list = field(default_factory=list)

    def __post_init__(self):
        if not self.state_fingerprint:
            self.state_fingerprint = self.state.fingerprint()

    def to_dict(self) -> dict:
        d = asdict(self)
        # Ensure enums are converted to strings in the dict if needed, 
        # but here we rely on the caller or default_str in json.dump
        return d

    @classmethod
    def from_dict(cls, data: dict) -> Checkpoint:
        data['state'] = ScoreState.from_dict(data['state'])
        return cls(**data)


@dataclass
class RollbackRecord:
    """Запис за извършен ролбак."""
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:10])
    timestamp: float = field(default_factory=time.time)
    from_checkpoint_id: str = ""       # от кой чекпоинт тръгнахме
    to_checkpoint_id: str = ""         # до кой се върнахме
    state_before: dict = field(default_factory=dict)
    state_after: dict = field(default_factory=dict)
    events_discarded: int = 0          # колко събития се губят
    reason: str = ""
    success: bool = True
