# rollback_engine.py
"""Двигател за ролбак – връщане към предишно състояние."""

from __future__ import annotations
import copy
import time
from typing import Optional, Callable
from models import (
    ScoreState, ScoreEvent, Checkpoint,
    RollbackRecord, EventType
)
from checkpoint_manager import CheckpointManager


class RollbackError(Exception):
    """Грешка при ролбак."""
    pass


class RollbackEngine:
    """
    Извършва ролбак на състоянието към определен чекпоинт.
    Пази история на ролбаци и поддържа undo/redo.
    """

    def __init__(self, checkpoint_mgr: CheckpointManager):
        self.checkpoint_mgr = checkpoint_mgr
        self.rollback_history: list[RollbackRecord] = []
        self._redo_stack: list[RollbackRecord] = []

        # Hooks
        self._before_rollback: list[Callable] = []
        self._after_rollback: list[Callable] = []
        self._on_rollback_error: list[Callable] = []

    # ─── Hooks ─────────────────────────────────

    def on_before_rollback(self, fn: Callable) -> None:
        self._before_rollback.append(fn)

    def on_after_rollback(self, fn: Callable) -> None:
        self._after_rollback.append(fn)

    def on_error(self, fn: Callable) -> None:
        self._on_rollback_error.append(fn)

    # ─── Основни операции ──────────────────────

    def rollback_to_checkpoint(
        self,
        checkpoint_id: str,
        current_state: ScoreState,
        current_events: list[ScoreEvent],
        reason: str = "",
        dry_run: bool = False,
    ) -> tuple[ScoreState, list[ScoreEvent], RollbackRecord]:
        """
        Връща състоянието към посочения чекпоинт.

        Args:
            checkpoint_id: ID на целевия чекпоинт
            current_state: текущото състояние
            current_events: текущия списък със събития
            reason: причина за ролбака
            dry_run: ако True, не прилага промените

        Returns:
            (ново_състояние, нови_събития, запис_за_ролбак)
        """
        target = self.checkpoint_mgr.get(checkpoint_id)
        if target is None:
            raise RollbackError(f"Чекпоинт '{checkpoint_id}' не съществува!")

        # Верификация на integrity
        expected_fp = target.state.fingerprint()
        if target.state_fingerprint != expected_fp:
            raise RollbackError(
                f"Integrity check failed! "
                f"Expected {target.state_fingerprint}, got {expected_fp}"
            )

        # Пресмятаме колко събития ще загубим
        cp_events_count = len(target.events_snapshot)
        current_events_count = len(current_events)
        events_discarded = max(0, current_events_count - cp_events_count)

        record = RollbackRecord(
            from_checkpoint_id=self._get_current_cp_id(),
            to_checkpoint_id=checkpoint_id,
            state_before=current_state.to_dict(),
            state_after=target.state.to_dict(),
            events_discarded=events_discarded,
            reason=reason,
        )

        if dry_run:
            record.success = True
            return copy.deepcopy(target.state), current_events, record

        # Изпълняваме before hooks
        for hook in self._before_rollback:
            try:
                hook(current_state, target, record)
            except Exception as e:
                for err_hook in self._on_rollback_error:
                    err_hook(e, record)
                raise RollbackError(f"Before-hook грешка: {e}")

        # === ИЗВЪРШВАНЕ НА РОЛБАК ===
        new_state = copy.deepcopy(target.state)
        new_events = self._reconstruct_events(target)
        record.success = True

        # Записваме в историята
        self.rollback_history.append(record)
        self._redo_stack.clear()  # при нов rollback redo-то се изчиства

        # After hooks
        for hook in self._after_rollback:
            hook(new_state, target, record)

        return new_state, new_events, record

    def rollback_to_latest(
        self,
        current_state: ScoreState,
        current_events: list[ScoreEvent],
        reason: str = "Rollback to latest checkpoint",
    ) -> tuple[ScoreState, list[ScoreEvent], RollbackRecord]:
        """Ролбак до последния чекпоинт."""
        latest = self.checkpoint_mgr.get_latest()
        if latest is None:
            raise RollbackError("Няма налични чекпоинти!")
        return self.rollback_to_checkpoint(
            latest.id, current_state, current_events, reason
        )

    def rollback_n_steps(
        self,
        n: int,
        current_state: ScoreState,
        current_events: list[ScoreEvent],
        reason: str = "",
    ) -> tuple[ScoreState, list[ScoreEvent], RollbackRecord]:
        """Ролбак N чекпоинта назад."""
        all_cps = self.checkpoint_mgr.checkpoints
        if n > len(all_cps):
            raise RollbackError(
                f"Заявени {n} стъпки назад, но има само {len(all_cps)} чекпоинта!"
            )
        target = all_cps[-n]
        return self.rollback_to_checkpoint(
            target.id, current_state, current_events,
            reason or f"Rollback {n} steps back"
        )

    def undo_last_rollback(
        self,
        current_state: ScoreState,
    ) -> Optional[ScoreState]:
        """Отменя последния ролбак (undo на undo)."""
        if not self.rollback_history:
            return None

        last = self.rollback_history.pop()
        self._redo_stack.append(last)

        # Възстановяваме pre-rollback състоянието
        return ScoreState.from_dict(last.state_before)

    def redo(self, current_state: ScoreState) -> Optional[ScoreState]:
        """Redo на отменен ролбак."""
        if not self._redo_stack:
            return None

        record = self._redo_stack.pop()
        self.rollback_history.append(record)
        return ScoreState.from_dict(record.state_after)

    # ─── Диагностика ──────────────────────────

    def diff(
        self, checkpoint_id: str, current_state: ScoreState
    ) -> dict:
        """Показва разликите между текущото състояние и чекпоинт."""
        target = self.checkpoint_mgr.get(checkpoint_id)
        if target is None:
            raise RollbackError(f"Чекпоинт '{checkpoint_id}' не е намерен!")

        current = current_state.to_dict()
        saved = target.state.to_dict()

        diff = {}
        for key in current:
            if current[key] != saved[key]:
                diff[key] = {
                    "current": current[key],
                    "checkpoint": saved[key],
                    "delta": (
                        current[key] - saved[key]
                        if isinstance(current[key], (int, float))
                        else "changed"
                    ),
                }
        return diff

    def get_history(self) -> list[dict]:
        return [
            {
                "id": r.id,
                "timestamp": r.timestamp,
                "from": r.from_checkpoint_id,
                "to": r.to_checkpoint_id,
                "events_lost": r.events_discarded,
                "reason": r.reason,
                "success": r.success,
            }
            for r in self.rollback_history
        ]

    # ─── Вътрешни ─────────────────────────────

    def _get_current_cp_id(self) -> str:
        latest = self.checkpoint_mgr.get_latest()
        return latest.id if latest else ""

    def _reconstruct_events(self, checkpoint: Checkpoint) -> list[ScoreEvent]:
        """Реконструира списъка със събития от чекпоинт snapshot."""
        events = []
        for e_dict in checkpoint.events_snapshot:
            try:
                e_dict_clean = {k: v for k, v in e_dict.items()}
                if 'event_type' in e_dict_clean:
                    # Clean up event_type name if it's already an Enum or a string
                    et = e_dict_clean['event_type']
                    if not isinstance(et, EventType):
                        e_dict_clean['event_type'] = EventType[et]
                events.append(ScoreEvent(**e_dict_clean))
            except Exception:
                continue
        return events
