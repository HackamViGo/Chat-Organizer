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
│   │   └── package.json            # @brainbox/dashboard
│   │
│   └── extension/                  # Chrome Extension (Vite)
│       ├── src/                    # Extension source
│       │   ├── background/         # Service worker
│       │   │   └── modules/        # Modular service worker logic
│       │   ├── content/            # Content scripts
│       │   ├── lib/                # normalizers.js, config.js, etc.
│       │   ├── prompt-inject/      # Prompt injection logic
│       │   └── ui/                 # popup.html, popup.js
│       ├── manifest.json           # MV3 manifest
│       ├── package.json            # @brainbox/extension
│       └── vite.config.ts          # CRXJS plugin config
│
├── packages/                       # Shared libraries (The Bridges)
│   ├── database/                   # @brainbox/database (Supabase types)
│   │   ├── database.types.ts
│   │   └── package.json
│   │
│   ├── validation/                 # @brainbox/validation (Zod schemas)
│   │   ├── src/
│   │   │   └── index.ts            # Re-exports (chat, prompt, folder)
│   │   └── package.json
│   │
│   └── shared/                     # @brainbox/shared (Logic & Common Types)
│       ├── src/
│       │   ├── logic/              # Shared business logic
│       │   └── types/              # Centralized interface definitions
│       └── package.json
│
├── docs/                           # Documentation ("The Brain")
│   ├── technical/                  # Architecture docs
│   └── user/                       # User-facing docs
│
├── scripts/                        # Build & validation
│   └── verification.py             # Identity-Lock & CSP checks
│
├── turbo.json                      # Turborepo config
├── package.json                    # Root package (v2.1.3)
└── pnpm-workspace.yaml             # Workspace definition
```

## Key Migration Changes

### Path Aliases
- **Dashboard**: `@/*` (dashboard-only) + `@brainbox/*` (shared packages)
- **Extension**: `@brainbox/shared`, `@brainbox/validation` (workspace aliases)

### Build Commands
```bash
# Monorepo orchestration
pnpm turbo dev              # Run all apps in dev mode
pnpm turbo build            # Build all apps

# Individual apps
pnpm dev:dashboard          # Start dashboard dev server
pnpm build:extension        # Build extension
```

### Verification
```bash
python3 scripts/verification.py --check-all  # Identity-Lock + CSP audit
```

---
**Version**: v.2.1.0-beta
