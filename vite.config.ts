import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/location-checker/', // Match GitHub repository name
  assetsInclude: ['**/*.png'], // Ensure PNG files are handled as assets
});
