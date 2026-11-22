import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // Serve from the domain root (custom CNAME in production). Relative base
  // './' breaks deep links such as /gallery/:shareId because assets resolve
  // relative to the nested path instead of the root.
  base: '/',
    plugins: [
      {
        name: 'emit-audio-static-entrypoint',
        closeBundle() {
          const outputDir = path.resolve(import.meta.dirname, 'dist');
          const htmlPath = path.join(outputDir, 'index.html');
          const audioDir = path.join(outputDir, 'audio');
          mkdirSync(audioDir, { recursive: true });
          const html = readFileSync(htmlPath, 'utf8').replace(/="\.\//g, '="../');
          writeFileSync(path.join(audioDir, 'index.html'), html);
        },
      },
      {
        name: 'serve-nested-video-studio-index',
        configureServer(server) {
          server.middlewares.use((req, _res, next) => {
            if (req.url === '/video-studio' || req.url === '/video-studio/') {
              req.url = '/video-studio/index.html';
            }
            next();
          });
        },
      },
      react(),
      tailwindcss(),
    ],
    resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
    server: {
      proxy: {
        '/api/guest-rooms': { target: env.GUEST_SIGNAL_PROXY_TARGET || 'http://127.0.0.1:18788', changeOrigin: false },
        '/guest-signal': { target: env.GUEST_SIGNAL_PROXY_TARGET || 'http://127.0.0.1:18788', changeOrigin: false, ws: true, rewrite: (path) => path.replace(/^\/guest-signal/, '') },
        '/api/ai': {
          target: env.AI_GATEWAY_PROXY_TARGET || 'http://127.0.0.1:18787',
          changeOrigin: false,
        },
      },
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
    },
    preview: {
      host: '127.0.0.1',
      port: 4173,
      strictPort: true,
      allowedHosts: ['studio.safenestt.com'],
      proxy: {
        '/api/guest-rooms': { target: env.GUEST_SIGNAL_PROXY_TARGET || 'http://127.0.0.1:18788', changeOrigin: false },
        '/guest-signal': { target: env.GUEST_SIGNAL_PROXY_TARGET || 'http://127.0.0.1:18788', changeOrigin: false, ws: true, rewrite: (path) => path.replace(/^\/guest-signal/, '') },
        '/api/ai': { target: env.AI_GATEWAY_PROXY_TARGET || 'http://127.0.0.1:18787', changeOrigin: false },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
