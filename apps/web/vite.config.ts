import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/** Sert le script du faux serveur MSW depuis le paquet msw (aucune copie versionnée). */
function scriptMsw(): Plugin {
  return {
    name: 'script-msw',
    configureServer(serveur) {
      serveur.middlewares.use('/mockServiceWorker.js', (_req, res) => {
        const chemin = createRequire(new URL('../../packages/faux-serveur/package.json', import.meta.url)).resolve('msw/mockServiceWorker.js');
        res.setHeader('content-type', 'text/javascript');
        res.end(readFileSync(chemin));
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'simule' ? [scriptMsw()] : [])],
  server: { host: '127.0.0.1', port: 5173, ...(mode === 'reel' ? { proxy: { '/ecritures': 'http://127.0.0.1:3001' } } : {}) },
}));
