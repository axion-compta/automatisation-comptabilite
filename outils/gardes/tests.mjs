// garde:tests : un test sans assertion est rouge ; un test sauté sans carte (fiche LNN-TMM) est rouge (V3-QUA-019).
// Sans argument : analyse les fichiers de test suivis par git (hors outils/canari/).
// Avec des chemins (fichiers ou dossiers) : analyse ces chemins sur le disque (utilisé pour le canari).
// Limites (analyse statique simple) : assertion factice (expect(true).toBe(true)), assertion dans du code mort,
// expect.assertions(0) ne sont pas détectées.
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EST_TEST = /\.(test|spec)\.[cm]?[jt]sx?$/;
const CARTE = /\bL\d{2}-T\d{2}\b/;
const APPEL = /(?<![\w.$])(it|test)((?:\s*\.\s*\w+)*)\s*([(`])/g;
const ASSERTION = /\bexpect(?:\.soft)?\s*\(|\bexpectTypeOf\s*\(|\bassert(?:\.\w+)?\s*\(|\bt\.assert\.\w+\s*\(/;
const APPELE_PUIS_APPEL = ['each', 'skipIf', 'runIf'];
const AVEC_CARTE = ['skip', 'todo', 'skipIf', 'runIf'];

// Remplace par des espaces le contenu des commentaires, chaînes, gabarits et littéraux regex (retours à la ligne conservés).
export function masquer(t) {
  let s = '';
  let i = 0;
  const blanc = (c) => (c === '\n' ? '\n' : ' ');
  while (i < t.length) {
    const c = t[i];
    const d = t[i + 1];
    const avant = s.trimEnd().slice(-1);
    if (c === '/' && d === '/') {
      while (i < t.length && t[i] !== '\n') s += blanc(t[i++]);
    } else if (c === '/' && d === '*') {
      const fin = t.indexOf('*/', i + 2);
      const j = fin < 0 ? t.length : fin + 2;
      while (i < j) s += blanc(t[i++]);
    } else if (c === '/' && (avant === '' || '(,=:[!&|?{;}'.includes(avant))) {
      s += c;
      i++;
      for (let classe = false; i < t.length && t[i] !== '\n' && (classe || t[i] !== '/'); ) {
        if (t[i] === '\\') s += blanc(t[i++]);
        else if (t[i] === '[') classe = true;
        else if (t[i] === ']') classe = false;
        if (i < t.length) s += blanc(t[i++]);
      }
      if (i < t.length && t[i] === '/') s += t[i++];
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

function fermante(m, debut, o = '(', f = ')') {
  let n = 0;
  for (let i = debut; i < m.length; i++) {
    if (m[i] === o) n++;
    else if (m[i] === f && --n === 0) return i;
  }
  return m.length;
}

// Fin de l'expression qui commence en i : premier « ; » ou retour à la ligne hors parenthèses.
function finExpression(m, i) {
  let n = 0;
  for (; i < m.length; i++) {
    if ('([{'.includes(m[i])) n++;
    else if (')]}'.includes(m[i])) n--;
    else if (n <= 0 && (m[i] === ';' || m[i] === '\n') && m.slice(0, i).trim() !== '') return i;
  }
  return m.length;
}

// Aides déclarées dans le fichier (const f = (...) =>, function f(...)) dont le corps, borné à leur propre fonction,
// contient une assertion, directement ou par une autre aide.
export function aidesAvecAssertion(m) {
  const aides = new Map();
  const decl = /\b(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>|\bfunction\s*\*?\s*(\w+)\s*\([^)]*\)/g;
  for (const r of m.matchAll(decl)) {
    let p = r.index + r[0].length;
    while (/\s/.test(m[p] ?? '')) p++;
    const fin = m[p] === '{' ? fermante(m, p, '{', '}') : finExpression(m, p);
    aides.set(r[1] ?? r[2], m.slice(p, fin + 1));
  }
  const bonnes = [];
  for (let change = true; change; ) {
    change = false;
    for (const [nom, corps] of aides) {
      if (!bonnes.includes(nom) && (ASSERTION.test(corps) || bonnes.some((b) => new RegExp(`\\b${b}\\s*\\(`).test(corps)))) {
        bonnes.push(nom);
        change = true;
      }
    }
  }
  return bonnes;
}

// Retourne la liste des problèmes « fichier:ligne message ».
export function analyserTexte(texte, nom) {
  const m = masquer(texte);
  const lignes = texte.split(/\r?\n/);
  const ligneDe = (pos) => m.slice(0, pos).split('\n').length;
  const pb = [];
  const aides = aidesAvecAssertion(m);
  const asserte = (corps) => ASSERTION.test(corps) || aides.some((a) => new RegExp(`\\b${a}\\s*\\(`).test(corps));
  const exigerCarte = (l, quoi) => {
    if (!CARTE.test(lignes[l - 1] ?? '') && !CARTE.test(lignes[l - 2] ?? '')) {
      pb.push(`${nom}:${l} ${quoi} sans carte (écrire LNN-TMM sur la ligne ou la précédente)`);
    }
  };
  for (const r of m.matchAll(APPEL)) {
    const l = ligneDe(r.index);
    const mods = r[2].match(/\w+/g) ?? [];
    let ouvrante = r.index + r[0].length - 1;
    if (r[3] === '`') ouvrante = m.indexOf('`', ouvrante + 1);
    else if (mods.some((x) => APPELE_PUIS_APPEL.includes(x))) ouvrante = fermante(m, ouvrante);
    else ouvrante = -1;
    if (ouvrante >= 0 || r[3] === '`') {
      const suite = m.slice(ouvrante + 1).match(/^\s*\(/);
      if (!suite) continue;
      ouvrante += suite[0].length;
    } else ouvrante = r.index + r[0].length - 1;
    const motif = mods.find((x) => AVEC_CARTE.includes(x));
    if (motif) exigerCarte(l, motif === 'skip' || motif === 'skipIf' ? 'test sauté' : motif === 'todo' ? 'test à faire' : 'test conditionnel');
    const corps = m.slice(ouvrante, fermante(m, ouvrante) + 1);
    if (/\b(?:skip|todo)\s*:/.test(corps)) exigerCarte(l, 'option skip ou todo');
    if (mods.includes('todo') || mods.includes('skip')) continue;
    if (!asserte(corps)) pb.push(`${nom}:${l} test sans assertion`);
  }
  for (const x of m.matchAll(/(?<![\w.])(?:xit|xtest|xdescribe)\s*\(|\b(?:describe|suite)\s*\.\s*(?:skip|todo)\s*\(|\bt\s*\.\s*(?:skip|todo)\s*\(/g)) {
    exigerCarte(ligneDe(x.index), 'test sauté');
  }
  for (const x of m.matchAll(/\b(?:describe|suite|it|test)\s*\.\s*only\s*\(|\bonly\s*:\s*true/g)) {
    pb.push(`${nom}:${ligneDe(x.index)} .only interdit`);
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
