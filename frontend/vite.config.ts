import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// start-dev.ps1 injects the ports it resolved; plain `npm run dev` keeps the historical defaults.
const backendPort = process.env.BACKEND_PORT ?? '8088';
const frontendPort = process.env.FRONTEND_PORT ?? '5173';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: Number(frontendPort),
    // Same-origin API calls in dev, so the image auth cookie works exactly as it will in production.
    proxy: {
      '/api': {
        target: `http://localhost:${backendPort}`,
        changeOrigin: false,
      },
    },
  },
});
