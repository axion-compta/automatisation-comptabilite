// Clients de vente : recherche, proposition de fiche, code auxiliaire stable.
import { ErreurVente } from './types.js';
import type { NatureClient, PieceVente } from './types.js';

const LARGEUR_MIN = 1;
const LARGEUR_MAX = 12;
const BASE_DIX = 10;

export interface ClientVente {
  id: string;
  nom: string;
  siren?: string;
  tva?: string;
}
export interface CritereClient {
  siren?: string;
  tva?: string;
  nom?: string;
}
export interface ResultatClient {
  client: ClientVente;
  par: 'siren' | 'tva' | 'nom';
}
export interface FicheProposee {
  origine: 'proposition_ia';
  nature: Extract<NatureClient, 'professionnel' | 'a_confirmer'>;
  nom: string;
  siren?: string;
  tva?: string;
  codePostal?: string;
}

export function normaliserNom(nom: string): string {
  return nom
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const sansEspaces = (t: string | undefined): string => (t ?? '').replace(/\s+/g, '');

export function chercherClient(clients: readonly ClientVente[], critere: CritereClient): ResultatClient | null {
  const siren = sansEspaces(critere.siren);
  const tva = sansEspaces(critere.tva);
  const nom = normaliserNom(critere.nom ?? '');
  if (siren !== '') {
    const client = clients.find((c) => sansEspaces(c.siren) === siren);
    if (client !== undefined) return { client, par: 'siren' };
  }
  if (tva !== '') {
    const client = clients.find((c) => sansEspaces(c.tva) === tva);
    if (client !== undefined) return { client, par: 'tva' };
  }
  if (nom !== '') {
    const client = clients.find((c) => normaliserNom(c.nom) === nom);
    if (client !== undefined) return { client, par: 'nom' };
  }
  return null;
}

export function proposerFiche(entree: { nom: string; siren?: string; tva?: string; codePostal?: string }): FicheProposee {
  const pro = sansEspaces(entree.siren) !== '' || sansEspaces(entree.tva) !== '';
  const fiche: FicheProposee = { origine: 'proposition_ia', nature: pro ? 'professionnel' : 'a_confirmer', nom: entree.nom };
  if (sansEspaces(entree.siren) !== '') fiche.siren = entree.siren as string;
  if (sansEspaces(entree.tva) !== '') fiche.tva = entree.tva as string;
  if (entree.codePostal !== undefined) fiche.codePostal = entree.codePostal;
  return fiche;
}

export function prochainCodeAuxiliaire(codesExistants: readonly string[], options: { prefixe: string; chiffres: number }): string {
  const { prefixe, chiffres } = options;
  if (!Array.isArray(codesExistants) || typeof prefixe !== 'string' || prefixe === '' || !Number.isInteger(chiffres) || chiffres < LARGEUR_MIN || chiffres > LARGEUR_MAX) {
    throw new ErreurVente('entree_invalide', 'Paramètres du code auxiliaire invalides.');
  }
  let max = 0;
  for (const code of codesExistants) {
    if (!code.startsWith(prefixe)) continue;
    const reste = code.slice(prefixe.length);
    if (!/^\d+$/.test(reste)) continue;
    const n = Number.parseInt(reste, BASE_DIX);
    if (Number.isSafeInteger(n) && n > max) max = n;
  }
  const suivant = String(max + 1);
  if (suivant.length > chiffres) throw new ErreurVente('code_auxiliaire_epuise', 'Plus de code auxiliaire disponible.');
  return prefixe + suivant.padStart(chiffres, '0');
}

export function peutValiderFacture(piece: PieceVente): boolean {
  return typeof piece.clientId === 'string' && piece.clientId !== '';
}
