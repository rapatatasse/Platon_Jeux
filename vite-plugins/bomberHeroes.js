import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ID = 'virtual:bomberheroes';
const RESOLVED = `\0${ID}`;

/**
 * Module virtuel `virtual:bomberheroes` : liste des images de héros présentes dans public/images/bomberheroes/
 * (tous les .png / .webp / .jpg du dossier, triés par nom). Ajouter une image suffit à ajouter un héros.
 */
export default function bomberHeroes({ dir }) {
  const folder = resolve(dir);
  const list = () => {
    try { return readdirSync(folder).filter((f) => /\.(png|webp|jpe?g)$/i.test(f)).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' })); } catch { return []; }
  };
  return {
    name: 'platon-bomberheroes',
    resolveId: (source) => (source === ID ? RESOLVED : null),
    load: (id) => (id === RESOLVED ? `export default ${JSON.stringify(list())};` : null),
    configureServer(server) {
      server.watcher.add(folder);
      const refresh = (file) => {
        if (!resolve(file).startsWith(folder)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', refresh);
      server.watcher.on('unlink', refresh);
    },
  };
}
