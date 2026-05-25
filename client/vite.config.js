import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: 'dist'
  },
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify('https://comunidad-spanish.onrender.com/api')
  }
});
