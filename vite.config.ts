import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
    server: {
      proxy: {
        '/api/ai': {
          target: env.AI_GATEWAY_PROXY_TARGET || 'http://127.0.0.1:18787',
          changeOrigin: false,
        },
      },
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
