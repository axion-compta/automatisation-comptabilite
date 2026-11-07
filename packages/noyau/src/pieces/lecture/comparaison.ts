// Comparaison champ par champ des lecteurs A et B ; la citation du lecteur A doit se retrouver dans le texte extrait.
import { estChampCritique, type Accord, type ChampLu } from '../types.js';

export interface ComparaisonChamp {
  nom: string;
  accord: Accord;
  valeurA?: string;
  valeurB?: string;
  citationRetrouvee: boolean;
  douteux: boolean;
}

/** Tout blanc Unicode devient une espace ; espaces de tête et de fin retirées. */
export function normaliserEspaces(t: string): string {
  return t.replace(/\s+/g, ' ').trim();
}

/** Inclusion exacte (casse conservée) après normalisation des espaces ; faux si la citation est vide. */
export function citationRetrouvee(citation: string, texte: string): boolean {
  const c = normaliserEspaces(citation);
  return c !== '' && normaliserEspaces(texte).includes(c);
}

function simplifier(t: string): string {
  return normaliserEspaces(t.normalize('NFKC').toLowerCase().normalize('NFD').replace(/\p{M}/gu, ''));
}

export function valeursEgales(a: ChampLu, b: ChampLu): boolean {
  if (a.valeurCentimes !== undefined && b.valeurCentimes !== undefined) return a.valeurCentimes === b.valeurCentimes;
  const [x, y] = [simplifier(a.valeur), simplifier(b.valeur)];
  if (a.nom !== 'numero') return x === y;
  const sansSeparateurs = (t: string): string => t.replace(/[\s/.-]/g, '');
  return sansSeparateurs(x) === sansSeparateurs(y);
}

export function comparerLecteurs(champsA: readonly ChampLu[], champsB: readonly ChampLu[], texteExtrait: string): ComparaisonChamp[] {
  const parNom = (champs: readonly ChampLu[]): Map<string, ChampLu> => new Map(champs.map((c) => [c.nom, c]));
  const [a, b] = [parNom(champsA), parNom(champsB)];
  const noms = [...new Set([...a.keys(), ...b.keys()])].sort();
  return noms.map((nom) => {
    const [ca, cb] = [a.get(nom), b.get(nom)];
    const accord: Accord = ca && cb ? (valeursEgales(ca, cb) ? 'accord' : 'desaccord') : ca ? 'seul_a' : 'seul_b';
    const retrouvee = ca ? citationRetrouvee(ca.citation ?? '', texteExtrait) : false;
    const resultat: ComparaisonChamp = { nom, accord, citationRetrouvee: retrouvee, douteux: (accord === 'desaccord' && estChampCritique(nom)) || (ca !== undefined && !retrouvee) };
    if (ca) resultat.valeurA = ca.valeur;
    if (cb) resultat.valeurB = cb.valeur;
    return resultat;
  });
}
