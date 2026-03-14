/* eslint-disable no-console */
import fs from 'fs'
import path from 'path'

/**
 * BrainBox Version Sync Utility
 *
 * Synchronizes versions across all monorepo package.json files
 * and the Chrome Extension manifest.json.
 */

const newVersion = process.argv[2]

if (!newVersion) {
  console.error('❌ Error: Missing version argument.')
  console.debug('Usage: pnpm tsx tools/version-bump.ts <version>')
  process.exit(1)
}

// SemVer Regex validation
const semverRegex = /^\d+\.\d+\.\d+(-[a-z0-9.]+)?$/i
if (!semverRegex.test(newVersion)) {
  console.error(`❌ Error: Invalid version format "${newVersion}". Use SemVer (e.g., 3.1.0).`)
  process.exit(1)
}

const rootDir = process.cwd()

// Define targets
const packageJsonFiles = [
  'package.json',
  'apps/extension/package.json',
  'apps/extension_v3/package.json',
  'apps/dashboard/package.json',
  'packages/shared/package.json',
  'packages/assets/package.json',
  'packages/validation/package.json',
  'packages/database/package.json',
]

const manifestPaths = [
  'apps/extension/manifest.json',
  'apps/extension_v3/manifest.json',
]

console.debug(`🚀 Starting version sync to v${newVersion}...`)

// 1. Update package.json files
packageJsonFiles.forEach((relPath) => {
  const fullPath = path.resolve(rootDir, relPath)

  if (fs.existsSync(fullPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'))
      const oldVersion = data.version
      data.version = newVersion

      // Safety check for workspace:* dependencies
      // (This script only touches the top-level version field)

      fs.writeFileSync(fullPath, JSON.stringify(data, null, 2) + '\n')
      console.debug(`✅ ${relPath.padEnd(30)} : ${oldVersion} -> ${newVersion}`)
    } catch (err) {
      console.error(`❌ Failed to update ${relPath}:`, err)
    }
  } else {
    console.warn(`⚠️  Skip: ${relPath} (Not found)`)
  }
})

// 2. Update Extension manifest.json files (extension + extension_v3)
manifestPaths.forEach((manifestPath) => {
  const fullManifestPath = path.resolve(rootDir, manifestPath)
  if (fs.existsSync(fullManifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(fullManifestPath, 'utf-8'))
      const oldVersion = manifest.version
      manifest.version = newVersion

      fs.writeFileSync(fullManifestPath, JSON.stringify(manifest, null, 2) + '\n')
      console.debug(`✅ ${manifestPath.padEnd(35)} : ${oldVersion} -> ${newVersion}`)
    } catch (err) {
      console.error(`❌ Failed to update manifest ${manifestPath}:`, err)
    }
  } else {
    console.warn(`⚠️  Skip: ${manifestPath} (Not found)`)
  }
})

console.debug('\n✨ Version synchronization complete.')