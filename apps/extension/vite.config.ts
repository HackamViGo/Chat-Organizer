import { defineConfig, type Plugin } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';

// Read manifest directly (CRXJS needs JSON object, not import)
import manifest from './manifest.json' with { type: 'json' };

/**
 * stripDevCSP - Production-only plugin.
 * Removes localhost/127.0.0.1 from host_permissions and CSP
 * to prevent Chrome Web Store rejections.
 */
function stripDevCSP(): Plugin {
  return {
    name: 'strip-dev-csp',
    apply: 'build',
    closeBundle() {
      const manifestPath = path.resolve(__dirname, 'dist/manifest.json');
      if (!fs.existsSync(manifestPath)) return;

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      // Remove localhost from host_permissions
      if (manifest.host_permissions) {
        manifest.host_permissions = manifest.host_permissions.filter(
          (p: string) => !p.includes('localhost') && !p.includes('127.0.0.1')
        );
      }

      // Remove unsafe-eval and localhost URLs from CSP
      if (manifest.content_security_policy) {
        Object.keys(manifest.content_security_policy).forEach(key => {
          manifest.content_security_policy[key] = manifest.content_security_policy[key]
            .replace(/'unsafe-eval'/g, '')
            .replace(/https?:\/\/localhost[^\s']*/g, '')
            .replace(/https?:\/\/127\.0\.0\.1[^\s']*/g, '')
            .replace(/ws:\/\/localhost[^\s']*/g, '')
            .trim();
        });
      }

      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log('✓ stripDevCSP: localhost removed from production manifest');
    }
  };
}

export default defineConfig({
  plugins: [
    crx({ manifest }) as any,
    stripDevCSP(),
  ],
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
});
