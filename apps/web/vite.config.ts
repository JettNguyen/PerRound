import { copyFile } from 'node:fs/promises';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages answers any path it doesn't have with 404.html, so a copy of the app there lets
// links like /ammo/9mm-luger open straight to the page
const spaFallback = (): Plugin => ({
  name: 'spa-fallback',
  apply: 'build',
  async writeBundle(opts) {
    await copyFile(`${opts.dir}/index.html`, `${opts.dir}/404.html`);
  },
});

export default defineConfig({
  // BASE_PATH=/PerRound/ when the site lives under a GitHub Pages project address
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), spaFallback()],
  server: { port: 5180 },
});
