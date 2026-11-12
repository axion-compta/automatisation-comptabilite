// garde:attaques : le catalogue docs/attaques.csv (ATK-01 à ATK-33) relie chaque attaque critique décrite à un test (V3-QUA-006).
// Rouge si l'en-tête est faux, si un identifiant manque, est en double ou hors ATK-01 à ATK-33,
// ou si une ligne « decrite » et « critique » n'a pas de test dont le titre contient test_id dans fichier_test.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ENTETE = 'id,titre,gravite,statut,test_id,fichier_test';
const NOMBRE = 33;
const GRAVITES = new Set(['critique', 'majeure']);
const STATUTS = new Set(['decrite', 'a_decrire']);
const ID = /^ATK-(\d{2})$/;

// Titres des tests (it / test) d'un fichier, sans les alias.
export function titresDeTests(texte) {
  const code = texte.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' ')).replace(/(^|[^:\w'"`])\/\/.*$/gm, '$1');
  return [...code.matchAll(/(?<![\w.$])(?:it|test)\s*\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g)].map((m) => m[2]);
}

export function analyserCatalogue(csv, lire = (f) => readFileSync(f, 'utf8')) {
  const problemes = [];
  let decrites = 0;
  let aDecrire = 0;
  let critiquesSansTest = 0;
  const lignes = csv.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lignes[0] !== ENTETE) problemes.push(`en-tête attendu « ${ENTETE} »`);
  const vus = new Set();
  for (const ligne of lignes.slice(1)) {
    const c = ligne.split(',');
    const id = c[0];
    if (c.length !== 6) {
      problemes.push(`${id || '?'} : 6 colonnes attendues, ${c.length} trouvées`);
      continue;
    }
    const [, titre, gravite, statut, testId, fichier] = c;
    const m = ID.exec(id);
    const n = m ? Number(m[1]) : 0;
    if (n < 1 || n > NOMBRE) {
      problemes.push(`${id} : identifiant hors ATK-01 à ATK-${NOMBRE}`);
      continue;
    }
    if (vus.has(id)) problemes.push(`${id} : identifiant en double`);
    vus.add(id);
    if (!GRAVITES.has(gravite)) problemes.push(`${id} : gravité inconnue « ${gravite} »`);
    if (!STATUTS.has(statut)) {
      problemes.push(`${id} : statut inconnu « ${statut} »`);
      continue;
    }
    if (statut === 'a_decrire') {
      aDecrire += 1;
      if (titre !== '') problemes.push(`${id} : titre non vide pour une attaque à décrire`);
      continue;
    }
    decrites += 1;
    if (gravite !== 'critique') continue;
    let relie = false;
    if (testId !== '' && fichier !== '') {
      try {
        relie = titresDeTests(lire(fichier) ?? '').some((t) => t.includes(testId));
      } catch {
        relie = false;
      }
    }
    if (!relie) {
      critiquesSansTest += 1;
      problemes.push(`${id} : attaque critique décrite sans test « ${testId} » dans « ${fichier} »`);
    }
  }
  for (let i = 1; i <= NOMBRE; i++) {
    const id = `ATK-${String(i).padStart(2, '0')}`;
    if (!vus.has(id)) problemes.push(`${id} : identifiant manquant`);
  }
  const resume = `${decrites} decrites / ${aDecrire} a_decrire / ${critiquesSansTest} critiques sans test`;
  return { problemes, decrites, aDecrire, critiquesSansTest, resume };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = analyserCatalogue(readFileSync('docs/attaques.csv', 'utf8'));
  console.log(`garde:attaques ${r.resume}`);
  if (r.problemes.length > 0) {
    console.error('garde:attaques ROUGE\n' + r.problemes.map((p) => ' - ' + p).join('\n'));
    process.exit(1);
  }
  console.log('garde:attaques vert');
}
