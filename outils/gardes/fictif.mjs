// garde:fictif : données fictives seulement (V3-PRI-017).
// Rouge si un fichier suivi contient une adresse e-mail hors @exemple.fr ou un IBAN au format valide.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const EMAIL = /[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})/g;
const IBAN = /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,4})?\b/g;

function ibanValide(brut) {
  const s = brut.replace(/ /g, '');
  if (s.length < 15 || s.length > 34) return false;
  const r = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let reste = 0;
  for (const ch of r) reste = (reste * 10 + Number(ch)) % 97;
  return reste === 1;
}

export function analyserTexte(texte, nom) {
  const pb = [];
  texte.split(/\r?\n/).forEach((l, i) => {
    for (const m of l.matchAll(EMAIL)) {
      if (m[1].toLowerCase() !== 'exemple.fr') pb.push(`${nom}:${i + 1} e-mail hors @exemple.fr : ${m[0]}`);
    }
    for (const m of l.matchAll(IBAN)) {
      const s = m[0].replace(/ /g, '');
      let ok = false;
      for (let n = 15; n <= Math.min(34, s.length); n++) ok ||= ibanValide(s.slice(0, n));
      if (ok) pb.push(`${nom}:${i + 1} IBAN au format valide interdit`);
    }
  });
  return pb;
}

const IGNORES = /(^|\/)(pnpm-lock\.yaml|node_modules\/.*)$|\.(png|jpe?g|gif|ico|woff2?)$/;
// Seuls dossiers où un PDF suivi est admis (fichiers fictifs, non analysés). Tout autre PDF = rouge.
export const DOSSIERS_PDF_FICTIFS = ['packages/donnees-fictives/'];

function gitReel(args, cwd) {
  const r = spawnSync('git', args, { encoding: 'utf8', cwd, maxBuffer: 1 << 28 });
  return r.status === 0 ? r.stdout : null;
}

// git : (args, cwd) => sortie ou null si échec ; lire : (chemin absolu) => texte.
export function analyserDepot(git = gitReel, lire = (f) => readFileSync(f, 'utf8')) {
  const racine = git(['rev-parse', '--show-toplevel'])?.trim();
  if (!racine) return ['git rev-parse --show-toplevel a échoué : dépôt non analysé'];
  const liste = git(['ls-files', '-z'], racine);
  if (liste === null) return ['git ls-files a échoué : dépôt non analysé'];
  const pb = [];
  for (const f of liste.split('\0').filter((x) => x && !IGNORES.test(x))) {
    if (/\.pdf$/i.test(f)) {
      if (!DOSSIERS_PDF_FICTIFS.some((d) => f.startsWith(d))) pb.push(`${f} PDF suivi hors dossier fictif (non analysable)`);
      continue;
    }
    try {
      pb.push(...analyserTexte(lire(`${racine}/${f}`), f));
    } catch (e) {
      pb.push(`${f} illisible : ${e.code ?? e.message}`);
    }
  }
  return pb;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const pb = analyserDepot();
  if (pb.length > 0) {
    console.error('garde:fictif ROUGE\n' + pb.map((p) => ' - ' + p).join('\n'));
    process.exit(1);
  }
  console.log('garde:fictif vert');
}
