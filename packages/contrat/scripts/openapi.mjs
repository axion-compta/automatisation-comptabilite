// Écrit packages/contrat/openapi.json à partir du contrat.
import { writeFileSync } from 'node:fs';
import { register } from '../../../node_modules/tsx/dist/esm/api/index.mjs';
register();
const { genererOpenapi } = await import('../src/openapi.ts');

writeFileSync(new URL('../openapi.json', import.meta.url), JSON.stringify(genererOpenapi(), null, 2) + '\n');
console.log('openapi.json écrit');
