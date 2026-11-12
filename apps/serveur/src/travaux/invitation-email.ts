// E-mail d'invitation d'un expert : lien à usage unique, aucun montant, aucune donnée de la société. Envoi par le port enveloppé.
import type { PortEnvoi } from './resume-email.js';

export const SUJET_INVITATION = 'Invitation à rejoindre un dossier';
const ADRESSE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

export interface ParametresInvitation {
  /** Port déjà enveloppé par `envelopperPortEnvoi`. */
  envoi: PortEnvoi;
  /** Ajoute l'invité aux personnes du compte (actif) : à faire avant l'envoi. */
  ajouterInvite(invitationId: string, adresse: string): Promise<void>;
  baseLiens: string;
}

export function texteInvitation(lien: string): string {
  return ['Bonjour,', '', 'Vous êtes invité à rejoindre un dossier. Ouvrez le lien ci-dessous pour accepter.', lien, '',
    'Ce lien ne sert qu’une fois. Si vous n’attendiez pas cette invitation, ignorez ce message.'].join('\n');
}

export async function envoyerInvitation(o: { invitationId: string; adresse: string; jeton: string }, p: ParametresInvitation): Promise<void> {
  const adresse = typeof o.adresse === 'string' ? o.adresse.trim() : '';
  if (!ADRESSE.test(adresse) || o.invitationId.trim() === '' || o.jeton.trim() === '') throw new Error('parametre_invalide');
  await p.ajouterInvite(o.invitationId, adresse);
  const lien = `${p.baseLiens}/invitation/${encodeURIComponent(o.jeton)}`;
  await p.envoi.envoyer({ destinataire: adresse, sujet: SUJET_INVITATION, texte: texteInvitation(lien) });
}
