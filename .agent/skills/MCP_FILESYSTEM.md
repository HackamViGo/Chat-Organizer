# Skill: MCP Filesystem — File Operations

## Purpose
Read, write, and navigate project files without shell commands.

## Available Operations
```
read_file(path)           → Read file content
write_file(path, content) → Create or overwrite file
edit_file(path, edits)    → Apply targeted edits
list_directory(path)      → List files and folders
search_files(pattern)     → Search by filename or content
get_file_info(path)       → Size, modified date, etc.
```

## BrainBox Project Paths
```
Root: /home/stefanov/Projects/In Progress/Chat Organizer Cursor/

Extension v3:     apps/extension_v3/src/
Legacy Extension: apps/extension/src/          ← READ ONLY
Dashboard:        apps/dashboard/src/
Shared Package:   packages/shared/src/
Agent System:     .agent/
Documentation:    docs/user/New_EXT/
```

## File Operation Rules

### Before Writing
```
ALWAYS:
  ✅ Read the file first if it exists (avoid overwriting unintentionally)
  ✅ Check the file ownership in .agent/rules/01_CRITICAL.yml
  ✅ Verify the path is within your role's scope

NEVER:
  ❌ Write to apps/extension/ (LEGACY — READ ONLY)
  ❌ Write to .agent/rules/ without ARCHITECT approval
  ❌ Create files outside your role's ownership scope
  ❌ Delete files without explicit user instruction
```

### Path Conventions
```
Imports:   Use @/ prefix    → @/lib/config (resolves to src/lib/config)
           Use @brainbox/   → @brainbox/shared (resolves to packages/shared)

Files:     TypeScript only  → .ts, .tsx (no .js in source)
           Tests:           → *.test.ts, *.spec.ts
           Config:          → *.config.ts (not .js)
```

### Common Operations

#### Read before modify
```
1. read_file("apps/extension_v3/src/manifest.json")
2. Parse content
3. Apply changes
4. write_file("apps/extension_v3/src/manifest.json", updatedContent)
```

#### Search for usage
```
search_files("getConversation")
→ Find all files that reference this function
→ Understand impact before refactoring
```

#### Check file exists
```
get_file_info("apps/extension_v3/src/lib/normalizers.ts")
→ If error → file doesn't exist → safe to create
→ If exists → read first, then modify
```

## Batch Operations
```
When creating multiple files (e.g., new platform adapter):
  1. Create all files in dependency order:
     a. lib/normalizers.ts (add normalize function)
     b. background/modules/platformAdapters/new.adapter.ts
     c. background/modules/platformAdapters/index.ts (update registry)
     d. content/new-bridge.ts
     e. manifest.json (add content_script entry)
  2. Verify imports resolve:
     read_file each file → check import paths
```
