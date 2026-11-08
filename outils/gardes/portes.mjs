// garde:portes : aucun lot back-end d'un écran sans porte « maquette validée » datée et nommée (V3-PRI-016, R21, D62).
// Porte = pilotage/portes/<ecran>.json lue sur origin/main (jamais sur la branche).
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { idDeBranche, lireFiche } from './perimetre.mjs';

export const VALIDEURS = ['Will'];
export const CHEMINS_BACK_END = ['apps/serveur/', 'packages/contrat/', 'packages/faux-serveur/'];
const BASE = 'origin/main';
const DOSSIER_ECRANS = 'apps/web/src/ecrans/';
const CHAMPS = ['date', 'ecran', 'valideur'];
const CODE_ECRAN = /^[a-z][a-z0-9-]*$/;

function dateReelle(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [a, m, j] = s.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1, j));
  return d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === j;
}

// aujourdhui : « AAAA-MM-JJ » injecté (aucune horloge système ici).
export function validerPorte(texte, nomFichier, aujourdhui) {
  let j;
  try {
    j = JSON.parse(String(texte).replace(/^﻿/, ''));
  } catch {
    return [`${nomFichier} : JSON illisible`];
  }
  if (j === null || typeof j !== 'object' || Array.isArray(j)) return [`${nomFichier} : un objet JSON est attendu`];
  const pb = [];
  for (const k of Object.keys(j)) if (!CHAMPS.includes(k)) pb.push(`${nomFichier} : champ inconnu ${k}`);
  for (const k of CHAMPS) if (typeof j[k] !== 'string') pb.push(`${nomFichier} : champ ${k} absent ou non textuel`);
  if (typeof j.ecran === 'string' && j.ecran !== nomFichier.replace(/\.json$/, '')) pb.push(`${nomFichier} : ecran « ${j.ecran} » différent du nom du fichier`);
  if (typeof j.date === 'string') {
    if (!dateReelle(j.date)) pb.push(`${nomFichier} : date « ${j.date} » invalide (AAAA-MM-JJ du calendrier)`);
    else if (j.date > aujourdhui) pb.push(`${nomFichier} : date ${j.date} dans le futur`);
  }
  if (typeof j.valideur === 'string' && !VALIDEURS.includes(j.valideur)) pb.push(`${nomFichier} : valideur « ${j.valideur.trim()} » vide ou hors liste`);
  return pb;
}

const codesDe = (fiche) =>
  (Array.isArray(fiche?.fichiers_autorises) ? fiche.fichiers_autorises : [])
    .map((f) => (typeof f === 'string' && f.startsWith(DOSSIER_ECRANS) ? f.slice(DOSSIER_ECRANS.length).split('/') : []))
    .filter((p) => p.length > 1 && p[0] !== '' && !p[0].includes('.') && CODE_ECRAN.test(p[0]))
    .map((p) => p[0]);

// fiches : tableau de fiches lues (avec id, fichiers_autorises, depend_de).
export function ecransDeLaFiche(id, fiches) {
  const codes = new Set();
  for (const f of fiches) {
    if (f.id === id || (Array.isArray(f.depend_de) && f.depend_de.includes(id))) codesDe(f).forEach((c) => codes.add(c));
  }
  return [...codes].sort();
}

// deps : { git(args) -> texte|null, env, aujourdhui, portesDuDepot() -> [{nom,texte}]|null, ecranExiste(code) -> booléen }
export function evaluer(deps) {
  const { git, env, aujourdhui } = deps;
  if (!env.GITHUB_HEAD_REF) {
    const portes = deps.portesDuDepot();
    if (portes === null) return { pb: [], msg: 'garde:portes vert (dossier pilotage/portes absent)' };
    const pb = [];
    for (const p of portes) {
      pb.push(...validerPorte(p.texte, p.nom, aujourdhui));
      const code = p.nom.replace(/\.json$/, '');
      if (!deps.ecranExiste(code)) pb.push(`${p.nom} : aucun dossier ${DOSSIER_ECRANS}${code}/`);
    }
    return { pb, msg: `garde:portes vert (${portes.length} porte(s) valide(s))` };
  }
  const id = idDeBranche(env.GITHUB_HEAD_REF);
  if (!id) return { pb: [], msg: 'garde:portes vert (pas de branche de fiche)' };
  const noms = git(['diff', '--name-only', '--no-renames', '-z', `${BASE}...HEAD`]);
  if (noms === null) return { pb: [`git diff impossible contre ${BASE}`], msg: '' };
  if (!noms.split('\0').some((f) => CHEMINS_BACK_END.some((c) => f.startsWith(c)))) return { pb: [], msg: 'garde:portes vert (aucun chemin back-end touché)' };
  const lire = (chemin) => git(['show', `${BASE}:${chemin}`]);
  const liste = git(['ls-tree', '--name-only', `${BASE}`, 'pilotage/fiches/']);
  if (liste === null || lire(`pilotage/fiches/${id}.md`) === null) return { pb: [`fiche ${id} introuvable sur ${BASE}`], msg: '' };
  const fiches = [];
  for (const chemin of liste.split('\n').filter((l) => /\.md$/.test(l))) {
    try {
      const t = lire(chemin);
      if (t !== null) fiches.push(lireFiche(t));
    } catch {
      /* fiche illisible : signalée par garde:fiches */
    }
  }
  const pb = [];
  const ecrans = ecransDeLaFiche(id, fiches);
  for (const e of ecrans) {
    const t = lire(`pilotage/portes/${e}.json`);
    if (t === null) pb.push(`lot back-end de l'écran ${e} sans porte « maquette validée » sur ${BASE} (pilotage/portes/${e}.json)`);
    else pb.push(...validerPorte(t, `${e}.json`, aujourdhui));
  }
  return { pb, msg: `garde:portes vert (${id}, ${ecrans.length} écran(s) avec porte)` };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const git = (args) => {
    const r = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28 });
    return r.status === 0 ? r.stdout : null;
  };
  const dossier = 'pilotage/portes';
  const portesDuDepot = () =>
    existsSync(dossier)
      ? readdirSync(dossier).filter((n) => n.endsWith('.json')).sort().map((nom) => ({ nom, texte: readFileSync(`${dossier}/${nom}`, 'utf8') }))
      : null;
  const { pb, msg } = evaluer({
    git,
    env: process.env,
    aujourdhui: new Date().toISOString().slice(0, 10),
    portesDuDepot,
    ecranExiste: (code) => existsSync(`${DOSSIER_ECRANS}${code}`),
  });
  if (pb.length > 0) {
    console.error('garde:portes ROUGE\n' + pb.map((p) => ' - ' + p).join('\n'));
    process.exit(1);
  }
  console.log(msg);
}
