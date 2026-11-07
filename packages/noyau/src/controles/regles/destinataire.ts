// Contrôles CC-K08 (destinataire ou émetteur autre que la société) et CC-K10 (client particulier).
// Règles pures : codes seulement, aucun texte affiché.
import type { RegleControle, SortieRegle } from '../moteur.js';
import { alerte, ok, type PieceControlee } from './commun.js';

export interface Societe {
  nom: string;
  siren: string;
  nomsConnus: readonly string[];
}

export interface TiersControle {
  nom: string;
  siren?: string;
  personne_physique?: boolean;
}

export type PieceDestinataire = Omit<PieceControlee, 'destinataire'> & { destinataire?: TiersControle };

export interface EntreeDestinataire {
  piece: PieceDestinataire;
  societe: Societe;
  formes: readonly string[];
}

export type Reponse = 'oui' | 'non' | 'inconnu';

const PONCTUATION = /[^a-z0-9]+/g;

function simplifier(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\./g, '').replace(PONCTUATION, ' ').trim();
}

/** Minuscules, accents et ponctuation retirés, formes juridiques (fournies) retirées, blancs réduits. */
export function normaliserNom(s: string, formes: readonly string[]): string {
  const exclues = new Set(formes.map(simplifier));
  return simplifier(s)
    .split(' ')
    .filter((mot) => mot !== '' && !exclues.has(mot))
    .join(' ');
}

function tiersVise(piece: PieceDestinataire): TiersControle | undefined {
  return piece.sens === 'achat' ? piece.destinataire : piece.emetteur;
}

/** Achat : le destinataire est-il la société ? Vente : l'émetteur l'est-il ? */
export function destinataireEstSociete(piece: PieceDestinataire, societe: Societe, formes: readonly string[]): Reponse {
  const tiers = tiersVise(piece);
  if (tiers === undefined) return 'inconnu';
  if (tiers.siren !== undefined && tiers.siren !== '') return tiers.siren === societe.siren ? 'oui' : 'non';
  const nom = normaliserNom(tiers.nom, formes);
  const connus = [societe.nom, ...societe.nomsConnus].map((n) => normaliserNom(n, formes));
  return connus.includes(nom) ? 'oui' : 'non';
}

const DECLENCHEURS_K08 = ['arrivee', 'continu', 'a_la_demande'] as const;

export const regleCCK08: RegleControle<EntreeDestinataire> = {
  id: 'CC-K08',
  version: 1,
  gravite: 'M',
  bloque: [],
  declencheurs: [...DECLENCHEURS_K08],
  actif: true,
  evaluer({ piece, societe, formes }): SortieRegle {
    const r = destinataireEstSociete(piece, societe, formes);
    if (r === 'oui') return ok();
    return alerte(undefined, r === 'non' ? 'NON_DEDUCTIBLE_NOM' : 'A_VERIFIER');
  },
};

export const regleCCK10: RegleControle<EntreeDestinataire> = {
  id: 'CC-K10',
  version: 1,
  gravite: 'm',
  bloque: [],
  declencheurs: [...DECLENCHEURS_K08],
  actif: true,
  evaluer({ piece }): SortieRegle {
    if (piece.sens !== 'vente') return { resultat: 'NON_APPLICABLE' };
    const client = piece.destinataire;
    const inconnu = client === undefined || client.personne_physique === true || client.siren === undefined || client.siren === '';
    return inconnu ? alerte() : ok();
  },
};
