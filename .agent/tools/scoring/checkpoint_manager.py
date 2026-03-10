# checkpoint_manager.py
"""Управление на чекпоинти – запазване и възстановяване на състояние."""

from __future__ import annotations
import copy
import json
import os
import time
from typing import Optional
from models import Checkpoint, ScoreState, ScoreEvent, RollbackRecord


class CheckpointPolicy:
    """Политика кога да се правят автоматични чекпоинти."""

    def __init__(
        self,
        every_n_events: int = 10,
        every_n_seconds: float = 300.0,      # 5 минути
        on_level_up: bool = True,
        on_milestone: bool = True,
        on_score_threshold: list[float] = None,
        max_checkpoints: int = 50,
        keep_last_n: int = 20,
    ):
        self.every_n_events = every_n_events
        self.every_n_seconds = every_n_seconds
        self.on_level_up = on_level_up
        self.on_milestone = on_milestone
        self.on_score_threshold = on_score_threshold or [100, 500, 1000, 5000]
        self.max_checkpoints = max_checkpoints
        self.keep_last_n = keep_last_n

        # Вътрешни броячи
        self._events_since_last = 0
        self._last_checkpoint_time = time.time()
        self._passed_thresholds: set[float] = set()

    def should_checkpoint(
        self,
        state: ScoreState,
        event: Optional[ScoreEvent] = None,
    ) -> tuple[bool, str]:
        """Връща (True, причина) ако трябва да се направи чекпоинт."""

        self._events_since_last += 1

        # По брой събития
        if self._events_since_last >= self.every_n_events:
            self._events_since_last = 0
            return True, f"auto:every_{self.every_n_events}_events"

        # По време
        now = time.time()
        if (now - self._last_checkpoint_time) >= self.every_n_seconds:
            self._last_checkpoint_time = now
            return True, f"auto:every_{self.every_n_seconds}s"

        # При level up
        if self.on_level_up and event and event.event_type.name == "MILESTONE_REACHED":
            return True, f"auto:level_up_to_{state.level}"

        # При достигане на score threshold
        for threshold in self.on_score_threshold:
            if threshold not in self._passed_thresholds:
                if state.total_score >= threshold:
                    self._passed_thresholds.add(threshold)
                    return True, f"auto:score_reached_{threshold}"

        return False, ""

    def reset_counters(self):
        self._events_since_last = 0
        self._last_checkpoint_time = time.time()


class CheckpointManager:
    """
    Управлява създаване, съхранение и зареждане на чекпоинти.
    Поддържа JSON файл и in-memory хранилище.
    """

    def __init__(
        self,
        storage_path: str = None,
        policy: Optional[CheckpointPolicy] = None,
    ):
        # Default path for BrainBox project
        if storage_path is None:
            # Find the project root relative to this tool
            # Assuming this is in .agent/tools/scoring/
            # We want .agent/checkpoints/checkpoints.json
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            storage_path = os.path.join(base_dir, "checkpoints", "checkpoints.json")
            
        self.storage_path = storage_path
        # Ensure directory exists
        os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
        
        self.policy = policy or CheckpointPolicy()
        self.checkpoints: list[Checkpoint] = []
        self._index: dict[str, int] = {}    # id -> позиция в list
        self._load()

    # ─── Публичен API ──────────────────────────

    def create(
        self,
        state: ScoreState,
        events: list[ScoreEvent],
        label: str = "",
        description: str = "",
        auto: bool = False,
        tags: list[str] = None,
    ) -> Checkpoint:
        """Създава нов чекпоинт."""
        parent_id = self.checkpoints[-1].id if self.checkpoints else ""

        cp = Checkpoint(
            label=label or f"cp-{len(self.checkpoints) + 1}",
            description=description,
            state=copy.deepcopy(state),
            events_snapshot=[e.__dict__ for e in events[-100:]],  # последни 100
            auto_created=auto,
            parent_checkpoint_id=parent_id,
            tags=tags or [],
        )

        self.checkpoints.append(cp)
        self._index[cp.id] = len(self.checkpoints) - 1

        # Почистване на стари ако са прекалено много
        self._enforce_limits()
        self._save()

        return cp

    def create_if_needed(
        self,
        state: ScoreState,
        events: list[ScoreEvent],
        event: Optional[ScoreEvent] = None,
    ) -> Optional[Checkpoint]:
        """Проверява политиката и създава чекпоинт ако е нужно."""
        should, reason = self.policy.should_checkpoint(state, event)
        if should:
            return self.create(
                state, events,
                label=reason,
                description=f"Автоматичен чекпоинт: {reason}",
                auto=True,
                tags=["auto", reason.split(":")[0]],
            )
        return None

    def get(self, checkpoint_id: str) -> Optional[Checkpoint]:
        idx = self._index.get(checkpoint_id)
        if idx is not None and idx < len(self.checkpoints):
            return self.checkpoints[idx]
        return None

    def get_latest(self) -> Optional[Checkpoint]:
        return self.checkpoints[-1] if self.checkpoints else None

    def get_by_label(self, label: str) -> Optional[Checkpoint]:
        for cp in reversed(self.checkpoints):
            if cp.label == label:
                return cp
        return None

    def get_by_tag(self, tag: str) -> list[Checkpoint]:
        return [cp for cp in self.checkpoints if tag in cp.tags]

    def list_all(self) -> list[dict]:
        """Връща обобщение на всички чекпоинти."""
        return [
            {
                "id": cp.id,
                "label": cp.label,
                "timestamp": cp.timestamp,
                "score": cp.state.total_score,
                "level": cp.state.level,
                "fingerprint": cp.state_fingerprint,
                "auto": cp.auto_created,
                "tags": cp.tags,
            }
            for cp in self.checkpoints
        ]

    def delete(self, checkpoint_id: str) -> bool:
        idx = self._index.get(checkpoint_id)
        if idx is not None:
            self.checkpoints.pop(idx)
            self._rebuild_index()
            self._save()
            return True
        return False

    def clear_all(self) -> int:
        count = len(self.checkpoints)
        self.checkpoints.clear()
        self._index.clear()
        self._save()
        return count

    # ─── Вътрешни методи ───────────────────────

    def _enforce_limits(self):
        """Пази само последните N чекпоинта."""
        if len(self.checkpoints) > self.policy.max_checkpoints:
            keep = self.policy.keep_last_n
            # Запазваме ръчните + последните keep автоматични
            manual = [cp for cp in self.checkpoints if not cp.auto_created]
            auto = [cp for cp in self.checkpoints if cp.auto_created]
            auto = auto[-keep:] if len(auto) > keep else auto
            self.checkpoints = sorted(
                manual + auto, key=lambda c: c.timestamp
            )
            self._rebuild_index()

    def _rebuild_index(self):
        self._index = {cp.id: i for i, cp in enumerate(self.checkpoints)}

    def _save(self):
        def default_serializer(obj):
            if hasattr(obj, 'name') and hasattr(obj, 'value'): # Handle Enums
                return obj.name
            return str(obj)

        data = [cp.to_dict() for cp in self.checkpoints]
        with open(self.storage_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False, default=default_serializer)

    def _load(self):
        if os.path.exists(self.storage_path):
            try:
                with open(self.storage_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self.checkpoints = [Checkpoint.from_dict(d) for d in data]
                self._rebuild_index()
            except (json.JSONDecodeError, KeyError, Exception):
                self.checkpoints = []
                self._index = {}
