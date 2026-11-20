import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '::',
    strictPort: true,
    proxy: {
      '/api': {
        target: 'https://backend-omega-five-59.vercel.app',
        changeOrigin: true,
      },
    },
  },
});
