import fs from 'fs'
import path, { resolve } from 'path'

import { crx } from '@crxjs/vite-plugin'
import { defineConfig, type Plugin } from 'vite'

// Read manifest directly (CRXJS needs JSON object, not import)
import manifest from './manifest.json' with { type: 'json' }

/**
 * stripDevCSP - Production-only plugin.
 * Removes localhost/127.0.0.1 from host_permissions, content_scripts matches,
 * web_accessible_resources matches, CSP strings, and deprecated content scripts
 * (brainbox_master.js) to prevent Chrome Web Store rejections.
 */
function stripDevCSP(): Plugin {
  return {
    name: 'strip-dev-csp',
    apply: 'build',
    closeBundle() {
      const manifestPath = path.resolve(__dirname, 'dist/manifest.json')
      if (!fs.existsSync(manifestPath)) return

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      const isLocalhost = (p: string) => p.includes('localhost') || p.includes('127.0.0.1')
      const isDeprecatedScript = (js: string) => js.includes('brainbox_master')

      // Remove localhost from host_permissions
      if (manifest.host_permissions) {
        manifest.host_permissions = manifest.host_permissions.filter((p: string) => !isLocalhost(p))
      }

      // Remove localhost from content_scripts matches; filter deprecated JS files;
      // drop any content_scripts entries that end up with no matches after filtering.
      if (Array.isArray(manifest.content_scripts)) {
        manifest.content_scripts = manifest.content_scripts
          .map((cs: { matches?: string[]; js?: string[]; [key: string]: unknown }) => ({
            ...cs,
            matches: Array.isArray(cs.matches)
              ? cs.matches.filter((m: string) => !isLocalhost(m))
              : cs.matches,
            js: Array.isArray(cs.js) ? cs.js.filter((j: string) => !isDeprecatedScript(j)) : cs.js,
          }))
          .filter((cs: { matches?: string[] }) =>
            Array.isArray(cs.matches) ? cs.matches.length > 0 : true
          )
      }

      // Remove localhost from web_accessible_resources matches;
      // drop any entries that end up with no matches after filtering.
      if (Array.isArray(manifest.web_accessible_resources)) {
        manifest.web_accessible_resources = manifest.web_accessible_resources
          .map((war: { matches?: string[]; [key: string]: unknown }) => ({
            ...war,
            matches: Array.isArray(war.matches)
              ? war.matches.filter((m: string) => !isLocalhost(m))
              : war.matches,
          }))
          .filter((war: { matches?: string[] }) =>
            Array.isArray(war.matches) ? war.matches.length > 0 : true
          )
      }

      // Remove unsafe-eval and localhost URLs from CSP strings
      if (manifest.content_security_policy) {
        Object.keys(manifest.content_security_policy).forEach((key) => {
          manifest.content_security_policy[key] = manifest.content_security_policy[key]
            .replace(/'unsafe-eval'/g, '')
            .replace(/https?:\/\/localhost[^\s']*/g, '')
            .replace(/https?:\/\/127\.0\.0\.1[^\s']*/g, '')
            .replace(/ws:\/\/localhost[^\s']*/g, '')
            .trim()
        })
      }

      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
      console.log('✓ stripDevCSP: localhost + deprecated scripts removed from production manifest')
    },
  }
}

export default defineConfig({
  plugins: [crx({ manifest }) as any, stripDevCSP()],
  resolve: {
    alias: {
      '@brainbox/shared/schemas': resolve(__dirname, '../../packages/shared/schemas.js'),
      '@brainbox/shared/logic': resolve(__dirname, '../../packages/shared/src/logic'),
      '@brainbox/shared': resolve(__dirname, '../../packages/shared'),
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === 'development',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
      },
    },
  },
  // Dev server config for extension HMR
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
})
