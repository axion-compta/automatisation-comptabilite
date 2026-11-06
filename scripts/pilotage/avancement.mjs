// Pilotage sans IA : avancement des fiches (nombre fait / total, par lot).
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// fiches : [{ id, statut }] ; renvoie { total, fait, lots: { '00': { total, fait } } }
export function avancement(fiches) {
  const lots = {};
  let fait = 0;
  for (const f of fiches) {
    const lot = f.id.slice(1, 3);
    lots[lot] ??= { total: 0, fait: 0 };
    lots[lot].total += 1;
    if (f.statut === 'fait') {
      lots[lot].fait += 1;
      fait += 1;
    }
  }
  return { total: fiches.length, fait, lots };
}

export function lireStatut(texte) {
  const id = texte.match(/^id:\s*(L\d{2}-T\d{2})\s*$/m)?.[1];
  const statut = texte.match(/^statut:\s*(\w+)\s*$/m)?.[1];
  return id && statut ? { id, statut } : null;
}

export function resume(a) {
  const lignes = [`Avancement : ${a.fait}/${a.total} fiches faites`];
  for (const [lot, v] of Object.entries(a.lots).sort()) lignes.push(`Lot ${lot} : ${v.fait}/${v.total}`);
  return lignes.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dossier = 'pilotage/fiches';
  const fiches = readdirSync(dossier)
    .filter((n) => /^L\d{2}-T\d{2}\.md$/.test(n))
    .map((n) => lireStatut(readFileSync(`${dossier}/${n}`, 'utf8')))
    .filter(Boolean);
  console.log(resume(avancement(fiches)));
}
