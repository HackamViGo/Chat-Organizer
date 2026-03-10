# sqlite_store.py
"""SQLite backend за persistence."""

import sqlite3
import json
import time
import os
from typing import Optional
from models import Checkpoint, ScoreState, RollbackRecord, EventType


class SQLiteStore:
    """SQLite хранилище за чекпоинти и ролбак история."""

    def __init__(self, db_path: str = None):
        # Default path for BrainBox project
        if db_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            db_path = os.path.join(base_dir, "state", "scoring.db")
            
        self.db_path = db_path
        # Ensure directory exists
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self._create_tables()

    def _create_tables(self):
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS checkpoints (
                id TEXT PRIMARY KEY,
                timestamp REAL NOT NULL,
                label TEXT DEFAULT '',
                description TEXT DEFAULT '',
                state_json TEXT NOT NULL,
                events_json TEXT DEFAULT '[]',
                fingerprint TEXT NOT NULL,
                auto_created INTEGER DEFAULT 0,
                parent_id TEXT DEFAULT '',
                tags_json TEXT DEFAULT '[]'
            );

            CREATE TABLE IF NOT EXISTS rollback_history (
                id TEXT PRIMARY KEY,
                timestamp REAL NOT NULL,
                from_cp TEXT DEFAULT '',
                to_cp TEXT DEFAULT '',
                state_before TEXT NOT NULL,
                state_after TEXT NOT NULL,
                events_discarded INTEGER DEFAULT 0,
                reason TEXT DEFAULT '',
                success INTEGER DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS score_events (
                id TEXT PRIMARY KEY,
                timestamp REAL NOT NULL,
                event_type TEXT NOT NULL,
                description TEXT DEFAULT '',
                points_delta REAL DEFAULT 0,
                multiplier REAL DEFAULT 1,
                effective_points REAL DEFAULT 0,
                source_rule TEXT DEFAULT '',
                metadata_json TEXT DEFAULT '{}'
            );

            CREATE INDEX IF NOT EXISTS idx_cp_timestamp
                ON checkpoints(timestamp);
            CREATE INDEX IF NOT EXISTS idx_cp_label
                ON checkpoints(label);
            CREATE INDEX IF NOT EXISTS idx_events_timestamp
                ON score_events(timestamp);
        """)
        self.conn.commit()

    # ─── Checkpoints ──────────────────────────

    def save_checkpoint(self, cp: Checkpoint) -> None:
        def default_serializer(obj):
            if hasattr(obj, 'name'):
                return obj.name
            return str(obj)

        self.conn.execute("""
            INSERT OR REPLACE INTO checkpoints
            (id, timestamp, label, description, state_json,
             events_json, fingerprint, auto_created, parent_id, tags_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            cp.id, cp.timestamp, cp.label, cp.description,
            json.dumps(cp.state.to_dict()),
            json.dumps(cp.events_snapshot, default=default_serializer),
            cp.state_fingerprint,
            int(cp.auto_created),
            cp.parent_checkpoint_id,
            json.dumps(cp.tags),
        ))
        self.conn.commit()

    def load_checkpoint(self, cp_id: str) -> Optional[Checkpoint]:
        row = self.conn.execute(
            "SELECT * FROM checkpoints WHERE id = ?", (cp_id,)
        ).fetchone()
        if row is None:
            return None
        return self._row_to_checkpoint(row)

    def load_all_checkpoints(self) -> list[Checkpoint]:
        rows = self.conn.execute(
            "SELECT * FROM checkpoints ORDER BY timestamp"
        ).fetchall()
        return [self._row_to_checkpoint(r) for r in rows]

    def delete_checkpoint(self, cp_id: str) -> bool:
        cur = self.conn.execute(
            "DELETE FROM checkpoints WHERE id = ?", (cp_id,)
        )
        self.conn.commit()
        return cur.rowcount > 0

    def cleanup_old(self, keep_last: int = 20) -> int:
        """Изтрива стари автоматични чекпоинти."""
        cur = self.conn.execute("""
            DELETE FROM checkpoints
            WHERE auto_created = 1
              AND id NOT IN (
                SELECT id FROM checkpoints
                WHERE auto_created = 1
                ORDER BY timestamp DESC
                LIMIT ?
              )
        """, (keep_last,))
        self.conn.commit()
        return cur.rowcount

    # ─── Rollback History ─────────────────────

    def save_rollback(self, record: RollbackRecord) -> None:
        self.conn.execute("""
            INSERT INTO rollback_history
            (id, timestamp, from_cp, to_cp, state_before,
             state_after, events_discarded, reason, success)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            record.id, record.timestamp,
            record.from_checkpoint_id, record.to_checkpoint_id,
            json.dumps(record.state_before),
            json.dumps(record.state_after),
            record.events_discarded,
            record.reason, int(record.success),
        ))
        self.conn.commit()

    def load_rollback_history(self) -> list[dict]:
        rows = self.conn.execute(
            "SELECT * FROM rollback_history ORDER BY timestamp"
        ).fetchall()
        return [dict(r) for r in rows]

    # ─── Score Events ─────────────────────────

    def save_event(self, event) -> None:
        self.conn.execute("""
            INSERT INTO score_events
            (id, timestamp, event_type, description, points_delta,
             multiplier, effective_points, source_rule, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            event.id, event.timestamp, event.event_type.name,
            event.description, event.points_delta,
            event.multiplier, event.effective_points,
            event.source_rule, json.dumps(event.metadata),
        ))
        self.conn.commit()

    def get_events_between(
        self, start: float, end: float
    ) -> list[dict]:
        rows = self.conn.execute("""
            SELECT * FROM score_events
            WHERE timestamp BETWEEN ? AND ?
            ORDER BY timestamp
        """, (start, end)).fetchall()
        return [dict(r) for r in rows]

    def get_score_at(self, timestamp: float) -> float:
        """Изчислява score-а към определен момент."""
        row = self.conn.execute("""
            SELECT COALESCE(SUM(effective_points), 0) as total
            FROM score_events
            WHERE timestamp <= ?
        """, (timestamp,)).fetchone()
        return row['total'] if row else 0.0

    # ─── Analytics ────────────────────────────

    def get_stats(self) -> dict:
        """Обобщена статистика."""
        return {
            "total_checkpoints": self.conn.execute(
                "SELECT COUNT(*) FROM checkpoints"
            ).fetchone()[0],
            "auto_checkpoints": self.conn.execute(
                "SELECT COUNT(*) FROM checkpoints WHERE auto_created=1"
            ).fetchone()[0],
            "manual_checkpoints": self.conn.execute(
                "SELECT COUNT(*) FROM checkpoints WHERE auto_created=0"
            ).fetchone()[0],
            "total_rollbacks": self.conn.execute(
                "SELECT COUNT(*) FROM rollback_history"
            ).fetchone()[0],
            "total_events": self.conn.execute(
                "SELECT COUNT(*) FROM score_events"
            ).fetchone()[0],
            "total_score": self.conn.execute(
                "SELECT COALESCE(SUM(effective_points),0) FROM score_events"
            ).fetchone()[0],
        }

    # ─── Helpers ──────────────────────────────

    def _row_to_checkpoint(self, row) -> Checkpoint:
        return Checkpoint(
            id=row['id'],
            timestamp=row['timestamp'],
            label=row['label'],
            description=row['description'],
            state=ScoreState.from_dict(json.loads(row['state_json'])),
            events_snapshot=json.loads(row['events_json']),
            state_fingerprint=row['fingerprint'],
            auto_created=bool(row['auto_created']),
            parent_checkpoint_id=row['parent_id'],
            tags=json.loads(row['tags_json']),
        )

    def close(self):
        self.conn.close()
