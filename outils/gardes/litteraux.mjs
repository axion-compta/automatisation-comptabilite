// garde:litteraux : aucun taux, seuil, délai ni date légale en dur (R10, R14).
// Fichiers examinés : packages/noyau/src et apps/serveur/src (ts, tsx, mjs), hors tests. packages/parametres est exclu.
// Rouge si une ligne contient : (a) une date AAAA-MM-JJ dans une chaîne ; (b) un nombre autre que 0 et 1 sur une ligne
// qui nomme taux, seuil, plafond, delai, duree, franchise ou bareme ; (c) une chaîne avec un nombre suivi de %.
// Exceptions : outils/gardes/litteraux-exceptions.json, signé par une PR fusionnée par Will.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CONCERNES = /^(?:packages\/noyau\/src|apps\/serveur\/src)\/.*\.(?:tsx?|mjs)$/;
const TESTS = /(?:\.test\.|\.spec\.|\/__tests__\/)/;
const MOTS = /(?:taux|seuil|plafond|delai|duree|franchise|bareme)/i;
const DATE = /\d{4}-\d{2}-\d{2}/;
const POURCENT = /\d\s*%/;
const NOMBRE = /(?<![\w.$])\d+(?:[.,]\d+)?(?![\w$])/g;

export function estExclu(chemin) {
  return !CONCERNES.test(chemin) || TESTS.test(chemin);
}

// Sépare une ligne en code (chaînes vidées) et en chaînes ; ignore le commentaire de fin de ligne.
function decouper(ligne) {
  let code = '';
  const chaines = [];
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i];
    if (c === '/' && ligne[i + 1] === '/') break;
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      let s = '';
      while (j < ligne.length && ligne[j] !== c) {
        if (ligne[j] === '\\') j++;
        s += ligne[j] ?? '';
        j++;
      }
      chaines.push(s);
      code += c + c;
      i = j;
    } else code += c;
  }
  return { code, chaines };
}

const valide = (e) => typeof e?.raison === 'string' && e.raison.trim() !== '' && typeof e.fichier === 'string' && e.fichier !== '' && typeof e.motif === 'string' && e.motif !== '';

export function exceptionsInvalides(exceptions) {
  const pb = [];
  exceptions.forEach((e, i) => {
    if (typeof e?.raison !== 'string' || e.raison.trim() === '') pb.push(`exception n°${i + 1} (${e?.fichier ?? '?'}) sans raison : refusée`);
    else if (!valide(e)) pb.push(`exception n°${i + 1} sans fichier ou sans motif : refusée`);
  });
  return pb;
}

export function analyser(fichiers, exceptions = []) {
  const pb = exceptionsInvalides(exceptions);
  const valides = exceptions.filter(valide);
  for (const { chemin, texte } of fichiers) {
    if (estExclu(chemin)) continue;
    const sansBloc = texte.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
    sansBloc.split(/\r?\n/).forEach((ligne, i) => {
      if (valides.some((e) => e.fichier === chemin && ligne.includes(e.motif))) return;
      const { code, chaines } = decouper(ligne);
      const ou = `${chemin}:${i + 1}`;
      if (chaines.some((s) => DATE.test(s))) pb.push(`${ou} date littérale dans une chaîne`);
      if (chaines.some((s) => POURCENT.test(s))) pb.push(`${ou} nombre suivi de % dans une chaîne`);
      if (MOTS.test(code)) {
        const n = [...code.matchAll(NOMBRE)].map((m) => m[0]).find((v) => {
          const x = Number(v.replace(',', '.'));
          return x !== 0 && x !== 1;
        });
        if (n !== undefined) pb.push(`${ou} littéral numérique « ${n} » sur une ligne de taux, seuil ou délai`);
      }
    });
  }
  return pb;
}

function gitReel(args, cwd) {
  const r = spawnSync('git', args, { encoding: 'utf8', cwd, maxBuffer: 1 << 28 });
  return r.status === 0 ? r.stdout : null;
}

export function analyserDepot(git = gitReel, lire = (f) => readFileSync(f, 'utf8')) {
  const racine = git(['rev-parse', '--show-toplevel'])?.trim();
  if (!racine) return ['git rev-parse --show-toplevel a échoué : dépôt non analysé'];
  const liste = git(['ls-files', '-z'], racine);
  if (liste === null) return ['git ls-files a échoué : dépôt non analysé'];
  let exceptions;
  try {
    exceptions = JSON.parse(lire(`${racine}/outils/gardes/litteraux-exceptions.json`));
    if (!Array.isArray(exceptions)) return ['litteraux-exceptions.json doit être une liste'];
  } catch (e) {
    return [`litteraux-exceptions.json illisible : ${e.code ?? e.message}`];
  }
  const fichiers = [];
  const pb = [];
  for (const f of liste.split('\0').filter((x) => x && !estExclu(x))) {
    try {
      fichiers.push({ chemin: f, texte: lire(`${racine}/${f}`) });
    } catch (e) {
      pb.push(`${f} illisible : ${e.code ?? e.message}`);
    }
  }
  return [...pb, ...analyser(fichiers, exceptions)];
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const pb = analyserDepot();
  if (pb.length > 0) {
    console.error('garde:litteraux ROUGE\n' + pb.map((p) => ' - ' + p).join('\n'));
    process.exit(1);
  }
  console.log('garde:litteraux vert');
}
