import os
import shutil
from pathlib import Path

ROOT = Path(".")
DOCS = ROOT / "docs"
ARCHIVE = DOCS / "_ARCHIVE_LEGACY_v2"

# Strict Survivor List (Relative to ROOT)
SURVIVORS_EXACT = {
    "docs/technical/DATA_SCHEMA.md",
    "docs/technical/CONTEXT_MAP.md",
    "docs/technical/SYNC_PROTOCOL.md",
    "docs/technical/ARCHITECTURE.md",
    "docs/technical/UI_STANDARDS.md",
    "docs/project/CONTRIBUTING.md", 
    "docs/technical/CONTRIBUTING.md", # Added for safety as per findings
    "docs/user/Meta_architect_SNAPSHOT.md",
    "docs/user/Meta_Architect_v3.1_Overview.md",
    "docs/ChangeLogs/CHANGELOG_v3.0.md",
}

def is_survivor(path_obj):
    # Normalized relative string
    rel_str = str(path_obj)
    
    if rel_str in SURVIVORS_EXACT:
        return True
        
    # Globs/Directories
    if rel_str.startswith("docs/user/agent_manuals/"):
        return True
    if rel_str.startswith("docs/agents/logs/") and rel_str.endswith(".log"):
        return True
    if rel_str.startswith("docs/_ARCHIVE_LEGACY_v2"):
        return True
        
    return False

def main():
    if not ARCHIVE.exists():
        ARCHIVE.mkdir(parents=True)
        print(f"Created {ARCHIVE}")

    moved_count = 0
    
    for root, dirs, files in os.walk(DOCS):
        # Prevent walking into the archive itself - check absolute or relative path string
        # os.walk root is a string
        if "_ARCHIVE_LEGACY_v2" in root:
            continue
            
        for file in files:
            file_path = Path(root) / file
            
            # Sanity check: ensure we are looking at files inside docs
            try:
                rel_path = file_path.relative_to(ROOT)
            except ValueError:
                continue

            if not is_survivor(rel_path):
                # Calculate destination
                # If file in docs/abc/file.md -> docs/_ARCHIVE_LEGACY_v2/abc/file.md
                try:
                    rel_to_docs = file_path.relative_to(DOCS)
                except ValueError:
                    continue # Should not happen if walking DOCS
                    
                dest_path = ARCHIVE / rel_to_docs
                
                # Check dir
                if not dest_path.parent.exists():
                    dest_path.parent.mkdir(parents=True)
                
                print(f"Archiving: {rel_path}")
                shutil.move(str(file_path), str(dest_path))
                moved_count += 1
                
    print(f"Purge Complete. Archived {moved_count} files.")

if __name__ == "__main__":
    main()
