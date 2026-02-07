import { defineConfig, loadEnv } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';
import fs from 'fs';

// Read manifest and inject environment variables
const manifestCallback = (env: Record<string, string>) => {
  const manifestRaw = fs.readFileSync(resolve(__dirname, 'manifest.json'), 'utf-8');
  const dashboardUrl = env.VITE_DASHBOARD_URL || 'http://localhost:3000';
  const manifestStr = manifestRaw.replace(/__DASHBOARD_URL__/g, dashboardUrl);
  return JSON.parse(manifestStr);
};

// Custom plugin to strip Dev CSP in production
const stripDevCSP = () => {
  return {
    name: 'stripDevCSP',
    writeBundle() {
      const outDir = resolve(__dirname, 'dist');
      const manifestPath = resolve(outDir, 'manifest.json');
      
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        
        if (manifest.content_security_policy?.extension_pages) {
          // Remove localhost dev server and dev dashboard origins
          manifest.content_security_policy.extension_pages = manifest.content_security_policy.extension_pages
            .replace(/\s*ws:\/\/localhost:\d+/g, '')
            .replace(/\s*http:\/\/localhost:\d+/g, '')
            .replace(/\s*http:\/\/127.0.0.1:\d+/g, '')
            .trim();
            
          fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
          console.log('✓ Security: Stripped localhost dev servers and dashboard from CSP');
        }
      }
    }
  };
};

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      tsconfigPaths({
        root: __dirname,
      }),
      crx({ manifest: manifestCallback(env) }),
      isProd && stripDevCSP(),
    ].filter((p): p is any => Boolean(p)),
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: !isProd,
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
  };
});
