// garde:migrations : migrations seulement additives, schéma compatible N et N-1 (V3-PLA-106, V3-PLA-103).
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DOSSIER = 'apps/serveur/src/base/migrations';

// Remplace commentaires, chaînes '…' et corps $$…$$ par des espaces (retours à la ligne conservés).
function nettoyer(t) {
  let s = '';
  const vide = (x) => x.replace(/[^\r\n]/g, ' ');
  for (let i = 0; i < t.length; ) {
    const reste = t.slice(i);
    let m;
    if ((m = /^--[^\n]*/.exec(reste))) s += vide(m[0]);
    else if ((m = /^\/\*[\s\S]*?(?:\*\/|$)/.exec(reste))) s += vide(m[0]);
    else if ((m = /^'(?:[^']|'')*(?:'|$)/.exec(reste))) s += vide(m[0]);
    else if ((m = /^\$([A-Za-z_]\w*)?\$/.exec(reste))) {
      const fin = t.indexOf(m[0], i + m[0].length);
      m = [t.slice(i, fin < 0 ? t.length : fin + m[0].length)];
      s += vide(m[0]);
    } else {
      m = [t[i]];
      s += t[i];
    }
    i += m[0].length;
  }
  return s;
}

export function analyserMigration(texte, nom) {
  const t = nettoyer(texte);
  const pb = [];
  const ajout = (idx, mot) =>
    pb.push({ fichier: nom, ligne: t.slice(0, idx).split('\n').length, code: 'ordre_destructeur', mot });
  const motifs = [
    [/\bDROP\s+TABLE\b/gi, 'DROP TABLE'],
    [/\bDROP\s+COLUMN\b/gi, 'DROP COLUMN'],
    [/\bDROP\s+SCHEMA\b/gi, 'DROP SCHEMA'],
    [/\bRENAME\b/gi, 'RENAME'],
    [/\bALTER\s+COLUMN\b[^;]*?\bTYPE\b/gi, 'ALTER COLUMN TYPE'],
    [/\bALTER\s+COLUMN\b[^;]*?\bSET\s+NOT\s+NULL\b/gi, 'ALTER COLUMN SET NOT NULL'],
    [/\bTRUNCATE\b/gi, 'TRUNCATE'],
    [/\bDELETE\s+FROM\b/gi, 'DELETE'],
  ];
  for (const [re, mot] of motifs) for (const m of t.matchAll(re)) ajout(m.index, mot);
  const crees = new Set([...t.matchAll(/\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?([\w."]+)/gi)].map((m) => m[1]));
  for (const m of t.matchAll(/\bDROP\s+INDEX\b\s*([^;]*)/gi)) {
    const ok = /^CONCURRENTLY\s+IF\s+EXISTS\s+([\w."]+)\s*$/i.exec(m[1].trim());
    if (!ok || !crees.has(ok[1])) ajout(m.index, 'DROP INDEX');
  }
  for (const m of t.matchAll(/\bADD\s+COLUMN\b/gi)) {
    let prof = 0;
    let j = m.index + m[0].length;
    for (; j < t.length; j++) {
      if (t[j] === '(') prof++;
      else if (t[j] === ')') prof--;
      else if ((t[j] === ',' && prof === 0) || t[j] === ';') break;
    }
    const clause = t.slice(m.index, j);
    if (/\bNOT\s+NULL\b/i.test(clause) && !/\bDEFAULT\b/i.test(clause)) ajout(m.index, 'ADD COLUMN NOT NULL');
  }
  let debut = 0;
  for (const ordre of t.split(';')) {
    const u = /^\s*UPDATE\b/i.exec(ordre);
    if (u && !/\bWHERE\b/i.test(ordre)) ajout(debut + u[0].length - 6, 'UPDATE');
    debut += ordre.length + 1;
  }
  return pb.sort((a, b) => a.ligne - b.ligne);
}

export function analyserNoms(noms) {
  const pb = [];
  const vus = new Set();
  let dernier = -1;
  for (const n of noms) {
    const f = basename(n);
    const m = /^(\d{3})-[a-z0-9]+(?:-[a-z0-9]+)*\.sql$/.exec(f);
    if (!m) pb.push({ fichier: f, ligne: 0, code: 'nom_invalide' });
    else if (vus.has(m[1])) pb.push({ fichier: f, ligne: 0, code: 'numero_en_double' });
    else {
      vus.add(m[1]);
      if (Number(m[1]) < dernier) pb.push({ fichier: f, ligne: 0, code: 'ordre_inverse' });
      dernier = Math.max(dernier, Number(m[1]));
    }
  }
  return pb;
}

export function analyserModifications(lignes) {
  const pb = [];
  for (const l of lignes) {
    const [statut, ancien] = l.split('\t');
    if (/^[MDRT]/.test(statut) && ancien?.startsWith(DOSSIER + '/')) pb.push({ fichier: ancien, ligne: 0, code: 'migration_modifiee' });
  }
  return pb;
}

export function analyserDossier({ fichiers, modifies, lire = (f) => readFileSync(f, 'utf8') }) {
  const pb = [...analyserNoms(fichiers), ...analyserModifications(modifies)];
  for (const f of fichiers) if (f.endsWith('.sql')) pb.push(...analyserMigration(lire(f), f));
  return pb;
}

function git(args) {
  const r = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28 });
  return r.status === 0 ? r.stdout.split('\n').filter(Boolean) : null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fichiers = git(['ls-files', DOSSIER]) ?? [];
  const modifies = git(['diff', '--name-status', 'origin/main...HEAD']) ?? [];
  const pb = analyserDossier({ fichiers, modifies });
  if (pb.length > 0) {
    for (const p of pb) console.error(`garde:migrations ${p.fichier}:${p.ligne} ${p.code}${p.mot ? ' ' + p.mot : ''}`);
    process.exit(1);
  }
  console.log('garde:migrations vert');
}
