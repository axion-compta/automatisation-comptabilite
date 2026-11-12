// garde:manifeste-ecrans : une ligne complète par écran présent (V3-DEM-018).
// Rouge si : écran sans ligne, ligne sans écran ou en double, route ou outil_chat manquant,
// outil absent de packages/contrat/src/chat/outils.json, jeu différent de « commun ».
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const chemin = (c) => fileURLToPath(new URL(c, import.meta.url));
export const CHEMIN_MANIFESTE = chemin('../../apps/web/src/socle/manifeste-ecrans.json');
export const CHEMIN_OUTILS = chemin('../../packages/contrat/src/chat/outils.json');
export const CHEMIN_ECRANS = chemin('../../apps/web/src/ecrans');

/** Un écran = un dossier contenant route.tsx. */
export function lireDossiersEcrans(racine) {
  return readdirSync(racine, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(`${racine}/${d.name}/route.tsx`))
    .map((d) => d.name)
    .sort();
}

const texte = (v) => typeof v === 'string' && v.trim() !== '';

export function analyserManifeste(manifeste, ecrans, outils) {
  if (!Array.isArray(manifeste)) return ['manifeste illisible'];
  if (!Array.isArray(ecrans) || !Array.isArray(outils) || outils.length === 0) return ['écrans ou outils du chat illisibles'];
  const pb = [];
  const vus = new Set();
  for (const l of manifeste) {
    const id = texte(l?.ecran) ? l.ecran : '';
    if (id === '') { pb.push('ligne sans nom d’écran'); continue; }
    if (vus.has(id)) pb.push(`ligne en double : ${id}`);
    vus.add(id);
    if (!ecrans.includes(id)) pb.push(`ligne sans écran : ${id}`);
    if (!texte(l.route)) pb.push(`route manquante : ${id}`);
    else if (!l.route.startsWith('/')) pb.push(`route sans / initial : ${id}`);
    if (!texte(l.outil_chat)) pb.push(`outil_chat manquant : ${id}`);
    else if (!outils.includes(l.outil_chat)) pb.push(`outil inconnu : ${id} / ${l.outil_chat}`);
    if (l.jeu !== 'commun') pb.push(`jeu différent de commun : ${id}`);
  }
  for (const e of ecrans) if (!vus.has(e)) pb.push(`écran sans ligne : ${e}`);
  return pb;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let pb;
  try {
    const outils = JSON.parse(readFileSync(CHEMIN_OUTILS, 'utf8')).map((o) => o?.nom);
    pb = analyserManifeste(JSON.parse(readFileSync(CHEMIN_MANIFESTE, 'utf8')), lireDossiersEcrans(CHEMIN_ECRANS), outils);
  } catch (e) {
    pb = [`fichier illisible : ${e.message}`];
  }
  if (pb.length > 0) {
    for (const p of pb) console.error('garde:manifeste-ecrans ' + p);
    process.exit(1);
  }
  console.log('garde:manifeste-ecrans vert');
}
