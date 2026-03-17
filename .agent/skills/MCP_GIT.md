# Skill: MCP Git — Version Control

## Purpose
Manage git operations for safe development and rollback capability.

## Available Operations
```
git_status()              → Current changes (staged, unstaged)
git_diff(file?)           → Show changes in file or all
git_log(count?)           → Recent commit history
git_commit(message)       → Stage all + commit
git_branch(name?)         → Create or list branches
git_checkout(branch)      → Switch branch
git_stash()               → Stash current changes
git_stash_pop()           → Restore stashed changes
```

## BrainBox Git Protocol

### Branch Strategy
```
main              ← Production (protected)
dev                ← Integration branch
feature/ext-v3     ← Extension v3 rebuild
feature/ext-v3-gemini  ← Platform-specific work
hotfix/auth-fix    ← Emergency fixes
```

### Commit Convention
```
Format: type(scope): description

Types:
  feat     → New feature
  fix      → Bug fix
  refactor → Code restructuring
  docs     → Documentation only
  test     → Tests only
  chore    → Build, config, tooling

Scopes:
  ext      → Extension (apps/extension_v3)
  dash     → Dashboard (apps/dashboard)
  shared   → Shared package
  agent    → Agent system

Examples:
  feat(ext): add Gemini adapter with batchexecute support
  fix(ext): handle expired Gemini dynamic key
  test(ext): add normalizer unit tests for all platforms
  docs(agent): update CHROME_EXTENSION skill
  refactor(ext): extract token capture into generic method
```

### When to Commit
```
✅ After completing a Phase (phase0, phase1, etc.)
✅ After adding a new platform adapter
✅ After fixing a bug that was blocking
✅ Before any risky refactoring

❌ Don't commit broken code
❌ Don't commit with failing tests
❌ Don't commit .env or secrets
```

### Pre-Commit Checklist
```
Before every commit:
  1. pnpm test (all tests pass?)
  2. pnpm tsc --noEmit (no TypeScript errors?)
  3. Check git diff (no unintended changes?)
  4. Check no secrets in diff (grep for API keys, tokens)
  5. Commit message follows convention?
```

### Tags
```
Use tags for milestones:
  git tag legacy-freeze-v2.2.0    ← Before v3 rebuild
  git tag ext-v3-phase0           ← After scaffold
  git tag ext-v3-phase1-gemini    ← After Gemini works
  git tag ext-v3-all-platforms    ← After all 8 platforms
  git tag ext-v3-tested           ← After tests pass
```

### Emergency Rollback
```
If something breaks badly:
  1. git stash (save current work)
  2. git log --oneline -10 (find last good commit)
  3. git checkout <commit-hash> -- apps/extension_v3/ (restore files)
  4. pnpm test (verify)
  5. git commit -m "fix(ext): rollback to last working state"
```
