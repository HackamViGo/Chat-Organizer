#!/usr/bin/env python3
import sys
import os
import argparse
import json
import time

# Add scoring tool to path
sys.path.append(os.path.join(os.path.dirname(__file__), "scoring"))

try:
    from scoring_engine import ScoringEngine
except ImportError:
    # Fallback if needed
    print("Warning: Scoring engine not found in .agent/tools/scoring/")
    class ScoringEngine:
        def __init__(self, **kwargs): pass
        def save_checkpoint(self, label, description, tags): 
            print(f"Dummy checkpoint: {label} - {description}")
            return type('obj', (object,), {'id': 'dummy-123', 'label': label})

def cmd_checkpoint(args):
    """Handles agent:checkpoint command."""
    engine = ScoringEngine()
    label = f"{args.role}_{args.description.replace(' ', '_')}"
    cp = engine.save_checkpoint(
        label=label,
        description=args.description,
        tags=["manual", args.role]
    )
    print(f"✅ Checkpoint created for {args.role}: {cp.label} (ID: {cp.id})")

def cmd_rollback(args):
    """Handles agent:rollback command."""
    engine = ScoringEngine()
    try:
        record = engine.rollback_to(args.checkpoint_id, reason=f"Manual rollback by user")
        print(f"⏪ Rollback successful to {args.checkpoint_id}")
    except Exception as e:
        print(f"❌ Rollback failed: {e}")

def cmd_report_task(args):
    """Handles agent:report-task command."""
    engine = ScoringEngine()
    # Simulate a task action
    events = engine.submit_action("task_complete", {
        "role": args.role,
        "description": args.description,
        "difficulty": args.difficulty,
    })
    
    total_earned = sum(e.effective_points for e in events)
    print(f"🎉 Task Reported: {args.description}")
    print(f"💰 Points Earned: +{total_earned:.1f}")
    print(f"🏆 Total Score: {engine.get_score():.1f} (Level {engine.get_level()})")

def main():
    parser = argparse.ArgumentParser(description="BrainBox Agent CLI")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Checkpoint command: pnpm agent:checkpoint <ROLE> <DESC>
    cp_parser = subparsers.add_parser("checkpoint", help="Create a checkpoint")
    cp_parser.add_argument("role", help="Agent role (e.g. BACKEND)")
    cp_parser.add_argument("description", help="Description of the checkpoint")

    # Rollback command: pnpm agent:rollback <ID>
    rb_parser = subparsers.add_parser("rollback", help="Rollback to a checkpoint")
    rb_parser.add_argument("checkpoint_id", help="Checkpoint ID to rollback to")

    # Report task command: pnpm agent:report-task <ROLE> <DESC> [--difficulty N]
    rt_parser = subparsers.add_parser("report-task", help="Report a completed task")
    rt_parser.add_argument("role", help="Agent role")
    rt_parser.add_argument("description", help="Task description")
    rt_parser.add_argument("--difficulty", type=int, default=1, help="Task difficulty (1-5)")

    args = parser.parse_args()

    if args.command == "checkpoint":
        cmd_checkpoint(args)
    elif args.command == "rollback":
        cmd_rollback(args)
    elif args.command == "report-task":
        cmd_report_task(args)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
