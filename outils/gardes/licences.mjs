// garde:licences : inventaire des licences des paquets installés (V3-PLA-171).
// Rouge si une licence n'est pas dans la liste permise, ou si elle est absente.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PERMISES = new Set([
  'MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD', 'BlueOak-1.0.0',
  'CC0-1.0', 'CC-BY-4.0', 'Python-2.0', 'Unlicense', 'OFL-1.1', 'MPL-2.0',
]);

// Une expression SPDX est permise si chaque alternative « OR » contient au moins
// un choix permis, et si tous les termes « AND » sont permis.
export function licencePermise(expr) {
  if (typeof expr !== 'string' || expr.trim() === '') return false;
  const nettoyee = expr.replace(/[()]/g, ' ');
  return nettoyee.split(/\s+OR\s+/).some((alt) => alt.split(/\s+AND\s+/).every((t) => PERMISES.has(t.trim())));
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
          const licence = typeof p.license === 'string' ? p.license : p.license?.type;
          res.push({ nom: `${p.name ?? nom}@${p.version ?? '?'}`, licence });
        } catch { /* package.json illisible : ignoré */ }
      }
    }
  }
  return [...new Map(res.map((p) => [p.nom, p])).values()];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const paquets = lirePaquets(process.cwd());
  const pb = analyserLicences(paquets);
  if (pb.length > 0) {
    console.error('garde:licences ROUGE\n' + pb.map((x) => ' - ' + x).join('\n'));
    process.exit(1);
  }
  console.log(`garde:licences vert (${paquets.length} paquets contrôlés)`);
}
