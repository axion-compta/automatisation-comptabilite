// garde:licences : inventaire des licences des paquets installés (V3-PLA-171).
// Rouge si une licence n'est pas dans la liste permise, ou si elle est absente.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PERMISES = new Set([
  'MIT', 'MIT-0', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD', 'BlueOak-1.0.0',
  'CC0-1.0', 'CC-BY-4.0', 'Python-2.0', 'Unlicense', 'OFL-1.1', 'MPL-2.0',
]);

// Exceptions SPDX acceptées après WITH (liste dédiée) ; toute autre exception = rouge.
export const EXCEPTIONS_PERMISES = new Set(['LLVM-exception']);

const MOTS = new Set(['AND', 'OR', 'WITH', '(', ')']);

// Analyseur d'expression SPDX : descente récursive, AND lie plus fort que OR,
// parenthèses respectées. Toute erreur d'analyse renvoie false.
export function licencePermise(expr) {
  if (typeof expr !== 'string' || expr.trim() === '') return false;
  const jetons = expr.match(/\(|\)|[^\s()]+/g) ?? [];
  let i = 0;
  const erreur = new Error('analyse');
  const ou = () => {
    let v = et();
    while (jetons[i] === 'OR') { i++; const w = et(); v = v || w; }
    return v;
  };
  const et = () => {
    let v = terme();
    while (jetons[i] === 'AND') { i++; const w = terme(); v = v && w; }
    return v;
  };
  const terme = () => {
    const j = jetons[i];
    if (j === undefined || (MOTS.has(j) && j !== '(')) throw erreur;
    i++;
    if (j === '(') {
      const v = ou();
      if (jetons[i] !== ')') throw erreur;
      i++;
      return v;
    }
    let ok = PERMISES.has(j);
    if (jetons[i] === 'WITH') {
      i++;
      const ex = jetons[i];
      if (ex === undefined || MOTS.has(ex)) throw erreur;
      i++;
      ok = ok && EXCEPTIONS_PERMISES.has(ex);
    }
    return ok;
  };
  try {
    const v = ou();
    return i === jetons.length ? v : false;
  } catch {
    return false;
  }
}

export function analyserLicences(paquets) {
  const pb = [];
  for (const { nom, licence } of paquets) {
    if (!licencePermise(licence)) pb.push(`${nom} : licence non permise ou absente (${licence ?? 'aucune'})`);
  }
  return pb;
}

export function lirePaquets(racine) {
  const dossier = join(racine, 'node_modules', '.pnpm');
  if (!existsSync(dossier)) return [];
  const res = [];
  for (const entree of readdirSync(dossier)) {
    const base = join(dossier, entree, 'node_modules');
    if (!existsSync(base)) continue;
    for (const n of readdirSync(base)) {
      const noms = n.startsWith('@') ? readdirSync(join(base, n)).map((s) => join(n, s)) : [n];
      for (const nom of noms) {
        const f = join(base, nom, 'package.json');
        if (!existsSync(f)) continue;
        try {
          const p = JSON.parse(readFileSync(f, 'utf8'));
          let licence = typeof p.license === 'string' ? p.license : p.license?.type;
          if (licence === undefined && Array.isArray(p.licenses)) {
            const types = p.licenses.map((l) => (typeof l === 'string' ? l : l?.type)).filter(Boolean);
            if (types.length > 0) licence = types.join(' OR ');
          }
          res.push({ nom: `${p.name ?? nom}@${p.version ?? '?'}`, licence });
        } catch { /* package.json illisible : ignoré */ }
      }
    }
  }
  return [...new Map(res.map((p) => [p.nom, p])).values()];
}

// Exécute la garde sur la racine donnée et renvoie le code de sortie.
export function executer(racine) {
  const paquets = lirePaquets(racine);
  if (paquets.length === 0) {
    console.error('garde:licences ROUGE : aucun paquet trouvé dans node_modules/.pnpm (lancer pnpm install)');
    return 1;
  }
  const pb = analyserLicences(paquets);
  if (pb.length > 0) {
    console.error('garde:licences ROUGE\n' + pb.map((x) => ' - ' + x).join('\n'));
    return 1;
  }
  console.log(`garde:licences vert (${paquets.length} paquets contrôlés)`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(executer(process.cwd()));
}
