// garde:registre-legal (V3-JUR-019) : rien n'est présenté comme registre légal hors des deux formules permises.
// Lit packages/*/src, apps/*/src, apps/web/e2e et docs/ (hors tests). outils/ n'est pas lu : la garde contient le mot.
// Limite : texte comparé après normalisation (minuscules, sans accents, espaces ramenées à une seule).
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const CHAINE_A = 'document de travail, ne remplace pas le registre légal';
export const CHAINE_B = 'à recopier dans votre registre légal';

// Texte normalisé et, pour chaque caractère normalisé, la ligne (1 = première) d'origine.
function normaliserAvecLignes(texte) {
  let sortie = '';
  const lignes = [];
  let ligne = 1;
  for (const c of texte) {
    const bout = /\s/.test(c) ? ' ' : c.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    for (const x of bout) {
      if (x === ' ' && sortie.endsWith(' ')) continue;
      sortie += x;
      lignes.push(ligne);
    }
    if (c === '\n') ligne += 1;
  }
  return { texte: sortie, lignes };
}

export function normaliser(texte) {
  return normaliserAvecLignes(texte).texte;
}

function positions(texte, motif) {
  const out = [];
  for (let i = texte.indexOf(motif); i >= 0; i = texte.indexOf(motif, i + 1)) out.push([i, i + motif.length]);
  return out;
}

export function occurrencesInterdites(texte, nom) {
  const n = normaliserAvecLignes(texte);
  const permis = [...positions(n.texte, normaliser(CHAINE_A)), ...positions(n.texte, normaliser(CHAINE_B))];
  return positions(n.texte, 'registre legal')
    .filter(([d, f]) => !permis.some(([pd, pf]) => pd <= d && f <= pf))
    .map(([d]) => `${nom}:${n.lignes[d]}`);
}

export function estConcerne(chemin) {
  if (!/^(?:packages\/[^/]+\/src|apps\/[^/]+\/src|apps\/web\/e2e|docs)\//.test(chemin)) return false;
  if (!/\.(?:ts|tsx|mjs|json|md|csv|txt|html)$/.test(chemin)) return false;
  return !/(?:\/__tests__\/|\.test\.|\.spec\.)/.test(chemin);
}

export function analyserDepot() {
  const r = spawnSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error('git ls-files impossible');
  const fichiers = r.stdout.split('\0').filter((f) => f !== '' && estConcerne(f));
  return { fichiers: fichiers.length, erreurs: fichiers.flatMap((f) => occurrencesInterdites(readFileSync(f, 'utf8'), f)) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const { fichiers, erreurs } = analyserDepot();
    if (erreurs.length > 0) {
      console.error('garde:registre-legal ROUGE\n' + erreurs.map((e) => ' - ' + e).join('\n'));
      process.exit(1);
    }
    console.log(`garde:registre-legal vert (${fichiers} fichier(s))`);
  } catch (e) {
    console.error('garde:registre-legal ROUGE\n - ' + e.message);
    process.exit(1);
  }
}
