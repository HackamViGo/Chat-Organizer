# BrainBox 2.1.0 - Folder Structure

## Monorepo Architecture (Turborepo + pnpm workspaces)

```
brainbox/
├── apps/                           # Application workspaces
│   ├── dashboard/                  # Next.js Dashboard
│   │   ├── src/                    # App source
│   │   │   ├── app/                # Next.js App Router
│   │   │   ├── components/         # React components
│   │   │   ├── lib/                # Utilities & services
│   │   │   ├── store/              # Zustand stores
│   │   │   └── types/              # TypeScript types
│   │   ├── next.config.js
│   │   └── package.json            # workspace:* deps
│   │
│   └── extension/                  # Chrome Extension (Vite)
│       ├── src/                    # Extension source
│       │   ├── background/         # Service worker
│       │   ├── content/            # Content scripts
│       │   ├── lib/                # normalizers.js, schemas.js
│       │   ├── prompt-inject/      # Prompt injection logic
│       │   └── ui/                 # popup.html, popup.js
│       ├── manifest.json           # MV3 manifest
│       ├── package.json            # workspace:* deps
│       └── vite.config.ts          # CRXJS plugin config
│
├── packages/                       # Shared libraries (The Bridges)
│   ├── database/                   # @brainbox/database
│   │   ├── database.types.ts       # Supabase generated types
│   │   ├── index.ts                # Re-exports
│   │   └── package.json
│   │
│   ├── validation/                 # @brainbox/validation
│   │   ├── src/
│   │   │   ├── index.ts            # Re-exports all schemas
│   │   │   ├── chat.ts             # createChatSchema, updateChatSchema
│   │   │   ├── prompt.ts           # Prompt schemas
│   │   │   └── folder.ts           # Folder schemas
│   │   └── package.json
│   │
│   └── shared/                     # @brainbox/shared
│       ├── src/
│       │   ├── index.ts            # Re-exports
│       │   └── schemas.js          # Extension schemas (legacy)
│       └── package.json
│
├── docs/                           # Documentation ("The Brain")
│   ├── technical/                  # Architecture docs
│   │   ├── CONTEXT_MAP.md          # Dependency diagram
│   │   ├── DATA_SCHEMA.md          # Identity-Locked fields
│   │   ├── FOLDER_STRUCTURE.md     # This file
│   │   └── SYNC_PROTOCOL.md        # Extension <-> Dashboard sync
│   └── user/                       # User-facing docs
│
├── scripts/                        # Build & validation
│   ├── verification.py             # Identity-Lock & CSP checks
│   └── setup-verification-hook.sh  # Pre-commit hook installer
│
├── turbo.json                      # Turborepo config
├── package.json                    # Root package (v2.1.0)
└── pnpm-workspace.yaml             # Workspace definition
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
```

### Verification
```bash
python3 scripts/verification.py --check-all  # Identity-Lock + CSP audit
```

---
**Version**: v.2.1.0-beta
