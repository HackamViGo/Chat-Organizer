# BrainBox 2.1.3 - Folder Structure

## Monorepo Architecture (Turborepo + pnpm workspaces)

```
brainbox/
├── apps/                           # Application workspaces
│   ├── dashboard/                  # Next.js Dashboard (v2.1.3)
│   │   ├── src/                    # App source
│   │   │   ├── app/                # Next.js App Router
│   │   │   ├── components/         # React components
│   │   │   ├── lib/                # Utilities & services
│   │   │   ├── store/              # Zustand stores
│   │   │   └── types/              # TypeScript types
│   │   ├── next.config.js
│   │   └── package.json            # @brainbox/dashboard
│   │
│   └── extension/                  # Chrome Extension (Vite + v2.2.0)
│       ├── src/                    # Extension source
│       │   ├── background/         # Service worker
│       │   │   └── modules/        # Modular SW logic (auth, sync, messages)
│       │   │       └── platformAdapters/ # Multi-platform Parsers
│       │   ├── content/            # Content scripts
│       │   ├── lib/                # normalizers.js, config.js, etc.
│       │   ├── prompt-inject/      # Prompt injection logic
│       │   └── ui/                 # popup.html, popup.js, tailwind
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
│   │   ├── schemas/                # Individual schemas (chat, prompt, etc.)
│   │   ├── index.ts                # Main export entry
│   │   └── package.json
│   │
│   └── shared/                     # @brainbox/shared (Logic & Common Types)
│       ├── src/
│       │   ├── logic/              # Shared business logic
│       │   └── types/              # Centralized interface definitions
│       └── package.json
│
├── docs/                           # Documentation ("The Brain")
│   ├── technical/                  # Architecture & Schema docs
│   ├── project/                    # Project status & Specifications
│   └── ChangeLogs/                 # Version history
│
├── scripts/                        # Build, validation & Maintenance
│   └── verification.py             # Identity-Lock & CSP checks
│
├── tests/                          # Centralized E2E and Integration tests
│   ├── chrome-env/                 # Virtual Chrome test environment
│   └── integration/                # API and Sync tests
│
├── meta_architect/                 # Agentic Knowledge & Skills
│   └── resources/
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
**Version**: v2.1.3
