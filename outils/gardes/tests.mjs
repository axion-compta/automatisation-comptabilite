// garde:tests : un test sans assertion est rouge ; un test sauté sans carte (fiche LNN-TMM) est rouge (V3-QUA-019).
// Sans argument : analyse les fichiers de test suivis par git (hors outils/canari/).
// Avec des chemins (fichiers ou dossiers) : analyse ces chemins sur le disque (utilisé pour le canari).
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const EST_TEST = /\.(test|spec)\.[cm]?[jt]sx?$/;
const CARTE = /\bL\d{2}-T\d{2}\b/;
const APPEL = /\b(it|test)\b(?:\s*\.\s*(skip|only|todo|fails|concurrent|sequential|each))?\s*\(/g;
const ASSERTION = /\b(?:expect|assert|verifier|verifie|fail)\w*\s*[.(]|\bt\s*\.\s*(?:assert|deepEqual|equal|ok|throws|rejects|snapshot)\w*\s*\(/;

// Remplace par des espaces le contenu des commentaires, chaînes et gabarits (longueur et retours à la ligne conservés).
export function masquer(t) {
  let s = '';
  let i = 0;
  const blanc = (c) => (c === '\n' ? '\n' : ' ');
  while (i < t.length) {
    const c = t[i];
    const d = t[i + 1];
    if (c === '/' && d === '/') {
      while (i < t.length && t[i] !== '\n') s += blanc(t[i++]);
    } else if (c === '/' && d === '*') {
      const fin = t.indexOf('*/', i + 2);
      const j = fin < 0 ? t.length : fin + 2;
      while (i < j) s += blanc(t[i++]);
    } else if (c === '"' || c === "'" || c === '`') {
      s += c;
      i++;
      while (i < t.length && t[i] !== c && (c === '`' || t[i] !== '\n')) {
        if (t[i] === '\\') s += blanc(t[i++]);
        if (i < t.length) s += blanc(t[i++]);
      }
      if (i < t.length) s += t[i++];
    } else {
      s += c;
      i++;
    }
  }
  return s;
}

function fermante(m, debut) {
  let n = 0;
  for (let i = debut; i < m.length; i++) {
    if (m[i] === '(') n++;
    else if (m[i] === ')' && --n === 0) return i;
  }
  return m.length;
}

// Retourne la liste des problèmes « fichier:ligne message ».
export function analyserTexte(texte, nom) {
  const m = masquer(texte);
  const lignes = texte.split(/\r?\n/);
  const ligneDe = (pos) => m.slice(0, pos).split('\n').length;
  const pb = [];
  const exigerCarte = (l, quoi) => {
    if (!CARTE.test(lignes[l - 1] ?? '') && !CARTE.test(lignes[l - 2] ?? '')) {
      pb.push(`${nom}:${l} ${quoi} sans carte (écrire LNN-TMM sur la ligne ou la précédente)`);
    }
  };
  APPEL.lastIndex = 0;
  let r;
  while ((r = APPEL.exec(m)) !== null) {
    const l = ligneDe(r.index);
    const mod = r[2];
    let ouvrante = r.index + r[0].length - 1;
    if (mod === 'each') {
      const f = fermante(m, ouvrante);
      const suite = m.slice(f + 1).match(/^\s*\(/);
      if (!suite) continue;
      ouvrante = f + suite[0].length;
    }
    if (mod === 'only') pb.push(`${nom}:${l} .only interdit`);
    if (mod === 'skip' || mod === 'todo') exigerCarte(l, `test ${mod === 'skip' ? 'sauté' : 'à faire'}`);
    const corps = m.slice(ouvrante, fermante(m, ouvrante) + 1);
    if (/\bskip\s*:/.test(corps)) exigerCarte(l, 'option skip');
    if (mod === 'todo' || mod === 'skip') continue;
    if (!ASSERTION.test(corps)) pb.push(`${nom}:${l} test sans assertion`);
  }
  for (const x of m.matchAll(/(?<![\w.])(?:xit|xtest|xdescribe)\s*\(|\b(?:describe|suite)\s*\.\s*skip\s*\(|\bt\s*\.\s*skip\s*\(/g)) {
    exigerCarte(ligneDe(x.index), 'test sauté');
  }
  return pb;
}

function parcourir(chemin, out) {
  if (statSync(chemin).isDirectory()) {
    for (const e of readdirSync(chemin)) if (e !== 'node_modules') parcourir(join(chemin, e), out);
  } else out.push(chemin);
}

export function analyserFichiers(fichiers, lire = (f) => readFileSync(f, 'utf8')) {
  return fichiers.flatMap((f) => analyserTexte(lire(f), f));
}

function fichiersSuivis() {
  const r = spawnSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error('git ls-files impossible');
  return r.stdout.split('\0').filter((f) => EST_TEST.test(f) && !f.startsWith('outils/canari/'));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let fichiers;
  try {
    const args = process.argv.slice(2);
    if (args.length > 0) {
      fichiers = [];
      for (const a of args) parcourir(a, fichiers);
      fichiers = fichiers.filter((f) => /\.[cm]?[jt]sx?$/.test(f));
    } else fichiers = fichiersSuivis();
    const pb = analyserFichiers(fichiers);
    if (pb.length > 0) {
      console.error('garde:tests ROUGE\n' + pb.map((p) => ' - ' + p.replace(/\\/g, '/')).join('\n'));
      process.exit(1);
    }
    console.log(`garde:tests vert (${fichiers.length} fichier(s) de test)`);
  } catch (e) {
    console.error('garde:tests ROUGE\n - ' + e.message);
    process.exit(1);
  }
}
