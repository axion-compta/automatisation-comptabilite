// garde:textes : aucun texte en dur dans l'interface (V3-UX-072, V3-PRI-017).
// Rouge si un fichier .tsx de apps/ ou packages/ contient du texte visible en dur (texte entre balises, chaîne
// entre accolades, aria-label/title/placeholder/alt/label littéraux) : il doit venir de packages/textes.
// Rouge aussi si un mot interdit figure dans packages/textes/src (hors tests). Exclus : tests, fichiers générés.
// Limites : heuristique, pas un analyseur JSX complet ; un ternaire {c ? "Oui" : "Non"} n'est pas détecté.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const LETTRES = /[A-Za-zÀ-ÿ]{2,}/;
const NOEUD = /<(?:[A-Za-z][^<>]*)?>([^<>{}]+)(?=[<{])|\}([^<>{}]+)(?=<)/g;
const CHAINE = /\{\s*(['"`])((?:(?!\1)[^\\\n])*)\1\s*\}/g;
const ATTRIBUT = /\b(?:aria-label|title|placeholder|alt|label)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const CODE = /\b(?:const|let|var|return)\b|=>|;\s*$|[\w$\])!]\(/m;
const CONCERNES = /^(apps|packages)\/.*\.tsx$/;
const TESTS = /(\.test\.|\.spec\.|\/__tests__\/|\/e2e\/)/;
const GENERE = /généré|@generated|do not edit|ne pas modifier/i;
// Exemptions à chemin exact. Ecran.tsx : écran de test (développement seulement), à retirer quand le premier écran
// réel le remplace. Palette.tsx : à retirer par la fiche de suivi qui passe les textes de la palette dans packages/textes.
export const ECRANS_EXEMPTES = ['apps/web/src/Ecran.tsx', 'apps/web/src/commandes/Palette.tsx'];
export const DOSSIER_TEXTES = 'packages/textes/src/';
// Assemblés ici pour ne pas figurer en clair dans le dépôt.
export const MOTS_INTERDITS = [['con', 'forme'], ['sans ', 'erreur'], ['garan', 'ti'], ['juri', 'ste'], ['P', 'DP']].map((p) => p.join(''));

export function estExclu(chemin, texte = '') {
  if (!CONCERNES.test(chemin) || TESTS.test(chemin) || ECRANS_EXEMPTES.includes(chemin)) return true;
  return GENERE.test(texte.split(/\r?\n/).slice(0, 3).join('\n'));
}

export function analyserTexte(texte, nom) {
  const pb = [];
  const code = texte
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
    .split(/\r?\n/)
    .map((l) => (/^\s*\/\//.test(l) ? '' : l))
    .join('\n');
  const ligne = (index) => code.slice(0, index).split('\n').length;
  for (const m of code.matchAll(NOEUD)) {
    const t = (m[1] ?? m[2]).trim();
    if (LETTRES.test(t) && !CODE.test(t)) pb.push(`${nom}:${ligne(m.index)} texte en dur « ${t} » : utiliser packages/textes`);
  }
  for (const m of code.matchAll(CHAINE)) {
    if (LETTRES.test(m[2])) pb.push(`${nom}:${ligne(m.index)} texte en dur « ${m[2]} » : utiliser packages/textes`);
  }
  for (const m of code.matchAll(ATTRIBUT)) {
    const v = m[1] ?? m[2];
    if (LETTRES.test(v)) pb.push(`${nom}:${ligne(m.index)} attribut en dur « ${v} » : utiliser packages/textes`);
  }
  return pb;
}

export function analyserMotsInterdits(texte, nom) {
  const pb = [];
  texte.split(/\r?\n/).forEach((l, i) => {
    for (const mot of MOTS_INTERDITS) {
      if (l.toLowerCase().includes(mot.toLowerCase())) pb.push(`${nom}:${i + 1} mot interdit « ${mot} »`);
    }
  });
  return pb;
}

function gitReel(args, cwd) {
  const r = spawnSync('git', args, { encoding: 'utf8', cwd, maxBuffer: 1 << 28 });
  return r.status === 0 ? r.stdout : null;
}

export function analyserDepot(git = gitReel, lire = (f) => readFileSync(f, 'utf8')) {
  const racine = git(['rev-parse', '--show-toplevel'])?.trim();
  if (!racine) return ['git rev-parse --show-toplevel a échoué : dépôt non analysé'];
  const liste = git(['ls-files', '-z'], racine);
  if (liste === null) return ['git ls-files a échoué : dépôt non analysé'];
  const pb = [];
  for (const f of liste.split('\0').filter((x) => x)) {
    const pourInterface = CONCERNES.test(f);
    const sourceTextes = f.startsWith(DOSSIER_TEXTES) && /\.tsx?$/.test(f) && !TESTS.test(f);
    if (!pourInterface && !sourceTextes) continue;
    try {
      const texte = lire(`${racine}/${f}`);
      if (sourceTextes) pb.push(...analyserMotsInterdits(texte, f));
      if (pourInterface && !estExclu(f, texte)) pb.push(...analyserTexte(texte, f));
    } catch (e) {
      pb.push(`${f} illisible : ${e.code ?? e.message}`);
    }
  }
  return pb;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const pb = analyserDepot();
  if (pb.length > 0) {
    console.error('garde:textes ROUGE\n' + pb.map((p) => ' - ' + p).join('\n'));
    process.exit(1);
  }
  console.log('garde:textes vert');
}
