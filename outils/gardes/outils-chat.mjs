// garde:outils-chat : outils du chat reliés au registre d'actions (V3-CHT-052, V3-CHT-067, V3-CHT-005).
// Rouge si : nom en double, vide ou « appliquer », outil_registre absent du registre, niveau différent,
// niveau I ou outil fermé au chat, permission sans préfixe compta-, codes_erreur vide ou hors liste fermée.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const chemin = (c) => fileURLToPath(new URL(c, import.meta.url));
export const CHEMIN_OUTILS = chemin('../../packages/contrat/src/chat/outils.json');
export const CHEMIN_REGISTRE = chemin('../../packages/contrat/src/actions/registre.json');
export const CHEMIN_TYPES = chemin('../../packages/noyau/src/chat/types.ts');

export function lireCodes(source) {
  const m = /CODES_ERREUR\s*=\s*\[([^\]]*)\]/.exec(String(source));
  return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [];
}

export function analyserOutilsChat(outils, registre, codes) {
  const pb = [];
  if (!Array.isArray(outils) || outils.length === 0) return ['outils du chat illisibles ou vides'];
  if (!Array.isArray(registre?.outils)) return ['registre illisible'];
  if (!Array.isArray(codes) || codes.length === 0) return ['liste des codes d’erreur introuvable ou vide'];
  const parId = new Map(registre.outils.map((o) => [o?.id, o]));
  const vus = new Set();
  for (const o of outils) {
    const nom = typeof o?.nom === 'string' ? o.nom : '';
    if (nom.trim() === '') pb.push('nom vide');
    else if (vus.has(nom)) pb.push(`nom en double : ${nom}`);
    vus.add(nom);
    if (/appliquer/i.test(nom) || /appliquer/i.test(String(o?.outil_registre))) pb.push(`outil appliquer interdit : ${nom}`);
    const reg = parId.get(o?.outil_registre);
    if (!reg) pb.push(`outil_registre absent du registre : ${nom}`);
    else {
      if (reg.niveau !== o.niveau) pb.push(`niveau différent du registre : ${nom}`);
      if (reg.chat !== 'ouvert') pb.push(`outil fermé au chat dans le registre : ${nom}`);
      if (reg.niveau === 'I') pb.push(`niveau I dans le registre : ${nom}`);
    }
    if (o?.niveau === 'I') pb.push(`niveau I déclaré : ${nom}`);
    if (typeof o?.permission !== 'string' || !o.permission.startsWith('compta-')) pb.push(`permission sans préfixe compta- : ${nom}`);
    if (!Array.isArray(o?.codes_erreur) || o.codes_erreur.length === 0) pb.push(`codes_erreur vide : ${nom}`);
    else for (const c of o.codes_erreur) if (!codes.includes(c)) pb.push(`code inconnu : ${nom} / ${c}`);
  }
  return pb;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let pb;
  try {
    const lire = (c) => JSON.parse(readFileSync(c, 'utf8'));
    pb = analyserOutilsChat(lire(CHEMIN_OUTILS), lire(CHEMIN_REGISTRE), lireCodes(readFileSync(CHEMIN_TYPES, 'utf8')));
  } catch (e) {
    pb = [`fichier illisible : ${e.message}`];
  }
  if (pb.length > 0) {
    for (const p of pb) console.error('garde:outils-chat ' + p);
    process.exit(1);
  }
  console.log('garde:outils-chat vert');
}
