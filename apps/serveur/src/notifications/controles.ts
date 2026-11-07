// Envoi des notifications des contrôles : cloche de la console (interface du module C4) et e-mail choisi.
// Décisions pures : noyau/controles/notifications. Interrupteur fermé par défaut : rien ne part.
import { aOublierApresFermeture, decisionsNotification, type DecisionsNotification, type Notifie, type Ouvert } from '../../../../packages/noyau/src/controles/notifications.js';

export interface MessageCloche { code: 'controle_bloquant'; personneId: string; regleId: string; objetId: string }
/** Codes seulement : aucune donnée de client dans l'e-mail. */
export interface MessageEmail { code: 'controle_bloquant'; a: string; regleId: string; objetId: string }

export interface HoteC4 {
  readonly actif: boolean;
  cloche(message: MessageCloche): void | Promise<void>;
  email(message: MessageEmail): void | Promise<void>;
}

export interface DemandeEnvoi {
  hote: HoteC4;
  ouverts: readonly Ouvert[];
  dejaNotifies: readonly Notifie[];
  destinataire: { id: string; email?: string };
}

export interface ResultatEnvoi {
  envoyees: Notifie[];
  dejaNotifies: Notifie[];
  /** Résumé quotidien : décidé ici, envoi planifié hors périmètre. */
  resume: DecisionsNotification['resume'];
}

export async function envoyerNotificationsControles(d: DemandeEnvoi): Promise<ResultatEnvoi> {
  const conserves = aOublierApresFermeture(d.dejaNotifies, d.ouverts);
  const { immediates, resume } = decisionsNotification(d.ouverts, conserves);
  if (!d.hote.actif) return { envoyees: [], dejaNotifies: conserves, resume };
  const envoyees: Notifie[] = [];
  for (const n of immediates) {
    try {
      await d.hote.cloche({ code: 'controle_bloquant', personneId: d.destinataire.id, ...n });
      if (d.destinataire.email !== undefined) await d.hote.email({ code: 'controle_bloquant', a: d.destinataire.email, ...n });
      envoyees.push(n);
    } catch {
      // Non marquée notifiée : elle repartira au prochain passage.
    }
  }
  return { envoyees, dejaNotifies: [...conserves, ...envoyees], resume };
}
