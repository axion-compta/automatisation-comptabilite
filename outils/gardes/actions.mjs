// garde:actions : contrôle le registre d'actions (V3-CHT-052, V3-PRI-013).
// Rouge si : doublon (rôles, outils, actions, outil dans une ligne de matrice), action sans id,
// action sans outil ni exclusion (ou avec les deux), outil inconnu ou sans action, niveau d'outil invalide,
// matrice mal formée (rôle ou outil inconnu, rôle sans ligne, ligne non-liste),
// rôle en lecture seule avec un outil d'écriture (E).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const CHEMIN_REGISTRE = fileURLToPath(new URL('../../packages/contrat/src/actions/registre.json', import.meta.url));

export function analyserActions(r) {
  const pb = [];
  const listeRoles = (r.roles ?? []).map((x) => x?.id);
  const listeOutils = (r.outils ?? []).map((x) => x?.id);
  const roles = new Set(listeRoles);
  const outils = new Set(listeOutils);
  if (roles.size !== listeRoles.length) pb.push('doublon dans roles');
  if (outils.size !== listeOutils.length) pb.push('doublon dans outils');
  const niveaux = new Map();
  for (const o of r.outils ?? []) {
    if (o?.niveau !== 'L' && o?.niveau !== 'E') pb.push(`outil sans niveau L ou E : ${o?.id}`);
    niveaux.set(o?.id, o?.niveau);
  }
  const ids = new Set();
  const utilises = new Set();
  for (const a of r.actions ?? []) {
    if (!a?.id) {
      pb.push('action sans id');
      continue;
    }
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
  const matrice = r.matrice ?? {};
  for (const role of Object.keys(matrice)) {
    if (!roles.has(role)) pb.push(`matrice : rôle inconnu : ${role}`);
    const liste = matrice[role];
    if (!Array.isArray(liste)) {
      pb.push(`matrice : la ligne de ${role} n'est pas une liste`);
      continue;
    }
    if (new Set(liste).size !== liste.length) pb.push(`matrice : outil répété pour ${role}`);
    for (const o of liste) if (!outils.has(o)) pb.push(`matrice : outil inconnu pour ${role} : ${o}`);
  }
  for (const role of roles) if (!Object.hasOwn(matrice, role)) pb.push(`matrice : rôle sans ligne : ${role}`);
  for (const x of r.roles ?? []) {
    if (!x?.lecture_seule || !Object.hasOwn(matrice, x.id) || !Array.isArray(matrice[x.id])) continue;
    for (const o of matrice[x.id]) {
      if (niveaux.get(o) === 'E') pb.push(`rôle en lecture seule avec un outil d'écriture : ${x.id} / ${o}`);
    }
  }
  // DEMANDE 5 non acceptée : le comptable reste en lecture seule, sans outil d'écriture (ROL-002).
  const comptable = (r.roles ?? []).find((x) => x?.id === 'comptable');
  if (comptable && comptable.lecture_seule !== true) pb.push('rôle comptable sans lecture_seule (DEMANDE 5 non acceptée)');
  if (Array.isArray(matrice.comptable)) {
    for (const o of matrice.comptable) {
      if (niveaux.get(o) === 'E') pb.push(`comptable avec un outil d'écriture (DEMANDE 5 non acceptée) : ${o}`);
    }
  }
  return pb;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pb = analyserActions(JSON.parse(readFileSync(CHEMIN_REGISTRE, 'utf8')));
  if (pb.length > 0) {
    for (const p of pb) console.error('garde:actions ' + p);
    process.exit(1);
  }
  console.log('garde:actions vert');
}
