// Écrit packages/donnees-fictives/donnees/v1.json (graine fixe : deux exécutions donnent le même fichier).
import { mkdirSync, writeFileSync } from 'node:fs';
import { register } from '../../../node_modules/tsx/dist/esm/api/index.mjs';
register();
const { genererDonnees, serialiser } = await import('../src/generateur.ts');

mkdirSync(new URL('../donnees/', import.meta.url), { recursive: true });
writeFileSync(new URL('../donnees/v1.json', import.meta.url), serialiser(genererDonnees()));
console.log('donnees/v1.json écrit');
