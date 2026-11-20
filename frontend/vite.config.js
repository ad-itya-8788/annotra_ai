import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '::',
    strictPort: true,
    proxy: { '/api': 'http://localhost:3001' },
  },
});
