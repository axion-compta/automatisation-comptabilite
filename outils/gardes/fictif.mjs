// garde:fictif : données fictives seulement (V3-PRI-017).
// Rouge si un fichier suivi contient une adresse e-mail hors @exemple.fr ou un IBAN au format valide.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const EMAIL = /[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})/g;
const IBAN = /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){3,7}(?: ?[A-Z0-9]{1,4})?\b/g;

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
      if (ibanValide(m[0])) pb.push(`${nom}:${i + 1} IBAN au format valide interdit`);
    }
  });
  return pb;
}

const IGNORES = /(^|\/)(pnpm-lock\.yaml|node_modules\/.*)$|\.(png|jpe?g|gif|ico|woff2?|pdf)$/;

export function analyserDepot() {
  const r = spawnSync('git', ['ls-files'], { encoding: 'utf8' });
  const pb = [];
  for (const f of r.stdout.split('\n').filter((x) => x && !IGNORES.test(x))) {
    let texte;
    try {
      texte = readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    pb.push(...analyserTexte(texte, f));
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
