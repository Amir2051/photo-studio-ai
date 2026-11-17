/// <reference types="vitest/config" />
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Reuse the parent Studio's public Firebase web-app config for standalone video-studio login.
  envDir: path.resolve(configDir, '../..'),
  plugins: [
    tailwindcss(),
    sveltekit({
      preprocess: vitePreprocess(),
      adapter: adapter({
        pages: 'build',
        assets: 'build',
        fallback: 'index.html',
        precompress: false,
        strict: true,
      }),
      paths: { base: '/video-studio' },
      serviceWorker: { register: false },
      version: { pollInterval: 60_000 },
    }),
  ],
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    // ffmpeg.wasm loads its worker from its own package, prebundling breaks that
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
  },
  server: {
    watch: {
      // media people drop next to the checkout must not trigger reloads
      ignored: ['**/*.mp4', '**/*.mov', '**/*.mkv', '**/*.webm', '**/*.wav', '**/*.mp3', '**/*.braincut']
    }
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node'
  }
});
