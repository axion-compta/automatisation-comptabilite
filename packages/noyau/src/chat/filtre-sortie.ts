// Filtre de sortie du chat : retire liens, images, HTML, adresses, chiffres en dur et mots du lexique.
// Texte seulement : les marqueurs sont remplacés par le front. Les références {{ref:…}} restent intactes.
export type SorteRetrait = 'lien' | 'image' | 'html' | 'email' | 'chiffre' | 'lexique';
export type Retrait = { readonly sorte: SorteRetrait; readonly nombre: number };
export type ResultatFiltre = { readonly texte: string; readonly retraits: readonly Retrait[] };

export const MARQUEUR_CHIFFRE = '⟦voir_source⟧';
export const MARQUEUR_LEXIQUE = '⟦lexique⟧';

const REFERENCE = /(\{\{ref:[a-z0-9_]+\.[a-z0-9_]+\}\})/;
const IMAGE = /!\[[^\]\n]{0,200}\]\([^)\n]{0,500}\)/g;
const LIEN_MD = /\[([^\]\n]{0,200})\]\([^)\n]{0,500}\)/g;
const HTML = /<[^<>]*>/g;
const URL_BRUTE = /(?<!\w)(?:https?:\/\/|www\.|javascript:|data:)[^\s<>]*/gi;
const EMAIL = /[\w.%+-]{1,64}@[\w-]+(?:\.[\w-]+)+/g;
const CHIFFRES = /\p{Nd}(?:[\p{Nd} .,\u00a0\u202f]*\p{Nd})?(?:[ \u00a0]?[€$£%])?/gu;

type Compteurs = Map<SorteRetrait, number>;

function compter(c: Compteurs, sorte: SorteRetrait, n: number): void {
  if (n > 0) c.set(sorte, (c.get(sorte) ?? 0) + n);
}

function retirer(texte: string, motif: RegExp, sorte: SorteRetrait, c: Compteurs, remplacement = ''): string {
  let n = 0;
  const sortie = texte.replace(motif, (_m, garde: unknown) => {
    n += 1;
    return remplacement === '$1' && typeof garde === 'string' ? garde : remplacement;
  });
  compter(c, sorte, n);
  return sortie;
}

const sansAccent = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const estLettre = (ch: string | undefined) => ch !== undefined && /[\p{L}\p{N}]/u.test(ch);

// Répète le retrait jusqu'à stabilité : un retrait ne doit pas recomposer une balise ou un lien.
function retirerStable(texte: string, motif: RegExp, sorte: SorteRetrait, c: Compteurs, remplacement = ''): string {
  let t = texte;
  for (;;) {
    const suite = retirer(t, motif, sorte, c, remplacement);
    if (suite === t) return t;
    t = suite;
  }
}

function remplacerLexique(texte: string, lexique: readonly string[], c: Compteurs): string {
  const mots = lexique.map(sansAccent).filter((m) => m.length > 0).sort((a, b) => b.length - a.length);
  if (mots.length === 0 || texte === '') return texte;
  let norm = '';
  const debuts: number[] = [];
  let pos = 0;
  for (const ch of texte) {
    const n = sansAccent(ch);
    for (let k = 0; k < n.length; k += 1) debuts.push(pos);
    norm += n;
    pos += ch.length;
  }
  debuts.push(pos);
  let sortie = '';
  let copie = 0;
  let i = 0;
  while (i < norm.length) {
    const mot = mots.find((m) => norm.startsWith(m, i) && !estLettre(norm[i - 1]) && !estLettre(norm[i + m.length]));
    if (mot === undefined) {
      i += 1;
      continue;
    }
    const debut = debuts[i] ?? 0;
    sortie += texte.slice(copie, debut) + MARQUEUR_LEXIQUE;
    copie = debuts[i + mot.length] ?? texte.length;
    compter(c, 'lexique', 1);
    i += mot.length;
  }
  return sortie + texte.slice(copie);
}

function filtrerSegment(segment: string, lexique: readonly string[], c: Compteurs): string {
  let t = retirerStable(segment, HTML, 'html', c);
  t = retirer(t, IMAGE, 'image', c);
  t = retirerStable(t, LIEN_MD, 'lien', c, '$1');
  t = retirer(t, URL_BRUTE, 'lien', c);
  t = retirer(t, EMAIL, 'email', c);
  t = remplacerLexique(t, lexique, c);
  return retirer(t, CHIFFRES, 'chiffre', c, MARQUEUR_CHIFFRE);
}

const ORDRE: readonly SorteRetrait[] = ['lien', 'image', 'html', 'email', 'chiffre', 'lexique'];

export function filtrerSortie(texte: string, options: { lexique: readonly string[] }): ResultatFiltre {
  const c: Compteurs = new Map();
  const texteFiltre = texte
    .split(REFERENCE)
    .map((morceau, i) => (i % 2 === 1 ? morceau : filtrerSegment(morceau, options.lexique, c)))
    .join('');
  const retraits = ORDRE.flatMap((sorte) => {
    const nombre = c.get(sorte);
    return nombre === undefined ? [] : [{ sorte, nombre }];
  });
  return { texte: texteFiltre, retraits };
}
