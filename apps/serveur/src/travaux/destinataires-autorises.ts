// Envoi automatique : seulement vers une personne du compte (utilisateur ou invité actif). Un envoi vers un tiers reste un geste humain.
import type { Courriel, PortEnvoi } from './resume-email.js';

export interface PersonneDuCompte { adresse: string; actif: boolean }
export type ResultatEnvoiAutomatique = { ok: true } | { ok: false; cause: 'destinataire_tiers' };
/** Journal de refus : le code seulement, jamais l'adresse. */
export type JournalRefus = (ligne: { code: 'destinataire_tiers' }) => void | Promise<void>;

export class ErreurDestinataire extends Error {
  constructor(readonly code: 'destinataire_tiers') {
    super(code);
  }
}

const normaliser = (adresse: string): string => adresse.trim().toLowerCase();

export function verifierEnvoiAutomatique(courriel: Pick<Courriel, 'destinataire'>, personnesDuCompte: readonly PersonneDuCompte[]): ResultatEnvoiAutomatique {
  const cible = typeof courriel.destinataire === 'string' ? normaliser(courriel.destinataire) : '';
  const connue = cible !== '' && personnesDuCompte.some((p) => p.actif && normaliser(p.adresse) === cible);
  return connue ? { ok: true } : { ok: false, cause: 'destinataire_tiers' };
}

/** Applique la règle à tout envoi passant par le port injecté ; le refus est journalisé par code, puis levé. */
export function envelopperPortEnvoi(port: PortEnvoi, lirePersonnes: () => Promise<readonly PersonneDuCompte[]>, journaliser: JournalRefus): PortEnvoi {
  return {
    async envoyer(courriel) {
      const verdict = verifierEnvoiAutomatique(courriel, await lirePersonnes());
      if (!verdict.ok) {
        await journaliser({ code: verdict.cause });
        throw new ErreurDestinataire(verdict.cause);
      }
      await port.envoyer(courriel);
    },
  };
}
