
import path from 'path';
import { execSync } from 'child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import pkg from './package.json';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Versión automática: vX.Y.Z+hash del commit (cambia en cada despliegue)
let gitHash = '';
try {
  gitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch { /* sin git disponible */ }
const appVersion = `v${pkg.version}${gitHash ? `+${gitHash}` : ''}`;

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  }
});
