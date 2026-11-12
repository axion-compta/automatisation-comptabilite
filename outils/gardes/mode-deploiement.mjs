// garde:mode-deploiement : le mode de déploiement est un réglage lu au démarrage, jamais une condition dans le code (V3-PLA-100).
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export const FICHIER_REGLAGE = 'packages/parametres/src/reglage-mode-deploiement.ts';
const [NOM, OP, LIT] = ['(?:MODE_DEPLOIEMENT|modeDeploiement|mode_deploiement)', '(?:[!=]=)=?', '(installation|heberge|installe)'];
const REGLES = [
  new RegExp(`\\b${NOM}\\b\\s*${OP}`),
  new RegExp(`${OP}\\s*[\\w.$?]*\\b${NOM}\\b`),
  new RegExp(`\\bswitch\\s*\\([^)]*\\b${NOM}\\b`),
  new RegExp(`\\bcase\\s+[\\w.]*\\b${NOM}\\b`),
  new RegExp(`${OP}\\s*(['"\`])${LIT}\\1`),
  new RegExp(`(['"\`])${LIT}\\1\\s*${OP}`),
];
function sansCommentaires(texte) {
  let sortie = '';
  let i = 0;
  while (i < texte.length) {
    const c = texte[i];
    const d = texte[i + 1];
    if (c === '/' && d === '/') {
      while (i < texte.length && texte[i] !== '\n') (sortie += ' '), i++;
    } else if (c === '/' && d === '*') {
      const fin = texte.indexOf('*/', i + 2);
      const stop = fin === -1 ? texte.length : fin + 2;
      for (; i < stop; i++) sortie += texte[i] === '\n' ? '\n' : ' ';
    } else if (c === "'" || c === '"' || c === '`') {
      sortie += c;
      i++;
      while (i < texte.length && texte[i] !== c && (texte[i] !== '\n' || c === '`')) {
        if (texte[i] === '\\') sortie += texte[i++];
        if (i < texte.length) sortie += texte[i++];
      }
      if (i < texte.length && texte[i] === c) sortie += texte[i++];
    } else {
      sortie += c;
      i++;
    }
  }
  return sortie;
}

export function concerne(chemin) {
  return /^(apps|packages)\//.test(chemin) && /\.(ts|tsx|mjs)$/.test(chemin) && !/(^|\/)(__tests__|node_modules)\//.test(chemin);
}

export function analyser(texte, chemin) {
  if (!concerne(chemin) || chemin === FICHIER_REGLAGE) return [];
  const pb = [];
  sansCommentaires(texte)
    .split('\n')
    .forEach((l, i) => {
      if (REGLES.some((r) => r.test(l))) pb.push({ chemin, ligne: i + 1, code: 'branche_par_mode' });
    });
  return pb;
}

function gitReel() {
  const r = spawnSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 ? r.stdout : null;
}

export function analyserDepot(git = gitReel, lire = (f) => readFileSync(f, 'utf8')) {
  const liste = git();
  if (liste === null) return [{ chemin: '.', ligne: 0, code: 'git_ls_files_echec' }];
  return liste
    .split('\0')
    .filter(concerne)
    .flatMap((f) => analyser(lire(f), f));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const pb = analyserDepot();
  for (const p of pb) console.error(`garde:mode-deploiement ${p.chemin}:${p.ligne} ${p.code}`);
  if (pb.length > 0) process.exit(1);
  console.log('garde:mode-deploiement vert');
}
