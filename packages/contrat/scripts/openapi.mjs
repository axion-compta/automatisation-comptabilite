// Écrit packages/contrat/openapi.json (socle) et openapi/lot-NN/openapi.json (un fragment par lot non vide).
import { mkdirSync, writeFileSync } from 'node:fs';
import { register } from '../../../node_modules/tsx/dist/esm/api/index.mjs';
register();
const { genererOpenapi, genererOpenapiLot } = await import('../src/openapi.ts');
const { REGISTRES } = await import('../src/registres/index.ts');

writeFileSync(new URL('../openapi.json', import.meta.url), JSON.stringify(genererOpenapi(), null, 2) + '\n');
for (const nn of Object.keys(REGISTRES)) {
  if (Object.keys(REGISTRES[nn]).length === 0) continue;
  mkdirSync(new URL(`../openapi/lot-${nn}/`, import.meta.url), { recursive: true });
  writeFileSync(new URL(`../openapi/lot-${nn}/openapi.json`, import.meta.url), JSON.stringify(genererOpenapiLot(nn), null, 2) + '\n');
}
console.log('openapi.json et fragments écrits');
