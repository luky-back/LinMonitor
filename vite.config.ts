import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // These libraries are provided via CDN in index.html (importmap)
      // We must treat them as external so Vite doesn't try (and fail) to bundle them.
      external: [
        'react',
        'react-dom',
        'react-dom/client',
        'react-router-dom',
        'recharts',
        'lucide-react'
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react-router-dom': 'ReactRouterDOM',
          recharts: 'Recharts'
        }
      }
    }
  }
});
