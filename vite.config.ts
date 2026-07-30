import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Base path comes from the environment so local dev serves at `/`
// while the GitHub Pages deploy serves at `/ABLATION/`.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
});
