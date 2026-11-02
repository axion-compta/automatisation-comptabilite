// garde:interrupteurs : chaque action dépend d'un interrupteur déclaré (V3-PRI-013).
// Rouge si : action sans interrupteur, interrupteur non déclaré, interrupteur déclaré sans action.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function analyserInterrupteurs(r) {
  const pb = [];
  const declares = new Set(r.interrupteurs ?? []);
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
  const pb = analyserInterrupteurs(JSON.parse(readFileSync('packages/contrat/src/actions/registre.json', 'utf8')));
  if (pb.length > 0) {
    for (const p of pb) console.error('garde:interrupteurs ' + p);
    process.exit(1);
  }
  console.log('garde:interrupteurs : registre conforme');
}
