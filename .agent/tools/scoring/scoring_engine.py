# scoring_engine.py
"""Главен двигател – обединява всичко."""

from __future__ import annotations
import copy
import time
from typing import Optional, Callable
from models import ScoreState, ScoreEvent, EventType, Checkpoint, RollbackRecord
from rules_engine import RulesEngine, ScoringRule, create_default_rules
from checkpoint_manager import CheckpointManager, CheckpointPolicy
from rollback_engine import RollbackEngine, RollbackError


class ScoringEngine:
    """
    Главният клас, който обединява:
    - Правила за точкуване
    - Автоматични чекпоинти
    - Ролбак
    """

    def __init__(
        self,
        rules_engine: Optional[RulesEngine] = None,
        checkpoint_mgr: Optional[CheckpointManager] = None,
        rollback_engine: Optional[RollbackEngine] = None,
        auto_checkpoint: bool = True,
        use_default_rules: bool = True,
    ):
        # Състояние
        self.state = ScoreState()
        self.events: list[ScoreEvent] = []

        # Под-системи
        self.rules = rules_engine or RulesEngine()
        self.checkpoints = checkpoint_mgr or CheckpointManager()
        self.rollback = rollback_engine or RollbackEngine(self.checkpoints)
        self.auto_checkpoint = auto_checkpoint

        # Зареждаме правила по подразбиране
        if use_default_rules:
            for rule in create_default_rules():
                self.rules.add_rule(rule)

        # Observers
        self._on_score_change: list[Callable] = []
        self._on_checkpoint: list[Callable] = []
        self._on_rollback: list[Callable] = []

        # Начален чекпоинт
        # Note: Initializing checkpoint only if list is empty to avoid duplicates on reload
        if not self.checkpoints.checkpoints:
            self.checkpoints.create(
                self.state, self.events,
                label="initial",
                description="Начално състояние",
                tags=["initial"],
            )

    # ─── Observer Pattern ──────────────────────

    def on_score_change(self, fn: Callable[[ScoreState, ScoreEvent], None]):
        self._on_score_change.append(fn)
        return fn

    def on_checkpoint(self, fn: Callable[[Checkpoint], None]):
        self._on_checkpoint.append(fn)
        return fn

    def on_rollback_event(self, fn: Callable[[RollbackRecord], None]):
        self._on_rollback.append(fn)
        return fn

    # ─── Главни операции ───────────────────────

    def submit_action(
        self,
        action_type: str = "task_complete",
        context: Optional[dict] = None,
    ) -> list[ScoreEvent]:
        """
        Подава действие към системата.
        Правилата го оценяват и генерират ScoreEvents.
        """
        ctx = context or {}
        ctx.setdefault("action_type", action_type)
        ctx.setdefault("timestamp", time.time())

        # Оценяваме правилата
        new_events = self.rules.evaluate_all(self.state, ctx)

        # Прилагаме събитията
        for event in new_events:
            self._apply_event(event)

        # Автоматичен чекпоинт?
        if self.auto_checkpoint and new_events:
            cp = self.checkpoints.create_if_needed(
                self.state, self.events, new_events[-1]
            )
            if cp:
                for hook in self._on_checkpoint:
                    hook(cp)

        return new_events

    def add_points(
        self,
        points: float,
        description: str = "Manual adjustment",
        metadata: dict = None,
    ) -> ScoreEvent:
        """Ръчно добавяне на точки."""
        event = ScoreEvent(
            event_type=EventType.MANUAL_ADJUSTMENT,
            description=description,
            points_delta=points,
            multiplier=1.0,
            source_rule="manual",
            metadata=metadata or {},
        )
        self._apply_event(event)
        return event

    def apply_penalty(
        self, points: float, reason: str = "Penalty"
    ) -> ScoreEvent:
        """Прилага наказателни точки."""
        event = ScoreEvent(
            event_type=EventType.PENALTY_APPLIED,
            description=reason,
            points_delta=-abs(points),
            multiplier=1.0,
            source_rule="manual_penalty",
        )
        self._apply_event(event)
        self.state.streak = 0  # нулираме streak
        return event

    # ─── Checkpoint операции ───────────────────

    def save_checkpoint(
        self,
        label: str = "",
        description: str = "",
        tags: list[str] = None,
    ) -> Checkpoint:
        """Ръчно създаване на чекпоинт."""
        cp = self.checkpoints.create(
            self.state, self.events,
            label=label,
            description=description,
            tags=tags or ["manual"],
        )
        for hook in self._on_checkpoint:
            hook(cp)
        return cp

    def list_checkpoints(self) -> list[dict]:
        return self.checkpoints.list_all()

    # ─── Rollback операции ─────────────────────

    def rollback_to(
        self,
        checkpoint_id: str,
        reason: str = "",
    ) -> RollbackRecord:
        """Ролбак до конкретен чекпоинт."""
        new_state, new_events, record = self.rollback.rollback_to_checkpoint(
            checkpoint_id, self.state, self.events, reason
        )

        self.state = new_state
        self.events = new_events

        # Създаваме чекпоинт след ролбака
        self.checkpoints.create(
            self.state, self.events,
            label=f"post-rollback-{record.id[:6]}",
            description=f"Състояние след ролбак: {reason}",
            tags=["rollback", "auto"],
        )

        for hook in self._on_rollback:
            hook(record)

        return record

    def rollback_last(self, reason: str = "Undo last") -> RollbackRecord:
        """Ролбак до последния чекпоинт."""
        new_state, new_events, record = self.rollback.rollback_to_latest(
            self.state, self.events, reason
        )
        self.state = new_state
        self.events = new_events

        for hook in self._on_rollback:
            hook(record)

        return record

    def rollback_steps(
        self, n: int, reason: str = ""
    ) -> RollbackRecord:
        """Ролбак N стъпки назад."""
        new_state, new_events, record = self.rollback.rollback_n_steps(
            n, self.state, self.events, reason
        )
        self.state = new_state
        self.events = new_events
        return record

    def undo_rollback(self) -> bool:
        """Отменя последния ролбак."""
        restored = self.rollback.undo_last_rollback(self.state)
        if restored:
            self.state = restored
            return True
        return False

    def preview_rollback(self, checkpoint_id: str) -> dict:
        """Показва какво ще се промени без да прилага."""
        return self.rollback.diff(checkpoint_id, self.state)

    # ─── Информация ────────────────────────────

    def get_status(self) -> dict:
        return {
            "state": self.state.to_dict(),
            "events_count": len(self.events),
            "checkpoints_count": len(self.checkpoints.checkpoints),
            "rollbacks_count": len(self.rollback.rollback_history),
            "rules_count": len(self.rules.rules),
            "state_fingerprint": self.state.fingerprint(),
        }

    def get_events_log(self, last_n: int = 20) -> list[dict]:
        return [
            {
                "id": e.id,
                "type": e.event_type.name if hasattr(e.event_type, 'name') else str(e.event_type),
                "points": e.effective_points,
                "description": e.description,
                "rule": e.source_rule,
                "timestamp": e.timestamp,
            }
            for e in self.events[-last_n:]
        ]

    def get_score(self) -> float:
        return self.state.total_score

    def get_level(self) -> int:
        return self.state.level

    # ─── Вътрешни ─────────────────────────────

    def _apply_event(self, event: ScoreEvent):
        """Прилага ScoreEvent към текущото състояние."""
        self.state.total_score += event.effective_points
        self.state.events_count += 1

        if event.effective_points > 0:
            self.state.bonuses += event.effective_points
            self.state.streak += 1
            self.state.combo_count += 1
        elif event.effective_points < 0:
            self.state.penalties += abs(event.effective_points)

        self.events.append(event)

        for hook in self._on_score_change:
            hook(self.state, event)
