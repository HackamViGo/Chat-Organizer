# Skill: MCP Shell — Terminal Commands

## Purpose
Execute build, test, and development commands.

## Available Operations
```
run_command(command, cwd?)  → Execute shell command
                              Returns stdout, stderr, exit code
```

## BrainBox Commands

### Development
```bash
# Start extension dev server
cd apps/extension_v3 && pnpm dev

# Start dashboard dev server
cd apps/dashboard && pnpm dev

# Start both (from root)
pnpm dev --filter=@brainbox/extension --filter=@brainbox/dashboard
```

### Build
```bash
# Build extension
cd apps/extension_v3 && pnpm build

# Build all
pnpm build

# Build specific
pnpm build --filter=@brainbox/extension
```

### Testing
```bash
# Run all tests
cd apps/extension_v3 && pnpm test

# Run specific test file
cd apps/extension_v3 && pnpm test -- --run src/__tests__/unit/normalizers.test.ts

# Watch mode
cd apps/extension_v3 && pnpm test:watch

# Coverage
cd apps/extension_v3 && pnpm test:coverage

# E2E (requires build first)
cd apps/extension_v3 && pnpm build && pnpm test:e2e
```

### Type Checking
```bash
# Check TypeScript errors without building
cd apps/extension_v3 && pnpm tsc --noEmit

# Check all packages
pnpm -r tsc --noEmit
```

### Dependencies
```bash
# Install all
pnpm install

# Add dependency to extension
cd apps/extension_v3 && pnpm add <package>

# Add dev dependency
cd apps/extension_v3 && pnpm add -D <package>

# Update shared package
cd packages/shared && pnpm version patch
```

### Monorepo
```bash
# List all workspaces
pnpm ls --depth 0

# Run command in specific workspace
pnpm --filter=@brainbox/extension dev
pnpm --filter=@brainbox/shared build
```

### Automation Scripts
```bash
# Phase scripts
python docs/user/New_EXT/phase0_setup.py
python docs/user/New_EXT/phase1_gemini.py
python docs/user/New_EXT/phase2_8_platforms.py
python docs/user/New_EXT/phase9_tests.py
python docs/user/New_EXT/verify.py

# Agent system
python .agent/tools/graph.py
pnpm agent:checkpoint
pnpm agent:rollback
```

## Error Handling
```
If command fails:
  1. Read stderr carefully
  2. Common fixes:
     - "Module not found" → pnpm install
     - "TypeScript error" → fix the type issue
     - "Port in use" → kill process or change port
     - "Permission denied" → check file permissions
  3. If build fails → check vite.config.ts and tsconfig.json
  4. If tests fail → read assertion error, fix logic
```

## Safety Rules
```
NEVER run:
  ❌ rm -rf without explicit user confirmation
  ❌ git push --force
  ❌ npm install (use pnpm only)
  ❌ Commands that modify files outside project root
  ❌ Commands that expose secrets (echo $API_KEY)

ALWAYS:
  ✅ Run from correct directory (cwd parameter)
  ✅ Check exit code before proceeding
  ✅ Read stderr even on success (may contain warnings)
```
