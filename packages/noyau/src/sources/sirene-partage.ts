// Partage équitable de la file Sirene entre clients : le module ne voit que des numéros publics et un
// identifiant opaque de file. Aucune donnée client, aucun appel réseau, aucune horloge.
import { planifier, type OptionsQuota } from './sirene-planif.js';

export type CodePartage = 'numero_invalide' | 'file_invalide' | 'file_inconnue';

export class ErreurPartage extends Error {
  override name = 'ErreurPartage';
  constructor(
    public readonly code: CodePartage,
    message: string,
  ) {
    super(message);
  }
}

export interface DemandeFile {
  file: string;
  numero: string;
}

const LONGUEUR_SIREN = 9;
const LONGUEUR_SIRET = 14;
const BASE_LUHN = 10;
const MAX_CHIFFRE = 9;

/** Clé de Luhn sans division : on double un chiffre sur deux en partant de la droite. */
function luhnValide(texte: string, longueur: number): boolean {
  if (typeof texte !== 'string' || texte.length !== longueur || !/^[0-9]+$/.test(texte)) return false;
  let somme = 0;
  for (let i = 0; i < texte.length; i++) {
    let chiffre = Number(texte[texte.length - 1 - i]);
    if (i % 2 === 1) {
      chiffre *= 2;
      if (chiffre > MAX_CHIFFRE) chiffre -= MAX_CHIFFRE;
    }
    somme += chiffre;
  }
  return somme % BASE_LUHN === 0;
}

export const sirenValide = (s: string): boolean => luhnValide(s, LONGUEUR_SIREN);
export const siretValide = (s: string): boolean => luhnValide(s, LONGUEUR_SIRET);

/** Refuse un numéro invalide ; retire les doublons à l'intérieur d'une même file seulement. */
export function preparerFile(demandes: readonly DemandeFile[]): DemandeFile[] {
  const vus = new Map<string, Set<string>>();
  const sortie: DemandeFile[] = [];
  for (const d of demandes) {
    if (typeof d.file !== 'string' || d.file === '') throw new ErreurPartage('file_invalide', 'Identifiant de file vide');
    if (!sirenValide(d.numero) && !siretValide(d.numero)) throw new ErreurPartage('numero_invalide', 'Numéro invalide : ' + String(d.numero));
    const deja = vus.get(d.file) ?? new Set<string>();
    vus.set(d.file, deja);
    if (deja.has(d.numero)) continue;
    deja.add(d.numero);
    sortie.push({ file: d.file, numero: d.numero });
  }
  return sortie;
}

export interface EnvoiDeFile {
  file: string;
  lot: string[];
  a: number;
}

/** Un lot par file à tour de rôle (ordre de première apparition), puis instants permis par le quota. */
export function tourDeRole(demandes: readonly DemandeFile[], debut: number, o: OptionsQuota): EnvoiDeFile[] {
  planifier([], debut, o); // valide les options avant toute boucle
  const parFile = new Map<string, string[]>();
  for (const d of demandes) parFile.set(d.file, [...(parFile.get(d.file) ?? []), d.numero]);
  const lots: { file: string; lot: string[] }[] = [];
  let reste = true;
  for (let rang = 0; reste; rang++) {
    reste = false;
    for (const [file, numeros] of parFile) {
      const lot = numeros.slice(rang * o.tailleLot, (rang + 1) * o.tailleLot);
      if (lot.length > 0) lots.push({ file, lot });
      if (numeros.length > (rang + 1) * o.tailleLot) reste = true;
    }
  }
  // Un instant par lot : planifier reçoit un élément factice par lot (taille de lot 1 pour les instants).
  const instants = planifier(lots.map(() => ''), debut, { ...o, tailleLot: 1 });
  return lots.map((l, i) => ({ file: l.file, lot: l.lot, a: instants[i]!.a }));
}

/** Rend chaque réponse à la file qui l'a demandée ; une file inconnue est refusée, jamais livrée ailleurs. */
export function router<T>(
  reponses: readonly { file: string; numero: string; corps: T }[],
  files: readonly string[],
): Map<string, { numero: string; corps: T }[]> {
  const rendu = new Map<string, { numero: string; corps: T }[]>(files.map((f) => [f, []]));
  for (const r of reponses) {
    const cible = rendu.get(r.file);
    if (cible === undefined) throw new ErreurPartage('file_inconnue', 'File inconnue : ' + r.file);
    cible.push({ numero: r.numero, corps: r.corps });
  }
  return rendu;
}
