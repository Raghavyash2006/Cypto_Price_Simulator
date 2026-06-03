import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('chart.js')) return 'chartjs';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('react-markdown') || id.includes('remark-gfm')) return 'markdown';
          if (id.includes('socket.io-client')) return 'socket';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('@reduxjs/toolkit') || id.includes('react-redux')) return 'state';
          if (id.includes('axios')) return 'http';

          return 'vendor';
        }
      }
    }
  }
});