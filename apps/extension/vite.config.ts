import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';
import fs from 'fs';

// Read manifest using fs to avoid Import Attributes syntax issues
const manifestCallback = () => {
  const manifest = JSON.parse(fs.readFileSync(resolve(__dirname, 'manifest.json'), 'utf-8'));
  return manifest;
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
          // Remove localhost dev server origins
          manifest.content_security_policy.extension_pages = manifest.content_security_policy.extension_pages
            .replace(/\s*ws:\/\/localhost:5173/g, '')
            .replace(/\s*http:\/\/localhost:5173/g, '')
            .trim();
            
          fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
          console.log('✓ Security: Stripped localhost dev servers from CSP');
        }
      }
    }
  };
};

export default defineConfig({
  plugins: [
    tsconfigPaths({
      root: __dirname,
    }),
    crx({ manifest: manifestCallback() }),
    stripDevCSP(),
  ],
  resolve: {
    alias: {
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
