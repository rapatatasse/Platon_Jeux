import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import platonSeo from './vite-plugins/platonSeo.js';

const root = resolve(import.meta.dirname, 'src');

/**
 * Plateforme multi-pages : le hub (/) et un dossier par jeu (/games/<jeu>/).
 * Pour ajouter un jeu : créer src/games/<jeu>/index.html + main.js, puis l'ajouter à `pages` ici
 * et à src/shared/games.js (catalogue).
 */
const pages = {
  hub: resolve(root, 'index.html'),
  pixel: resolve(root, 'games/pixel/index.html'),
  pirates: resolve(root, 'games/pirates/index.html'),
  inventeurs: resolve(root, 'games/inventeurs/index.html'),
};

export default defineConfig({
  root,
  base: '/',
  plugins: [platonSeo()],
  publicDir: resolve(import.meta.dirname, 'public'),
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: { input: pages },
  },
  server: {
    port: 5173,
    watch: {
      ignored: ['**/*.pptx', '**/*.docx', '**/*.xlsx', '**/*.mp3', '**/*.pdf', '**/~$*'],
    },
  },
});
