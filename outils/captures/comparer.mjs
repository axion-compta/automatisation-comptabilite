// Compare deux dossiers de captures PNG par empreinte SHA-256 (identité d'octets).
// Usage : node outils/captures/comparer.mjs <dossier-1> <dossier-2> ; sortie non nulle au moindre écart.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const empreintes = (dossier) => {
  const m = new Map();
  for (const f of readdirSync(dossier, { withFileTypes: true })) {
    if (f.isFile() && f.name.endsWith('.png')) m.set(f.name, createHash('sha256').update(readFileSync(join(dossier, f.name))).digest('hex'));
  }
  return m;
};

export function comparerDossiers(premier, second) {
  let a;
  let b;
  try {
    a = empreintes(premier);
    b = empreintes(second);
  } catch (e) {
    return [`dossier illisible : ${e.message}`];
  }
  if (a.size === 0 && b.size === 0) return ['aucune capture à comparer'];
  const pb = [];
  for (const nom of [...new Set([...a.keys(), ...b.keys()])].sort()) {
    if (!b.has(nom)) pb.push(`capture manquante au second passage : ${nom}`);
    else if (!a.has(nom)) pb.push(`capture manquante au premier passage : ${nom}`);
    else if (a.get(nom) !== b.get(nom)) pb.push(`capture différente : ${nom}`);
  }
  return pb;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [premier, second] = process.argv.slice(2);
  const pb = premier && second ? comparerDossiers(premier, second) : ['usage : comparer.mjs <dossier-1> <dossier-2>'];
  if (pb.length > 0) {
    for (const p of pb) console.error('captures ' + p);
    process.exit(1);
  }
  console.log('captures identiques : 0 capture différente');
}
