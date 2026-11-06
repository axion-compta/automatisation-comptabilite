// garde:interrupteurs : chaque action dépend d'un interrupteur déclaré, fermé par défaut (V3-PRI-013).
// Rouge si : action sans interrupteur, interrupteur non déclaré, interrupteur sans action,
// interrupteur actif par défaut (ou sans état actif_par_defaut: false).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CHEMIN_REGISTRE } from './actions.mjs';

export function analyserInterrupteurs(r) {
  const pb = [];
  const decl = r.interrupteurs ?? {};
  const declares = new Set(Object.keys(decl));
  for (const [nom, etat] of Object.entries(decl)) {
    if (etat?.actif_par_defaut !== false) pb.push(`interrupteur actif par défaut ou sans état : ${nom}`);
  }
  const utilises = new Set();
  for (const a of r.actions ?? []) {
    if (!a.interrupteur) {
      pb.push(`action sans interrupteur : ${a.id}`);
      continue;
    }
    utilises.add(a.interrupteur);
    if (!declares.has(a.interrupteur)) pb.push(`interrupteur non déclaré pour ${a.id} : ${a.interrupteur}`);
  }
  for (const i of declares) if (!utilises.has(i)) pb.push(`interrupteur sans action : ${i}`);
  return pb;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pb = analyserInterrupteurs(JSON.parse(readFileSync(CHEMIN_REGISTRE, 'utf8')));
  if (pb.length > 0) {
    for (const p of pb) console.error('garde:interrupteurs ' + p);
    process.exit(1);
  }
  console.log('garde:interrupteurs : registre conforme');
}
