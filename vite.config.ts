import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Treat these as external so Vite doesn't try to bundle them.
      // The browser will resolve them via the importmap in index.html.
      external: [
        'react',
        'react-dom',
        'react-dom/client',
        'react-router-dom',
        'recharts',
        'lucide-react',
        'xterm',
        'xterm-addon-fit'
      ]
    }
  }
});
