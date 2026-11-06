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

// Lit le statut dans l'en-tête --- seulement. L'id vient du nom du fichier (ex. L00-T09.md).
export function lireStatut(texte, nomFichier) {
  const id = nomFichier.match(/^(L\d{2}-T\d{2})\.md$/)?.[1];
  const entete = texte.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
  const statut = entete?.match(/^statut:[ \t]*["']?(\w+)["']?[ \t]*(?:#[^\r\n]*)?\r?$/m)?.[1];
  return id && statut ? { id, statut: statut.toLowerCase() } : null;
}

export function resume(a, illisibles = 0) {
  const lignes = [`Avancement : ${a.fait}/${a.total} fiches faites`];
  for (const [lot, v] of Object.entries(a.lots).sort()) lignes.push(`Lot ${lot} : ${v.fait}/${v.total}`);
  if (illisibles > 0) lignes.push(`${illisibles} fiche(s) illisible(s)`);
  return lignes.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dossier = fileURLToPath(new URL('../../pilotage/fiches/', import.meta.url));
  const noms = readdirSync(dossier).filter((n) => /^L\d{2}-T\d{2}\.md$/.test(n));
  const lues = noms.map((n) => lireStatut(readFileSync(dossier + n, 'utf8'), n));
  const illisibles = lues.filter((x) => !x).length;
  console.log(resume(avancement(lues.filter(Boolean)), illisibles));
  process.exit(illisibles > 0 ? 1 : 0);
}
