// Ligne bancaire selon la forme juridique : 108 pour l'exploitant d'une EI, 467 pour la restitution d'un apport à un associé.
// Brouillon seulement : la proposition n'est jamais validée ici. Une société ne reçoit jamais 108.
import type { Centimes } from '../../argent/index.js';
import { FORMES } from '../../profil/types.js';

export class ErreurCasForme extends Error {
  override name = 'ErreurCasForme';
  constructor(readonly code: 'montant_invalide' | 'montant_nul' | 'forme_inconnue') {
    super(code);
  }
}

export type LigneSelonForme = { readonly montant: Centimes; readonly restitutionApportAssocie?: boolean };
export type PropositionForme = {
  etat: 'brouillon';
  valide: false;
  compte: '108' | '467';
  sens: 'credit' | 'debit';
  /** Montant absolu, en centimes. */
  montant: Centimes;
  motif: 'apport_exploitant' | 'retrait_exploitant' | 'restitution_apport_associe';
};

const brouillon = (compte: '108' | '467', sens: 'credit' | 'debit', montant: number, motif: PropositionForme['motif']): PropositionForme => ({
  etat: 'brouillon',
  valide: false,
  compte,
  sens,
  montant: Math.abs(montant) as Centimes,
  motif,
});

/** Rend une proposition en brouillon, ou null quand la forme n'en appelle aucune. */
export function proposerSelonForme(ligne: LigneSelonForme, forme: string): PropositionForme | null {
  const m = ligne.montant;
  if (!Number.isSafeInteger(m)) throw new ErreurCasForme('montant_invalide');
  if (m === 0) throw new ErreurCasForme('montant_nul');
  if (!(FORMES as readonly string[]).includes(forme)) throw new ErreurCasForme('forme_inconnue');
  if (forme === 'EI') return m > 0 ? brouillon('108', 'credit', m, 'apport_exploitant') : brouillon('108', 'debit', m, 'retrait_exploitant');
  if (ligne.restitutionApportAssocie === true && m < 0) return brouillon('467', 'debit', m, 'restitution_apport_associe');
  return null;
}
