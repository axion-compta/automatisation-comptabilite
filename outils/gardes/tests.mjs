// garde:tests (V3-QUA-019) : rouge si un test n'a pas d'assertion, si un skip/todo/skipIf/runIf n'a pas de carte LNN-TMM, ou .only.
// Sans argument : tests suivis par git (hors outils/canari/) ; avec chemins : ces chemins (canari). Limites : assertion factice,
// code mort, expect.assertions(0), aide importée d'un autre fichier.
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EST_TEST = /\.(test|spec)\.[cm]?[jt]sx?$/;
const CARTE = /\bL\d{2}-T\d{2}\b/;
const CHAINE = String.raw`(?<![\w.$])(?:describe|suite|it|test)((?:\s*\.\s*\w+)*)`;
const ASSERTION = /\bexpect(?:\.soft)?\s*\(|\bexpectTypeOf\s*\(|\bassert(?:\.\w+)?\s*\(|\bt\.assert\.\w+\s*\(/;
const appelle = (corps, noms) => noms.some((b) => new RegExp(`\\b${b}\\s*\\(`).test(corps));
const ONLY = String.raw`(?<![\w.$])(?:describe|suite|it|test)(?:\s*\.\s*\w+)*\s*\.\s*only\b|\bonly\s*:(?!\s*false\b)`;
const ENCHAINES = ['each', 'skipIf', 'runIf']; // modificateurs qui renvoient une fonction à rappeler

// Remplace par des espaces le contenu des commentaires, chaînes, gabarits et littéraux regex (retours à la ligne conservés).
export function masquer(t) {
  let s = '';
  let i = 0;
  const blanc = (c) => (c === '\n' ? '\n' : ' ');
  while (i < t.length) {
    const c = t[i];
    const avant = s.trimEnd().slice(-1);
    if (c === '/' && t[i + 1] === '/') {
      while (i < t.length && t[i] !== '\n') s += blanc(t[i++]);
    } else if (c === '/' && t[i + 1] === '*') {
      const fin = t.indexOf('*/', i + 2);
      for (const j = fin < 0 ? t.length : fin + 2; i < j; ) s += blanc(t[i++]);
    } else if (c === '/' && (avant === '' || '(,=:[!&|?{;}'.includes(avant))) {
      s += t[i++];
      for (let classe = false; i < t.length && t[i] !== '\n' && (classe || t[i] !== '/'); ) {
        if (t[i] === '\\') s += blanc(t[i++]);
        else if (t[i] === '[' || t[i] === ']') classe = t[i] === '[';
        if (i < t.length) s += blanc(t[i++]);
      }
      if (t[i] === '/') s += t[i++];
    } else if (c === '"' || c === "'" || c === '`') {
      s += t[i++];
      while (i < t.length && t[i] !== c && (c === '`' || t[i] !== '\n')) {
        if (t[i] === '\\') s += blanc(t[i++]);
        if (i < t.length) s += blanc(t[i++]);
      }
      if (i < t.length) s += t[i++];
    } else s += t[i++];
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
  for (let n = 0; i < m.length; i++) {
    if ('([{'.includes(m[i])) n++;
    else if (')]}'.includes(m[i])) n--;
    else if (n <= 0 && (m[i] === ';' || m[i] === '\n')) return i;
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
    aides.set(r[1] ?? r[2], m.slice(p, (m[p] === '{' ? fermante(m, p, '{', '}') : finExpression(m, p)) + 1));
  }
  const bonnes = [];
  for (let change = true; change; ) {
    change = false;
    for (const [nom, corps] of aides) {
      if (!bonnes.includes(nom) && (ASSERTION.test(corps) || appelle(corps, bonnes))) change = !!bonnes.push(nom);
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
  const carte = (pos, quoi) => {
    const l = ligneDe(pos);
    if (!CARTE.test(lignes[l - 1] ?? '') && !CARTE.test(lignes[l - 2] ?? '')) {
      pb.push(`${nom}:${l} ${quoi} sans carte (écrire LNN-TMM sur la ligne ou la précédente)`);
    }
  };
  for (const r of m.matchAll(new RegExp(CHAINE + String.raw`\s*([(\x60])`, 'g'))) {
    const mods = r[1].match(/\w+/g) ?? [];
    if (mods.some((x) => ['skip', 'todo', 'skipIf', 'runIf'].includes(x))) carte(r.index, 'test sauté ou conditionnel');
    const ordinaire = /^(it|test)\b/.test(r[0].trimStart()) && !mods.some((x) => ['skip', 'todo', 'extend', 'scoped'].includes(x));
    let o = r.index + r[0].length - 1;
    if (r[2] === '`') o = m.indexOf('`', o + 1);
    else if (mods.some((x) => ENCHAINES.includes(x))) o = fermante(m, o);
    else o = -1;
    if (o >= 0) {
      const suite = m.slice(o + 1).match(/^\s*\(/);
      if (!suite) continue;
      o += suite[0].length;
    } else o = r.index + r[0].length - 1;
    const corps = m.slice(o, fermante(m, o) + 1);
    const asserte = ASSERTION.test(corps) || appelle(corps, aides);
    if (ordinaire && !asserte) pb.push(`${nom}:${ligneDe(r.index)} test sans assertion`);
  }
  for (const x of m.matchAll(/(?<![\w.])(?:xit|xtest|xdescribe)\s*\(|(?<![\w.$])(?!(?:it|test|describe|suite)\s*\.)\w+\s*\.\s*(?:skip|todo)\s*\(|(?<![\w.$])skip\s*\(|\b(?:skip|todo)\s*:(?!\s*false\b)/g)) {
    carte(x.index, 'test sauté ou à faire');
  }
  for (const x of m.matchAll(/import\s*\{[^}]*\b(?:it|test|describe|suite)\s+as\s+\w+[^}]*\}\s*from\s*['"]/g)) {
    if (/^(?:vitest|node:test)['"]/.test(texte.slice(x.index + x[0].length))) pb.push(`${nom}:${ligneDe(x.index)} alias de test interdit : la garde ne le suit pas`);
  }
  for (const x of m.matchAll(new RegExp(ONLY, 'g'))) {
    pb.push(`${nom}:${ligneDe(x.index)} .only interdit`);
  }
  return pb;
}

function parcourir(chemin, out) {
  if (statSync(chemin).isDirectory()) {
    for (const e of readdirSync(chemin)) if (e !== 'node_modules') parcourir(join(chemin, e), out);
  } else out.push(chemin);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    let fichiers = [];
    if (process.argv.length > 2) {
      for (const a of process.argv.slice(2)) parcourir(a, fichiers);
      fichiers = fichiers.filter((f) => /\.[cm]?[jt]sx?$/.test(f));
    } else {
      const r = spawnSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 1 << 28 });
      if (r.status !== 0) throw new Error('git ls-files impossible');
      fichiers = r.stdout.split('\0').filter((f) => EST_TEST.test(f) && !f.startsWith('outils/canari/'));
    }
    const pb = fichiers.flatMap((f) => analyserTexte(readFileSync(f, 'utf8'), f));
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
