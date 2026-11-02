// garde:actions : contrôle le registre d'actions (V3-CHT-052, V3-PRI-013).
// Rouge si : identifiant d'action en double, action sans outil ni exclusion (ou avec les deux),
// outil inconnu, outil sans action, matrice avec rôle ou outil inconnu.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const CHEMIN_REGISTRE = 'packages/contrat/src/actions/registre.json';

export function analyserActions(r) {
  const pb = [];
  const ids = new Set();
  const outils = new Set(r.outils ?? []);
  const utilises = new Set();
  for (const a of r.actions ?? []) {
    if (ids.has(a.id)) pb.push(`action en double : ${a.id}`);
    ids.add(a.id);
    const aOutil = Boolean(a.outil);
    const aExclusion = Boolean(a.exclusion);
    if (!aOutil && !aExclusion) pb.push(`action sans outil ni exclusion déclarée : ${a.id}`);
    if (aOutil && aExclusion) pb.push(`action avec outil et exclusion : ${a.id}`);
    if (aOutil) {
      utilises.add(a.outil);
      if (!outils.has(a.outil)) pb.push(`outil inconnu pour ${a.id} : ${a.outil}`);
    }
  }
  for (const o of outils) if (!utilises.has(o)) pb.push(`outil sans action : ${o}`);
  const roles = new Set(r.roles ?? []);
  for (const [role, liste] of Object.entries(r.matrice ?? {})) {
    if (!roles.has(role)) pb.push(`matrice : rôle inconnu : ${role}`);
    for (const o of liste) if (!outils.has(o)) pb.push(`matrice : outil inconnu pour ${role} : ${o}`);
  }
  for (const role of roles) if (!(role in (r.matrice ?? {}))) pb.push(`matrice : rôle sans ligne : ${role}`);
  return pb;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pb = analyserActions(JSON.parse(readFileSync(CHEMIN_REGISTRE, 'utf8')));
  if (pb.length > 0) {
    for (const p of pb) console.error('garde:actions ' + p);
    process.exit(1);
  }
  console.log('garde:actions : registre conforme');
}
