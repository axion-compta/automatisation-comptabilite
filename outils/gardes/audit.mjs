// garde:audit : aucune écriture dans les tables du journal hors de service-audit.ts (V3-PLA-030, V3-SEC-005).
// Rouge si un fichier suivi (.ts, .tsx, .mts, .cts, .js, .mjs, .cjs, .sql) (hors service-audit.ts et tests) contient INSERT, UPDATE, DELETE, TRUNCATE ou DROP visant une table du journal.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const SERVICE = 'apps/serveur/src/securite/service-audit.ts';
const TABLES = '(?:"?a_compta"?\\.)?"?(?:tete_journal|entree_journal)"?';
const ECRITURE = new RegExp(
  `\\b(?:insert\\s+into|update|delete\\s+from|truncate(?:\\s+table)?|drop\\s+table(?:\\s+if\\s+exists)?|alter\\s+table(?:\\s+only)?)\\s+(?:only\\s+)?${TABLES}(?![\\w"])`,
  'i',
);
// Les noms de tables passés par constante sont aussi interdits hors du service (ils serviraient à écrire sans que la garde le voie).
const CONSTANTES = /\bTABLE_(?:ENTREES|TETE)\b/g;
const ESTIME = /\.(?:[cm]?[jt]sx?|sql)$/;
const EXCLU = /(?:^|\/)(?:__tests__|node_modules)\/|\.(?:test|spec)\.[cm]?[jt]sx?$/;

export function analyserTexte(texte, chemin) {
  if (chemin === SERVICE || !ESTIME.test(chemin) || EXCLU.test(chemin)) return [];
  const pb = [];
  // Un ordre SQL peut s'étendre sur plusieurs lignes : on contrôle le texte entier, la ligne est celle du début.
  const re = new RegExp(ECRITURE.source, 'gi');
  for (const m of texte.matchAll(re)) {
    const ligne = texte.slice(0, m.index).split('\n').length;
    pb.push(`${chemin}:${ligne} écriture dans le journal hors du service d'audit`);
  }
  for (const m of texte.matchAll(CONSTANTES)) {
    const ligne = texte.slice(0, m.index).split('\n').length;
    pb.push(`${chemin}:${ligne} nom de table du journal (${m[0]}) utilisé hors du service d'audit`);
  }
  return pb;
}

export function analyserDepot(fichiers, lire = (f) => readFileSync(f, 'utf8')) {
  return fichiers.flatMap((f) => analyserTexte(lire(f), f));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = spawnSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) {
    console.error('garde:audit git ls-files a échoué');
    process.exit(1);
  }
  const pb = analyserDepot(r.stdout.split('\0').filter((f) => ESTIME.test(f)));
  if (pb.length > 0) {
    for (const p of pb) console.error('garde:audit ' + p);
    process.exit(1);
  }
  console.log('garde:audit vert');
}
