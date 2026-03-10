#!/usr/bin/env python3
"""
ui_auditor.py — BrainBox UI Guardian
Guardian script for enforcing UI_BIBLE compliance in apps/dashboard/src.
Scans for hardcoded colors, missing glass classes, forbidden patterns, dynamic Tailwind strings.

Usage:
    python tools/guardians/ui_auditor.py [--path apps/dashboard/src]

Output:
    Violations logged to tools/guardians/guardians.log
"""

import os
import re
import sys
import json
import argparse
from datetime import datetime
from pathlib import Path

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
SCAN_EXTENSIONS = {".tsx", ".ts", ".css"}

# Hardcoded platform hex colors from UI_BIBLE §2.1
# NOTE: Grok (#e2e8f0, #f8fafc) intentionally excluded — common CSS grays,
# extremely high false-positive rate. Grok theming enforced via code review only.
PLATFORM_HEX_COLORS = [
    "#22c55e", "#4ade80",                         # GPT-4o
    "#f97316", "#fb923c",                          # Claude 3.5
    "#3b82f6", "#60a5fa",                          # Gemini Pro
    "#a855f7", "#c084fc",                          # DeepSeek
    # Grok excluded: #e2e8f0, #f8fafc
    "#06b6d4", "#22d3ee",                          # Perplexity
    "#8b5cf6", "#a78bfa",                          # Qwen
    "#f59e0b", "#fbbf24",                          # LMArena
]

# Lines of context to check around a hex color hit for MODEL_THEMES block
MODEL_THEMES_CONTEXT_WINDOW = 8

# Forbidden Tailwind color classes for platforms (per UI_BIBLE §14)
FORBIDDEN_TAILWIND_PLATFORM_CLASSES = [
    r"bg-orange-\d+", r"text-orange-\d+",          # Claude
    r"bg-green-\d+", r"text-green-\d+",            # GPT (use className is OK, inline not)
    r"bg-blue-\d+", r"text-blue-\d+",              # Gemini in non-token form
    r"bg-purple-\d+", r"text-purple-\d+",          # DeepSeek/Qwen — must use theme
]

# Dynamic Tailwind class patterns — broken in v4
DYNAMIC_TAILWIND_PATTERNS = [
    r'["\`].*\$\{.*\}.*-\d+["\`]',               # `bg-${model}-500`
    r'bg-\$\{', r'text-\$\{', r'border-\$\{',
]

# Forbidden: backdrop-filter inline style
FORBIDDEN_INLINE_BACKDROP = r"style=\{[^}]*backdropFilter"

# Forbidden: console.log (not in logger.ts)
FORBIDDEN_CONSOLE_LOG = r"console\.log\("

# Forbidden: any type
FORBIDDEN_ANY_TYPE = r":\s*any\b"

# Forbidden: h-screen in extension context (check files under apps/extension)
FORBIDDEN_HSCREEN = r"\bh-screen\b"

# Forbidden: @tailwind directive (v3)
FORBIDDEN_TAILWIND_DIRECTIVE = r"@tailwind\s+(base|components|utilities)"

# Missing AnimatePresence: conditional JSX render without AnimatePresence wrapper
MISSING_ANIMATE_PRESENCE_HINT = r"\{.*&&\s*\(\s*<motion\."

# Required glass classes that must exist in globals.css
REQUIRED_GLASS_CLASSES = [".glass-panel", ".glass-card", ".glass-input", ".glass-button"]

# Required CSS variables from UI_BIBLE §2.3
REQUIRED_CSS_VARS = [
    "--color-surface", "--color-surface-alt", "--color-text-primary",
    "--color-text-secondary", "--color-text-muted",
]

# ─────────────────────────────────────────────
# VIOLATION COLLECTOR
# ─────────────────────────────────────────────
violations: list[dict] = []

def add_violation(file: str, line: int, rule: str, snippet: str, severity: str = "ERROR"):
    violations.append({
        "file": file,
        "line": line,
        "rule": rule,
        "snippet": snippet[:120].strip(),
        "severity": severity,
    })

# ─────────────────────────────────────────────
# CHECKS
# ─────────────────────────────────────────────
def check_hardcoded_hex_colors(filepath: str, lines: list[str]):
    """Check for hardcoded platform hex colors.

    Uses a context window (MODEL_THEMES_CONTEXT_WINDOW lines) to exclude colors
    that appear inside MODEL_THEMES / getPlatformTheme definition blocks —
    not just the exact same line (old approach was too narrow).
    """
    for i, line in enumerate(lines, 1):
        for color in PLATFORM_HEX_COLORS:
            if color.lower() not in line.lower():
                continue
            # Skip comment lines
            stripped = line.strip()
            if stripped.startswith("//") or stripped.startswith("*") or stripped.startswith("#"):
                continue
            # Context window: check surrounding lines for definition blocks
            start = max(0, i - 1 - MODEL_THEMES_CONTEXT_WINDOW)
            end = min(len(lines), i + MODEL_THEMES_CONTEXT_WINDOW)
            context = " ".join(lines[start:end])
            if any(kw in context for kw in (
                "MODEL_THEMES", "getPlatformTheme", "PLATFORM_HEX_COLORS",
                "EXTRA_THEMES", "appStore.ts", "ui_auditor",
            )):
                continue
            add_violation(filepath, i, "HARDCODED_PLATFORM_COLOR",
                          f"Found {color} — use getPlatformTheme()", "ERROR")

def check_dynamic_tailwind(filepath: str, lines: list[str]):
    """Check for dynamic Tailwind class construction."""
    for i, line in enumerate(lines, 1):
        for pattern in DYNAMIC_TAILWIND_PATTERNS:
            if re.search(pattern, line):
                add_violation(filepath, i, "DYNAMIC_TAILWIND_CLASS",
                              f"Dynamic Tailwind: {line.strip()[:80]}", "ERROR")

def check_inline_backdrop(filepath: str, lines: list[str]):
    """Check for inline backdropFilter styles (should use glass-card/glass-panel)."""
    for i, line in enumerate(lines, 1):
        if re.search(FORBIDDEN_INLINE_BACKDROP, line):
            add_violation(filepath, i, "INLINE_BACKDROP_FILTER",
                          "Use glass-card or glass-panel instead of inline backdropFilter", "WARNING")

def check_console_log(filepath: str, lines: list[str]):
    """Check for console.log in non-logger files."""
    if "logger.ts" in filepath or "logger.tsx" in filepath:
        return
    for i, line in enumerate(lines, 1):
        if re.search(FORBIDDEN_CONSOLE_LOG, line) and not line.strip().startswith("//"):
            add_violation(filepath, i, "CONSOLE_LOG",
                          "Use logger.ts instead of console.log", "ERROR")

def check_any_types(filepath: str, lines: list[str]):
    """Check for 'any' type usage."""
    if ".css" in filepath:
        return
    for i, line in enumerate(lines, 1):
        if re.search(FORBIDDEN_ANY_TYPE, line) and not line.strip().startswith("//"):
            # Allow in catch blocks with (error: any)
            if "catch" in line and "error: any" in line:
                continue
            add_violation(filepath, i, "ANY_TYPE",
                          "Use 'unknown' + type guard instead of 'any'", "ERROR")

def check_tailwind_directive(filepath: str, lines: list[str]):
    """Check for v3 @tailwind directives."""
    for i, line in enumerate(lines, 1):
        if re.search(FORBIDDEN_TAILWIND_DIRECTIVE, line):
            add_violation(filepath, i, "TAILWIND_V3_DIRECTIVE",
                          "Use @import 'tailwindcss' instead of @tailwind directives", "ERROR")

def check_solid_backgrounds(filepath: str, lines: list[str]):
    """Check for solid dark background classes instead of glass."""
    if ".css" in filepath:
        return
    SOLID_BG_PATTERNS = [
        r'\bbg-slate-[89]00\b', r'\bbg-gray-[89]00\b',
        r'\bbg-zinc-[89]00\b', r'\bbg-neutral-[89]00\b',
    ]
    for i, line in enumerate(lines, 1):
        for pattern in SOLID_BG_PATTERNS:
            if re.search(pattern, line):
                add_violation(filepath, i, "SOLID_BACKGROUND",
                              f"Use glass-card/glass-panel. Solid dark bg: {line.strip()[:80]}", "WARNING")

def check_globals_css(filepath: str, content: str):
    """Check globals.css for required glass classes and CSS variables."""
    for cls in REQUIRED_GLASS_CLASSES:
        if cls not in content:
            add_violation(filepath, 0, "MISSING_GLASS_CLASS",
                          f"Required CSS class '{cls}' not found in globals.css", "ERROR")

    for var in REQUIRED_CSS_VARS:
        if var not in content:
            add_violation(filepath, 0, "MISSING_CSS_VAR",
                          f"Required CSS variable '{var}' not found", "ERROR")

def check_useShallow_zustand(filepath: str, lines: list[str]):
    """Check that Zustand store reads use useShallow."""
    for i, line in enumerate(lines, 1):
        # Pattern: useXxxStore((s) => ({ ... multiple props }))
        # Without useShallow — look for store reads with object destructuring
        if re.search(r'use\w+Store\(state\s*=>', line) or re.search(r'use\w+Store\(s\s*=>', line):
            # Check if previous 3 lines contain useShallow
            prev = " ".join(lines[max(0,i-4):i])
            if "useShallow" not in prev and "=>" in line:
                # Heuristic check: if it returns an object literal
                if re.search(r'=>\s*\{|=>.*,\s*\w+:', line):
                    add_violation(filepath, i, "MISSING_USE_SHALLOW",
                                  "Object destructuring from store — wrap with useShallow()", "WARNING")

def check_getPlatformTheme_exists(filepath: str, lines: list[str]):
    """Verify getPlatformTheme is not locally hardcoded."""
    for i, line in enumerate(lines, 1):
        # If defining MODEL_THEMES inline in a non-store file
        if "MODEL_THEMES" in line and "const MODEL_THEMES" in line:
            if "store" not in filepath.lower() and "theme" not in filepath.lower():
                add_violation(filepath, i, "INLINE_MODEL_THEMES",
                              "MODEL_THEMES should live in shared store, not inline", "WARNING")

# ─────────────────────────────────────────────
# MAIN SCAN
# ─────────────────────────────────────────────

def check_forbidden_tailwind_platform_classes(filepath: str, lines: list[str]):
    """Check for forbidden Tailwind platform color classes (UI_BIBLE §14).

    These must be replaced with getPlatformTheme() inline styles.
    """
    import re as _re
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if stripped.startswith("//") or stripped.startswith("*"):
            continue
        for pattern in FORBIDDEN_TAILWIND_PLATFORM_CLASSES:
            if _re.search(pattern, line):
                # Allow in comments and className with conditional — heuristic
                add_violation(filepath, i, "FORBIDDEN_TAILWIND_PLATFORM_CLASS",
                              f"Use getPlatformTheme() instead of Tailwind color class: {stripped[:80]}",
                              "WARNING")
                break  # one violation per line max


def check_hscreen_usage(filepath: str, lines: list[str]):
    """Check for h-screen usage (forbidden in Extension popup context per UI_BIBLE §14).

    In Dashboard context this is a WARNING, not ERROR — it's only a hard ERROR
    in apps/extension. Flag as WARNING everywhere so developers are aware.
    """
    import re as _re
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if stripped.startswith("//") or stripped.startswith("*"):
            continue
        if _re.search(FORBIDDEN_HSCREEN, line):
            severity = "ERROR" if "extension" in filepath.lower() else "WARNING"
            add_violation(filepath, i, "H_SCREEN_USAGE",
                          f"h-screen forbidden in Extension context (WARNING in Dashboard): {stripped[:80]}",
                          severity)


def check_missing_animate_presence(filepath: str, lines: list[str]):
    """Check for conditional <motion.* renders without AnimatePresence wrapper.

    Pattern: {condition && (<motion. ...)} — needs AnimatePresence for exit animations.
    Checks a small context window to see if AnimatePresence is nearby.
    """
    import re as _re
    CONTEXT = 5
    for i, line in enumerate(lines, 1):
        if _re.search(MISSING_ANIMATE_PRESENCE_HINT, line):
            # Check surrounding lines for AnimatePresence
            start = max(0, i - 1 - CONTEXT)
            end = min(len(lines), i + CONTEXT)
            context = " ".join(lines[start:end])
            if "AnimatePresence" not in context:
                add_violation(filepath, i, "MISSING_ANIMATE_PRESENCE",
                              f"Conditional <motion.*> without AnimatePresence — exit animations won't work: {line.strip()[:80]}",
                              "WARNING")

def scan_file(filepath: str):
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            lines = content.splitlines()
    except Exception as e:
        print(f"  [SKIP] Cannot read {filepath}: {e}")
        return

    ext = Path(filepath).suffix
    fname = Path(filepath).name

    if ext in {".tsx", ".ts"}:
        check_hardcoded_hex_colors(filepath, lines)
        check_dynamic_tailwind(filepath, lines)
        check_forbidden_tailwind_platform_classes(filepath, lines)  # was dead code
        check_inline_backdrop(filepath, lines)
        check_console_log(filepath, lines)
        check_any_types(filepath, lines)
        check_solid_backgrounds(filepath, lines)
        check_hscreen_usage(filepath, lines)                        # was dead code
        check_missing_animate_presence(filepath, lines)             # was dead code
        check_useShallow_zustand(filepath, lines)
        check_getPlatformTheme_exists(filepath, lines)

    if ext == ".css":
        check_tailwind_directive(filepath, lines)
        if fname == "globals.css":
            check_globals_css(filepath, content)

def scan_directory(root: str):
    """Walk directory and scan all matching files."""
    total_files = 0
    for dirpath, dirnames, filenames in os.walk(root):
        # Skip node_modules, .next, dist
        dirnames[:] = [d for d in dirnames if d not in {"node_modules", ".next", "dist", "__pycache__"}]
        for fname in filenames:
            if Path(fname).suffix in SCAN_EXTENSIONS:
                full = os.path.join(dirpath, fname)
                scan_file(full)
                total_files += 1
    return total_files

# ─────────────────────────────────────────────
# REPORT
# ─────────────────────────────────────────────
def write_report(scan_root: str, total_files: int):
    log_path = Path(__file__).parent / "guardians.log"
    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    errors = [v for v in violations if v["severity"] == "ERROR"]
    warnings = [v for v in violations if v["severity"] == "WARNING"]

    report_lines = [
        f"\n{'='*70}",
        f"Date: {now}",
        f"Task: UI Auditor Scan — {scan_root}",
        f"Role: UI_GUARDIAN",
        f"Files scanned: {total_files}",
        f"Violations: {len(errors)} ERRORs, {len(warnings)} WARNINGs",
        f"{'='*70}",
    ]

    if errors:
        report_lines.append("\n## ERRORS")
        for v in errors:
            report_lines.append(f"  [{v['rule']}] {v['file']}:{v['line']}")
            report_lines.append(f"    → {v['snippet']}")

    if warnings:
        report_lines.append("\n## WARNINGS")
        for v in warnings:
            report_lines.append(f"  [{v['rule']}] {v['file']}:{v['line']}")
            report_lines.append(f"    → {v['snippet']}")

    status = "PASS" if not errors else "FAIL"
    report_lines.append(f"\nVerify: ui_auditor scan = {len(violations)} violations")
    report_lines.append(f"Status: {status}\n")

    log_content = "\n".join(report_lines)
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(log_content)

    print(log_content)
    return len(errors)

# ─────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="BrainBox UI Auditor Guardian")
    parser.add_argument("--path", default="apps/dashboard/src",
                        help="Root path to scan (default: apps/dashboard/src)")
    parser.add_argument("--json", action="store_true", help="Output violations as JSON to stdout")
    args = parser.parse_args()

    scan_root = args.path
    if not os.path.exists(scan_root):
        print(f"ERROR: Path '{scan_root}' does not exist.")
        sys.exit(1)

    print(f"[ui_auditor] Scanning: {scan_root}")
    total_files = scan_directory(scan_root)

    if args.json:
        print(json.dumps(violations, indent=2))
    else:
        error_count = write_report(scan_root, total_files)
        sys.exit(0 if error_count == 0 else 1)

if __name__ == "__main__":
    main()
