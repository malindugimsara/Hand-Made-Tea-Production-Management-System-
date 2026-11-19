import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // PDF & Canvas libraries
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('canvg')) {
              return 'vendor-pdf';
            }
            // Spreadsheet libraries
            if (id.includes('exceljs') || id.includes('xlsx')) {
              return 'vendor-excel';
            }
            // Charting libraries
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'vendor-charts';
            }
            // Icon set
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            // Core React and routing framework
            if (
              id.includes('react') || 
              id.includes('react-dom') || 
              id.includes('react-router-dom') ||
              id.includes('scheduler')
            ) {
              return 'vendor-react';
            }
          }
        }
      }
    }
  }
});
