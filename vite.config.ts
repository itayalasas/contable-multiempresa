import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  alias: {
      '@': path.resolve(__dirname, 'src'),
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          auth: ['@auth0/auth0-react'],
          firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          charts: ['recharts'],
          utils: ['date-fns', 'lucide-react']
        }
      }
    }
  },
  base: '/'
});