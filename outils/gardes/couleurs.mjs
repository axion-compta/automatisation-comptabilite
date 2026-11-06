// garde:couleurs : aucune couleur en dur dans l'interface (V3-UX-072).
// Rouge si un fichier suivi de apps/ ou packages/ (ts, tsx, css, html) contient #rrggbb, rgb(), hsl(), oklch()...
// Exclus : les jetons (source et fichier généré), les fichiers générés (marqueur en tête), les tests.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const HEX = /(?<![\w&#])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;
const FONCTION = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi;
// Noms de couleurs CSS sur une propriété de couleur (transparent, currentColor, inherit restent permis).
const PROPRIETE = /(?<![\w-])(?:color|background(?:-color)?|fill|stroke|border(?:-(?:top|right|bottom|left))?-color|outline-color|box-shadow|backgroundColor|borderColor|outlineColor|boxShadow)["']?\s*:\s*([^;}\n]*)/gi;
const NOMS = /\b(?:red|white|black|blue|green|yellow|orange|purple|pink|brown|gr[ae]y|silver|gold|navy|teal|cyan|magenta|lime|maroon|olive|aqua|fuchsia|indigo|violet|crimson|salmon|coral|beige|ivory|khaki|tan|turquoise|lavender)\b/i;
const CONCERNES = /^(apps|packages)\/.*\.(tsx?|css|html)$/;
const TESTS = /(\.test\.|\.spec\.|\/__tests__\/|\/e2e\/)/;
// Seule source admise des couleurs (et sa copie générée).
export const SOURCES_JETONS = ['packages/ui/src/jetons.ts', 'packages/ui/src/jetons.css'];
const GENERE = /généré|@generated|do not edit|ne pas modifier/i;

export function estExclu(chemin, texte = '') {
  if (!CONCERNES.test(chemin) || TESTS.test(chemin) || SOURCES_JETONS.includes(chemin)) return true;
  return GENERE.test(texte.split(/\r?\n/).slice(0, 3).join('\n'));
}

export function analyserTexte(texte, nom) {
  const pb = [];
  texte.split(/\r?\n/).forEach((l, i) => {
    for (const m of l.matchAll(HEX)) pb.push(`${nom}:${i + 1} couleur en dur ${m[0]} : utiliser un jeton`);
    for (const m of l.matchAll(PROPRIETE)) if (NOMS.test(m[1])) pb.push(`${nom}:${i + 1} couleur en dur ${m[1].match(NOMS)[0]} : jeton requis`);
    for (const m of l.matchAll(FONCTION)) pb.push(`${nom}:${i + 1} couleur en dur ${m[0]}...) : utiliser un jeton`);
  });
  return pb;
}

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
  for (const f of liste.split('\0').filter((x) => x && CONCERNES.test(x))) {
    try {
      const texte = lire(`${racine}/${f}`);
      if (!estExclu(f, texte)) pb.push(...analyserTexte(texte, f));
    } catch (e) {
      pb.push(`${f} illisible : ${e.code ?? e.message}`);
    }
  }
  return pb;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const pb = analyserDepot();
  if (pb.length > 0) {
    console.error('garde:couleurs ROUGE\n' + pb.map((p) => ' - ' + p).join('\n'));
    process.exit(1);
  }
  console.log('garde:couleurs vert');
}
