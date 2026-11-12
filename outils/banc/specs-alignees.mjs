// Alignement des spécifications (hors dépôt) sur la liste des valeurs interdites connues (V3-QUA-016, L22-T33).
// Aucun extrait n'est affiché : seulement fichier, ligne et identifiant.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXTENSIONS = /\.(?:md|txt|json)$/;
const LISTE = fileURLToPath(new URL('../../packages/parametres/donnees/valeurs-interdites.json', import.meta.url));

function fichiers(racine, courant = racine) {
  const sortie = [];
  for (const e of readdirSync(courant, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const chemin = join(courant, e.name);
    if (e.isDirectory()) sortie.push(...fichiers(racine, chemin));
    else if (e.isFile() && EXTENSIONS.test(e.name)) sortie.push(chemin);
  }
  return sortie;
}

/** Sans `forme`, toutes les entrées s'appliquent ; avec `forme`, seulement celles qui la citent. */
export function analyser(dossier, interdites, { forme } = {}) {
  const actives = interdites
    .filter((i) => forme === undefined || i.formes.includes(forme))
    .map((i) => ({ id: i.id, re: new RegExp(i.motifRegex, 'i') }));
  const trouvees = [];
  for (const chemin of fichiers(dossier)) {
    const lignes = readFileSync(chemin, 'utf8').split('\n');
    lignes.forEach((texte, k) => {
      for (const a of actives) if (a.re.test(texte)) trouvees.push({ fichier: relative(dossier, chemin), ligne: k + 1, id: a.id });
    });
  }
  return trouvees;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dossier = process.env.SPECS_DOSSIER;
  if (dossier === undefined || dossier === '') {
    console.log('specs-alignees ignoré : SPECS_DOSSIER absent (L22-T33).');
  } else {
    const { entrees } = JSON.parse(readFileSync(LISTE, 'utf8'));
    const ecarts = analyser(dossier, entrees);
    for (const e of ecarts) console.log(`${e.fichier}:${e.ligne} ${e.id}`);
    process.exitCode = ecarts.length > 0 ? 1 : 0;
  }
}
