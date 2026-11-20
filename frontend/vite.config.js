import { defineConfig } from 'vite';

const apiTarget = process.env.VITE_API_TARGET || 'https://backend-omega-five-59.vercel.app';

export default defineConfig({
  server: {
    host: '::',
    strictPort: true,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
});
