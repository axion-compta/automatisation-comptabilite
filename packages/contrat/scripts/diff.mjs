// Échoue si openapi.json versionné diffère du contrat courant.
import { readFileSync } from 'node:fs';
import { register } from '../../../node_modules/tsx/dist/esm/api/index.mjs';
register();
const { genererOpenapi } = await import('../src/openapi.ts');

const attendu = JSON.stringify(genererOpenapi(), null, 2) + '\n';
const actuel = readFileSync(new URL('../openapi.json', import.meta.url), 'utf8');
if (attendu !== actuel) {
  console.error('contrat:diff : openapi.json obsolète, lancer pnpm contrat:openapi');
  process.exit(1);
}
console.log('contrat:diff : identique');
