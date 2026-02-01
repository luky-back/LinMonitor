import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
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
