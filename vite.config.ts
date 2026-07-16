import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server proxies /api to the NestJS backend so the SPA can call
// same-origin paths and avoid CORS during development. Override the backend
// target with VITE_PROXY_TARGET (e.g. http://localhost:3100 if 3000 is taken).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxy = {
    '/api': {
      target: env.VITE_PROXY_TARGET || 'http://localhost:3000',
      changeOrigin: true,
    },
  };
  return {
    plugins: [react()],
    server: { port: 5173, proxy },
    // `vite preview` serves the production build (import.meta.env.PROD=true) —
    // proxy /api the same way so the built app can be exercised end-to-end.
    preview: { port: 4173, proxy },
  };
});
