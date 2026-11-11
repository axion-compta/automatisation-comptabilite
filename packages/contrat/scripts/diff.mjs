// Échoue si openapi.json ou un fragment openapi/lot-NN/openapi.json diffère du contrat courant, ou si un fragment est orphelin.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { register } from '../../../node_modules/tsx/dist/esm/api/index.mjs';
register();
const { genererOpenapi, genererOpenapiLot } = await import('../src/openapi.ts');
const { REGISTRES } = await import('../src/registres/index.ts');

const mal = [];
const lire = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const texte = (doc) => JSON.stringify(doc, null, 2) + '\n';
if (texte(genererOpenapi()) !== lire('../openapi.json')) mal.push('openapi.json obsolète');
const lots = Object.keys(REGISTRES).filter((nn) => Object.keys(REGISTRES[nn]).length > 0);
for (const nn of lots) {
  const rel = `../openapi/lot-${nn}/openapi.json`;
  if (!existsSync(new URL(rel, import.meta.url))) mal.push(`fragment manquant : lot-${nn}`);
  else if (texte(genererOpenapiLot(nn)) !== lire(rel)) mal.push(`fragment obsolète : lot-${nn}`);
}
const dossier = new URL('../openapi/', import.meta.url);
if (existsSync(dossier)) {
  for (const e of readdirSync(dossier)) {
    if (!/^lot-(\d\d)$/.test(e) || !lots.includes(e.slice(4))) mal.push(`fragment orphelin : ${e}`);
  }
}
if (mal.length > 0) {
  console.error('contrat:diff : ' + mal.join(' ; ') + ', lancer pnpm contrat:openapi');
  process.exit(1);
}
console.log('contrat:diff : identique');
