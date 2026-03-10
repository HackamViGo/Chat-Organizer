# rules_engine.py
"""Двигател за правила – дефинира КАК се дават точки."""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Callable, Optional
from models import ScoreState, ScoreEvent, EventType


@dataclass
class ScoringRule:
    """Едно правило за точкуване."""
    name: str
    description: str = ""
    event_type: EventType = EventType.TASK_COMPLETE
    enabled: bool = True
    priority: int = 0                   # по-висок = изпълнява се първо
    condition: Callable[[ScoreState, dict], bool] = lambda s, ctx: True
    calculate: Callable[[ScoreState, dict], float] = lambda s, ctx: 0.0
    multiplier_fn: Callable[[ScoreState, dict], float] = lambda s, ctx: 1.0
    side_effects: Callable[[ScoreState, dict], None] = lambda s, ctx: None

    def evaluate(self, state: ScoreState, context: dict) -> Optional[ScoreEvent]:
        """Оценява правилото и връща ScoreEvent или None."""
        if not self.enabled:
            return None
        if not self.condition(state, context):
            return None

        points = self.calculate(state, context)
        mult = self.multiplier_fn(state, context)

        event = ScoreEvent(
            event_type=self.event_type,
            description=context.get("description", self.description),
            points_delta=points,
            multiplier=mult,
            source_rule=self.name,
            metadata=context.get("metadata", {})
        )

        # Странични ефекти (промяна на streak, combo и т.н.)
        self.side_effects(state, context)

        return event


class RulesEngine:
    """Управлява колекция от правила и ги прилага."""

    def __init__(self):
        self.rules: list[ScoringRule] = []
        self._rule_index: dict[str, ScoringRule] = {}

    def add_rule(self, rule: ScoringRule) -> None:
        self.rules.append(rule)
        self._rule_index[rule.name] = rule
        self.rules.sort(key=lambda r: -r.priority)

    def remove_rule(self, name: str) -> bool:
        if name in self._rule_index:
            self.rules.remove(self._rule_index.pop(name))
            return True
        return False

    def toggle_rule(self, name: str, enabled: bool) -> None:
        if name in self._rule_index:
            self._rule_index[name].enabled = enabled

    def evaluate_all(
        self, state: ScoreState, context: dict
    ) -> list[ScoreEvent]:
        """Прилага всички matching правила и връща списък от ScoreEvent."""
        events = []
        for rule in self.rules:
            event = rule.evaluate(state, context)
            if event is not None:
                events.append(event)
        return events

    def list_rules(self) -> list[dict]:
        return [
            {
                "name": r.name,
                "type": r.event_type.name,
                "enabled": r.enabled,
                "priority": r.priority,
                "description": r.description,
            }
            for r in self.rules
        ]


# ─────────────────────────────────────────────
#  ФАБРИКА ЗА СТАНДАРТНИ ПРАВИЛА
# ─────────────────────────────────────────────

def create_default_rules() -> list[ScoringRule]:
    """Създава набор от стандартни правила."""

    rules = []

    # 1) Базово точкуване за завършена задача
    rules.append(ScoringRule(
        name="base_task_score",
        description="Базови точки за завършена задача",
        event_type=EventType.TASK_COMPLETE,
        priority=100,
        calculate=lambda s, ctx: ctx.get("base_points", 10.0),
        multiplier_fn=lambda s, ctx: s.multiplier,
    ))

    # 2) Streak бонус (поредни успехи)
    def streak_condition(state: ScoreState, ctx: dict) -> bool:
        return state.streak >= 3

    def streak_calc(state: ScoreState, ctx: dict) -> float:
        return min(state.streak * 2, 20)  # макс 20 бонус точки

    def streak_side_effect(state: ScoreState, ctx: dict) -> None:
        state.streak += 1

    rules.append(ScoringRule(
        name="streak_bonus",
        description="Бонус за поредни успехи (streak ≥ 3)",
        event_type=EventType.STREAK_BONUS,
        priority=90,
        condition=streak_condition,
        calculate=streak_calc,
        side_effects=streak_side_effect,
    ))

    # 3) Combo множител
    def combo_condition(state: ScoreState, ctx: dict) -> bool:
        return state.combo_count >= 5

    def combo_multiplier(state: ScoreState, ctx: dict) -> float:
        return 1.0 + (state.combo_count * 0.1)  # +10% per combo

    rules.append(ScoringRule(
        name="combo_multiplier",
        description="Множител за combo (combo ≥ 5)",
        event_type=EventType.MULTIPLIER_CHANGE,
        priority=80,
        condition=combo_condition,
        calculate=lambda s, ctx: 0,  # само променя multiplier-а
        multiplier_fn=combo_multiplier,
        side_effects=lambda s, ctx: setattr(
            s, 'multiplier', combo_multiplier(s, ctx)
        ),
    ))

    # 4) Penalty за грешки
    rules.append(ScoringRule(
        name="error_penalty",
        description="Наказание за грешки",
        event_type=EventType.PENALTY_APPLIED,
        priority=70,
        condition=lambda s, ctx: ctx.get("has_error", False),
        calculate=lambda s, ctx: -ctx.get("penalty_points", 5.0),
        side_effects=lambda s, ctx: (
            setattr(s, 'streak', 0),
            setattr(s, 'penalties', s.penalties + ctx.get("penalty_points", 5.0)),
        ),
    ))

    # 5) Milestone (достигане на ниво)
    def milestone_condition(state: ScoreState, ctx: dict) -> bool:
        thresholds = [100, 250, 500, 1000, 2500, 5000, 10000]
        return any(
            state.total_score < t <= state.total_score + ctx.get("incoming_points", 0)
            for t in thresholds
        )

    rules.append(ScoringRule(
        name="milestone_bonus",
        description="Бонус за достигане на milestone",
        event_type=EventType.MILESTONE_REACHED,
        priority=60,
        condition=milestone_condition,
        calculate=lambda s, ctx: 50.0,
        side_effects=lambda s, ctx: setattr(s, 'level', s.level + 1),
    ))

    return rules
