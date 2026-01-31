# BrainBox 2.1.0 - Folder Structure

## Monorepo Architecture (Turborepo + pnpm workspaces)

```
brainbox/
├── apps/                           # Application workspaces
│   ├── dashboard/                  # Next.js Dashboard
│   │   ├── src/                    # App source (copied from root src/)
│   │   │   ├── app/                # Next.js App Router
│   │   │   ├── components/         # React components
│   │   │   ├── lib/                # Utilities & services
│   │   │   ├── store/              # Zustand stores
│   │   │   └── types/              # TypeScript types
│   │   ├── next.config.js
│   │   ├── package.json            # workspace:* deps
│   │   ├── postcss.config.js
│   │   └── tsconfig.json           # @/* and @brainbox/* aliases
│   │
│   └── extension/                  # Chrome Extension (Vite + CRXJS)
│       ├── src/                    # Extension source (copied from extension/)
│       │   ├── background/         # Service worker
│       │   ├── content/            # Content scripts
│       │   ├── lib/                # normalizers.js, schemas.js
│       │   ├── prompt-inject/      # Prompt injection logic
│       │   ├── ui/                 # popup.html, popup.js
│       │   └── icons/              # Extension icons
│       ├── manifest.json           # MV3 manifest (src/ prefixes)
│       ├── package.json            # workspace:* deps
│       ├── tsconfig.json           # @brainbox/shared aliases
│       └── vite.config.ts          # CRXJS plugin config
│
├── packages/                       # Shared libraries
│   ├── database/                   # @brainbox/database
│   │   ├── database.types.ts       # Supabase generated types
│   │   ├── index.ts                # Re-exports
│   │   └── package.json
│   │
│   ├── validation/                 # @brainbox/validation
│   │   ├── schemas/                # Zod schemas
│   │   │   ├── chat.ts             # createChatSchema, updateChatSchema
│   │   │   ├── prompt.ts           # Prompt schemas
│   │   │   ├── folder.ts           # Folder schemas
│   │   │   └── list.ts             # List schemas
│   │   ├── index.ts                # Re-exports all schemas
│   │   └── package.json
│   │
│   └── shared/                     # @brainbox/shared
│       ├── schemas.js              # Extension schemas (legacy)
│       ├── index.js                # Re-exports
│       └── package.json
│
├── docs/                           # Documentation
│   ├── agents/                     # AI agent specs
│   ├── technical/                  # Architecture docs
│   │   ├── CONTEXT_MAP.md          # Dependency diagram
│   │   ├── DATA_SCHEMA.md          # Identity-Locked fields
│   │   ├── FOLDER_STRUCTURE.md     # This file
│   │   ├── SYNC_PROTOCOL.md        # Extension <-> Dashboard sync
│   │   └── UI_STANDARDS.md         # Design tokens
│   └── user/                       # User-facing docs
│
├── scripts/                        # Build & validation
│   ├── pre-migration/              # Migration audit scripts
│   ├── verification.py             # Identity-Lock & CSP checks
│   └── setup-verification-hook.sh  # Pre-commit hook installer
│
├── tests/                          # Test suites
│   ├── chrome-env/                 # Extension testing utilities
│   ├── database/                   # RLS checks
│   ├── e2e/                        # Playwright tests
│   └── unit/                       # Schema validation tests
│
├── extension/                      # ⚠️ Legacy (to be deprecated)
│   └── [Original extension files]
│
├── src/                            # ⚠️ Legacy (to be deprecated)
│   └── [Original Next.js app]
│
├── pnpm-workspace.yaml             # Workspace definition
├── turbo.json                      # Turborepo config
├── package.json                    # Root package (v2.1.0)
├── tsconfig.json                   # Root TypeScript config
└── README.md
```

## Key Migration Changes

### Path Aliases
- **Dashboard**: `@/*` (dashboard-only) + `@brainbox/*` (shared packages)
- **Extension**: `@brainbox/shared` (workspace alias)

### Build Commands
```bash
# Monorepo orchestration
pnpm turbo dev              # Run all apps in dev mode
pnpm turbo build            # Build all apps

# Individual apps
pnpm turbo dev --filter=@brainbox/dashboard
pnpm turbo build --filter=@brainbox/extension

# Legacy (fallback)
pnpm legacy:dev             # Next.js dev from root
```

### Verification
```bash
python3 scripts/verification.py --check-all  # Identity-Lock + CSP audit
pnpm verify                                  # Alias for above
```

## File Count
- **65 directories**
- **134 files** (excluding node_modules, .next, dist)

---
*Last updated: 2026-01-31 - Monorepo Migration V2.1.0*
