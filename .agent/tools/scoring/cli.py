# cli.py
"""Интерактивен CLI за управление."""

import cmd
try:
    from scoring_engine import ScoringEngine
except ImportError:
    # If running from outside the dir
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from scoring_engine import ScoringEngine


class ScoringCLI(cmd.Cmd):
    """Интерактивна конзола за scoring системата."""

    intro = """
╔══════════════════════════════════════════════════╗
║     🎯 SCORING ENGINE - Interactive CLI          ║
║                                                  ║
║  Commands: score, add, penalty, checkpoint,      ║
║            rollback, undo, preview, status,      ║
║            events, rules, help, quit             ║
╚══════════════════════════════════════════════════╝
    """
    prompt = "scoring> "

    def __init__(self):
        super().__init__()
        self.engine = ScoringEngine()

        @self.engine.on_score_change
        def _log(state, event):
            sign = "+" if event.effective_points >= 0 else ""
            print(f"  → {sign}{event.effective_points:.1f} pts "
                  f"({event.source_rule})")

    def do_score(self, arg):
        """Показва текущия score."""
        print(f"\n🏆 Score: {self.engine.get_score():.1f}")
        print(f"📈 Level: {self.engine.get_level()}")
        print(f"🔥 Streak: {self.engine.state.streak}\n")

    def do_add(self, arg):
        """Добавя точки: add <points> [description]"""
        parts = arg.split(maxsplit=1)
        if not parts:
            print("Usage: add <points> [description]")
            return
        try:
            points = float(parts[0])
            desc = parts[1] if len(parts) > 1 else "Manual"
            self.engine.add_points(points, desc)
            print(f"✅ Added {points:.1f} points. Total: {self.engine.get_score():.1f}")
        except ValueError:
            print("Error: points must be a number.")

    def do_task(self, arg):
        """Симулира завършена задача: task [base_points]"""
        try:
            base = float(arg) if arg else 10.0
            events = self.engine.submit_action("task_complete", {
                "base_points": base,
            })
            print(f"✅ Task complete! Generated {len(events)} events.")
        except ValueError:
            print("Error: base_points must be a number.")

    def do_penalty(self, arg):
        """Прилага наказание: penalty <points> [reason]"""
        parts = arg.split(maxsplit=1)
        if not parts:
            print("Usage: penalty <points> [reason]")
            return
        try:
            pts = float(parts[0])
            reason = parts[1] if len(parts) > 1 else "Penalty"
            self.engine.apply_penalty(pts, reason)
            print(f"❌ Penalty: -{pts:.1f}. Total: {self.engine.get_score():.1f}")
        except ValueError:
            print("Error: points must be a number.")

    def do_checkpoint(self, arg):
        """Създава чекпоинт: checkpoint [label] [description]"""
        parts = arg.split(maxsplit=1)
        label = parts[0] if parts else ""
        desc = parts[1] if len(parts) > 1 else ""
        cp = self.engine.save_checkpoint(label=label, description=desc)
        print(f"💾 Checkpoint '{cp.label}' saved (id={cp.id})")

    def do_checkpoints(self, arg):
        """Показва всички чекпоинти."""
        cps = self.engine.list_checkpoints()
        if not cps:
            print("Няма чекпоинти.")
            return
        print(f"\\n{'ID':12s} {'Label':30s} {'Score':>10s} {'Type':5s}")
        print("-" * 60)
        for cp in cps:
            t = "🤖" if cp['auto'] else "👤"
            print(f"{cp['id']:12s} {cp['label']:30s} "
                  f"{cp['score']:>10.1f} {t}")
        print()

    def do_rollback(self, arg):
        """Ролбак: rollback <checkpoint_id | 'last' | число>"""
        if not arg:
            print("Usage: rollback <id | 'last' | N>")
            return

        try:
            if arg == "last":
                record = self.engine.rollback_last("CLI rollback")
            elif arg.isdigit():
                record = self.engine.rollback_steps(
                    int(arg), "CLI rollback N steps"
                )
            else:
                record = self.engine.rollback_to(arg, "CLI rollback")

            print(f"⏪ Rollback OK! Score: {self.engine.get_score():.1f}")
            print(f"   Lost {record.events_discarded} events")
        except Exception as e:
            print(f"❌ Error: {e}")

    def do_preview(self, arg):
        """Preview на ролбак: preview <checkpoint_id>"""
        if not arg:
            print("Usage: preview <checkpoint_id>")
            return
        try:
            diff = self.engine.preview_rollback(arg)
            if not diff:
                print("Няма разлики.")
            for key, info in diff.items():
                print(f"  {key}: {info['current']} → {info['checkpoint']} "
                      f"(Δ={info['delta']})")
        except Exception as e:
            print(f"❌ Error: {e}")

    def do_undo(self, arg):
        """Отменя последния ролбак."""
        if self.engine.undo_rollback():
            print(f"🔄 Undo OK! Score: {self.engine.get_score():.1f}")
        else:
            print("Няма ролбак за отмяна.")

    def do_status(self, arg):
        """Показва пълния статус."""
        status = self.engine.get_status()
        print("\\n📊 STATUS:")
        for k, v in status.items():
            print(f"   {k}: {v}")
        print()

    def do_events(self, arg):
        """Показва последните събития: events [N]"""
        try:
            n = int(arg) if arg else 10
            events = self.engine.get_events_log(n)
            print(f"\\n📜 Last {len(events)} events:")
            for ev in events:
                emoji = "✅" if ev['points'] >= 0 else "❌"
                print(f"  {emoji} {ev['type']:20s} {ev['points']:>+8.1f}  "
                      f"{ev['description'][:40]}")
            print()
        except ValueError:
            print("Error: N must be a number.")

    def do_rules(self, arg):
        """Показва правилата."""
        rules = self.engine.rules.list_rules()
        print(f"\\n📏 Rules ({len(rules)}):")
        for r in rules:
            status = "✅" if r['enabled'] else "❌"
            print(f"  {status} [{r['priority']:3d}] {r['name']:25s} "
                  f"{r['description']}")
        print()

    def do_quit(self, arg):
        """Изход."""
        print("👋 Чао!")
        return True

    do_exit = do_quit
    do_q = do_quit


if __name__ == "__main__":
    ScoringCLI().cmdloop()
