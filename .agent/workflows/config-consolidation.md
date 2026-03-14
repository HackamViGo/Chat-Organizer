---
description: 
---

# BrainBox — Config Consolidation

Fix all config mismatches found in the compatibility audit.
Apply in the exact order listed. Do NOT skip steps.

## Step 1 — Critical popup fixes (from extension_v3 audit)

1a. Install React Vite plugin:
```
pnpm --filter apps/extension_v3 add -D @vitejs/plugin-react
```

1b. Update vite.config.ts:
- Import react from '@vitejs/plugin-react'
- Add react() BEFORE crx({ manifest }) in plugins array
- Remove the entire build.rollupOptions.input block
- Add define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version) }

1c. Update manifest.json:
- Remove "webRequest" from permissions (not used in Phase 1)
- Add web_accessible_resources block for gemini-main-bridge.js

1d. Fix useAuth.ts:
- Change action: 'syncAll' → action: 'getAuthStatus'
- Change response check: response?.authenticated instead of response?.success && response?.isValid

## Step 2 — Delete dead files

Delete these files (verify no imports remain first):
- apps/dashboard/tailwind.config.ts (dead in Tailwind v4 CSS-first)
- .eslintrc.json (ignored by ESLint 9+ flat config)

Before deleting tailwind.config.ts run:
grep -r "tailwind.config" apps/dashboard/src

Before deleting .eslintrc.json run:
grep -r ".eslintrc" . --include="*.json" --include="*.js"

## Step 3 — Fix apps/dashboard/postcss.config.js

Install autoprefixer:
```
pnpm --filter apps/dashboard add -D autoprefixer
```

Rewrite file as ESM with autoprefixer:
```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  }
}
```

## Step 4 — Consolidate logger

4a. Update apps/extension_v3/src/shared/logger.ts to structured signature:
```ts
export const logger = {
  info: (area: string, msg: string, data?: unknown) => { ... },
  warn: (area: string, msg: string, data?: unknown) => { ... },
  error: (area: string, msg: string, data?: unknown) => { ... }
}
```

4b. Delete apps/extension_v3/src/lib/logger.ts

4c. Find all imports of lib/logger in extension_v3:
grep -r "lib/logger" apps/extension_v3/src
Update each to import from shared/logger with correct relative path.

## Step 5 — Consolidate config/URLs

5a. Move config to shared:
- Create apps/extension_v3/src/shared/config.ts
- DASHBOARD_URL: import.meta.env.VITE_DASHBOARD_URL ?? 'https://app.brainbox.app'
- VERSION: __APP_VERSION__

5b. Update dashboard-api.ts:
- Remove local DASHBOARD_BASE_URL constant
- Import CONFIG from '../shared/config'
- Use CONFIG.DASHBOARD_URL

5c. Update all popup files importing from lib/config:
grep -r "lib/config" apps/extension_v3/src
Change each to: from '../../shared/config' (adjust relative path)

5d. Delete apps/extension_v3/src/lib/config.ts

## Step 6 — Fix TypeScript inheritance

6a. Update packages/config/tsconfig.base.json:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  }
}
```

6b. Update apps/extension_v3/tsconfig.json:
```json
{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["chrome", "vite/client"],
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

6c. Update apps/extension/tsconfig.json:
```json
{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["chrome", "vite/client", "node"],
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

6d. Add comment to root tsconfig.json:
```json
{
  "_comment": "Next.js specific. Dashboard extends this. Extensions extend packages/config/tsconfig.base.json instead.",
  ...
}
```

## Step 7 — Move dashboard deps to devDependencies

In apps/extension_v3/package.json move to devDependencies:
- @brainbox/shared: "workspace:*"
- @brainbox/ui: "workspace:*"
- react: "^18.3.1"
- react-dom: "^18.3.1"

Leave dependencies: {}

Run: pnpm install

## Step 8 — Clean up dashboard globals.css

8a. Search for all usages of glass-morphism:
grep -r "glass-morphism" apps/dashboard/src --include="*.tsx"

8b. Replace each usage with glass-card

8c. Delete the .glass-morphism CSS class from globals.css
Keep .glass-card

## Step 9 — Verify ALL

Run in sequence:
```
pnpm --filter apps/extension_v3 type-check
pnpm --filter apps/extension type-check
pnpm --filter apps/dashboard type-check
pnpm lint
pnpm --filter apps/extension_v3 build
pnpm --filter apps/dashboard build
```

Then manual checks:
grep -r "tailwind.config" apps/dashboard/src   → must return nothing
grep -r "lib/logger" apps/extension_v3/src     → must return nothing
grep -r "lib/config" apps/extension_v3/src     → must return nothing
grep -r "glass-morphism" apps/dashboard/src    → must return nothing
grep -r "syncAll" apps/extension_v3/src        → must return nothing

All must pass with 0 errors before marking this workflow complete.
