import { genererInterface } from '../../../donnees-fictives/src/interface.js';
import type { Notification } from './notifications.js';

export type OptionsNotifications = { nonLues?: boolean | undefined; limite?: number | undefined; decalage?: number | undefined };
type Ligne = { proprietaire: string; notification: Notification };

const PERSONNE_FICTIVE = 'personne-fictive-001';
const AUTRE_FICTIVE = 'personne-fictive-002';
const LIEN_ALERTES = '/alertes';
const GRAVITE_DEFAUT = 'info';

export class ErreurNotification extends Error {
  override name = 'ErreurNotification';
  constructor(readonly code: 'notification_inconnue') {
    super(code);
  }
}

/** Service en mémoire bâti sur le jeu fictif ; une notification d'une autre personne est invisible (404). */
export function creerServiceNotifications(options: { maintenant?: () => number } = {}) {
  const maintenant = options.maintenant ?? Date.now;
  const profil = genererInterface().profils.pleine;
  const graviteDe = (code: string) => profil.alertes.find((a) => a.regle === code)?.gravite ?? GRAVITE_DEFAUT;
  const lignes: Ligne[] = profil.notifications.map((n) => ({
    proprietaire: PERSONNE_FICTIVE,
    notification: {
      id: n.id,
      categorie: 'alerte',
      gravite: graviteDe(n.code),
      titreCode: n.code,
      lien: LIEN_ALERTES,
      creeLe: n.creeLe,
      ...(n.lue ? { lueLe: n.creeLe } : {}),
    },
  }));
  lignes.push({
    proprietaire: AUTRE_FICTIVE,
    notification: { id: 'no-autre', categorie: 'alerte', gravite: GRAVITE_DEFAUT, titreCode: 'ALR-08', lien: LIEN_ALERTES, creeLe: profil.jourDeReference },
  });
  const rejeux = new Map<string, unknown>();
  const unefois = <T>(operation: string, cle: string, calcul: () => T): T => {
    const id = `${operation}:${cle}`;
    if (rejeux.has(id)) return rejeux.get(id) as T;
    const reponse = calcul();
    rejeux.set(id, reponse);
    return reponse;
  };
  const miennes = (): Notification[] => lignes.filter((l) => l.proprietaire === PERSONNE_FICTIVE).map((l) => l.notification);
  const marquer = (n: Notification): boolean => {
    if (n.lueLe !== undefined) return false;
    n.lueLe = new Date(maintenant()).toISOString();
    return true;
  };

  return {
    lister(o: OptionsNotifications = {}): { body: Notification[]; decalage: number; total: number } {
      const triees = miennes()
        .filter((n) => !o.nonLues || n.lueLe === undefined)
        .sort((a, b) => (a.creeLe === b.creeLe ? (a.id < b.id ? -1 : 1) : a.creeLe < b.creeLe ? 1 : -1));
      const decalage = o.decalage ?? 0;
      const fin = o.limite === undefined ? undefined : decalage + o.limite;
      return { body: triees.slice(decalage, fin).map((n) => ({ ...n })), decalage, total: triees.length };
    },
    /** Lève `ErreurNotification` si l'identifiant est inconnu ou appartient à une autre personne. */
    marquerLue(id: string, cleIdempotence: string): { body: Notification } {
      return unefois(`lue:${id}`, cleIdempotence, () => {
        const n = miennes().find((x) => x.id === id);
        if (!n) throw new ErreurNotification('notification_inconnue');
        marquer(n);
        return { body: { ...n } };
      });
    },
    toutLire(cleIdempotence: string): { body: { marquees: number } } {
      return unefois('tout', cleIdempotence, () => ({ body: { marquees: miennes().filter(marquer).length } }));
    },
  };
}
export type ServiceNotifications = ReturnType<typeof creerServiceNotifications>;
