---
description: 
---

# Workflow: Update Project Version

1. Ask: "What is the new semantic version? (e.g., 3.1.0)"

2. Validate with the script's own regex: ^\d+\.\d+\.\d+(-[a-z0-9.]+)?$
   NOTE: The script allows -suffix (e.g. 3.1.0-beta) but Chrome Web Store
   does NOT accept it in manifest.json. Warn the user if a suffix is provided.

3. Run:
   pnpm tsx .agent/tools/release/version-bump.ts <version>

4. The script updates ALL of these — verify each one:
   ✓ package.json (root)
   ✓ apps/extension/package.json
   ✓ apps/extension_v3/package.json     ← v3 added
   ✓ apps/dashboard/package.json
   ✓ packages/shared/package.json
   ✓ packages/assets/package.json
   ✓ packages/validation/package.json
   ✓ packages/database/package.json
   ✓ apps/extension/manifest.json
   ✓ apps/extension_v3/manifest.json    ← v3 added

5. Verify with:
   grep '"version"' apps/extension/manifest.json
   grep '"version"' apps/extension_v3/manifest.json
   Both must show the new version.

6. Report: "✅ Version bumped to X.Y.Z across all packages and manifests."
   Or list any ⚠️ Skip lines from the output (file not found).