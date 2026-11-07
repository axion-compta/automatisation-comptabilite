// Ventes : reconnaître une vente, type probable, nature proposée. Règles écrites, aucun modèle.
import { normaliserNom } from './clients.js';
import { ErreurVente } from './types.js';
import type { NatureLigne, StatutVente, TypePieceVente } from './types.js';

export type SensPiece = 'vente' | 'achat' | 'a_verifier';
export interface IdentiteLue {
  siren?: string;
  tva?: string;
  nom?: string;
}
export interface Societe {
  siren: string;
  tva?: string;
  nom: string;
}
export interface Habitude {
  nature: NatureLigne;
  compteProduit: string;
}
export interface EntreeCatalogue extends Habitude {
  motCle: string;
}
export interface NatureProposee {
  nature: NatureLigne;
  compteProduit?: string;
}

const compact = (t: string | undefined): string => (t ?? '').replace(/\s+/g, '');
const memeId = (a: string | undefined, b: string | undefined): boolean => compact(a) !== '' && compact(a) === compact(b);

export function sensDeLaPiece(vendeurLu: IdentiteLue, societe: Societe): SensPiece {
  if (memeId(vendeurLu.siren, societe.siren) || memeId(vendeurLu.tva, societe.tva)) return 'vente';
  const nom = normaliserNom(vendeurLu.nom ?? '');
  return nom !== '' && nom === normaliserNom(societe.nom) ? 'a_verifier' : 'achat';
}

export function typeProbable(e: { ttc: number; texteContientAvoir: boolean; texteContientAcompte: boolean }): { type: TypePieceVente; aConfirmer: boolean } {
  if (!Number.isSafeInteger(e.ttc)) throw new ErreurVente('montant_invalide', 'Montant TTC invalide.');
  if (e.texteContientAvoir) return { type: 'avoir', aConfirmer: false };
  if (e.ttc < 0) return { type: 'avoir', aConfirmer: true };
  if (e.texteContientAcompte) return { type: 'facture_acompte', aConfirmer: false };
  return { type: 'facture', aConfirmer: false };
}

export function natureProposee(libelle: string, habitude: Habitude | undefined, catalogue: readonly EntreeCatalogue[]): NatureProposee {
  if (habitude !== undefined && habitude.nature !== 'a_confirmer') return { nature: habitude.nature, compteProduit: habitude.compteProduit };
  const texte = ` ${normaliserNom(libelle)} `;
  for (const c of catalogue) {
    const mot = normaliserNom(c.motCle);
    if (mot !== '' && texte.includes(` ${mot} `)) return { nature: c.nature, compteProduit: c.compteProduit };
  }
  return { nature: 'a_confirmer' };
}

const FIGEES: readonly StatutVente[] = ['validee', 'doublon', 'rejetee'];

export function effetSiJeChange(pieces: readonly { id: string; statut: StatutVente; clientId: string }[], clientId: string): string[] {
  if (clientId === '') return [];
  return pieces.filter((p) => p.clientId === clientId && !FIGEES.includes(p.statut)).map((p) => p.id);
}
