// Notifications rares et utiles (PR-R5, PR-R6) : fonctions pures, codes seulement, aucun montant ni nom de tiers.
import { ETATS_ALERTE_ACTIFS, type GraviteAlerte } from '../interface/types.js';
import type { Alerte } from './moteur.js';

export type Categorie = 'a_valider' | 'echeance' | 'urgent' | 'cabinet';

export interface Notification {
  alerteId: string;
  categorie: Categorie;
  gravite: GraviteAlerte;
  titreCode: string;
  lien: string;
}

export class ErreurNotification extends Error {
  override name = 'ErreurNotification';
  readonly code: 'id_invalide' | 'nb_actions_invalide';
  constructor(code: 'id_invalide' | 'nb_actions_invalide') {
    super(code);
    this.code = code;
  }
}

const ID_VALIDE = /^[A-Za-z0-9_-]+$/;

export function notificationsAEmettre(
  alertes: readonly Alerte[],
  options: {
    categoriesChoisies: readonly Categorie[];
    dejaEmises: readonly { alerteId: string; gravite: GraviteAlerte }[];
    categorieDe: (regle: string) => Categorie;
  },
): { immediates: Notification[]; pourResume: Notification[] } {
  const immediates: Notification[] = [];
  const pourResume: Notification[] = [];
  for (const a of alertes) {
    if (!ETATS_ALERTE_ACTIFS.includes(a.etat) || a.gravite === 'info') continue;
    const categorie = options.categorieDe(a.regle);
    if (!options.categoriesChoisies.includes(categorie)) continue;
    if (options.dejaEmises.some((e) => e.alerteId === a.id && e.gravite === a.gravite)) continue;
    if (!ID_VALIDE.test(a.id)) throw new ErreurNotification('id_invalide');
    const n: Notification = { alerteId: a.id, categorie, gravite: a.gravite, titreCode: a.regle, lien: `/alertes/${a.id}` };
    (a.gravite === 'a_faire' ? pourResume : immediates).push(n);
  }
  return { immediates, pourResume };
}

export function decisionResume(p: {
  personneId: string;
  dateDuJour: string;
  actifs: boolean;
  nbActions: number;
  dejaEnvoye: readonly { personneId: string; dateEnvoi: string }[];
}): 'envoyer' | 'ignore_rien_a_faire' | 'deja_envoye' | 'desactive' {
  if (!Number.isSafeInteger(p.nbActions) || p.nbActions < 0) throw new ErreurNotification('nb_actions_invalide');
  if (!p.actifs) return 'desactive';
  if (p.dejaEnvoye.some((e) => e.personneId === p.personneId && e.dateEnvoi === p.dateDuJour)) return 'deja_envoye';
  return p.nbActions > 0 ? 'envoyer' : 'ignore_rien_a_faire';
}
