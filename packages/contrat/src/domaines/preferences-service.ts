import { appliquerEcriture, lirePreferences, type Ligne, type Origine } from '../../../noyau/src/preferences/fusion.js';
import { ErreurPreference, validerPreference, type Appareil } from '../../../noyau/src/preferences/valider.js';
import { enregistrer, pseudonyme, validerEvenements, type EvenementUsage } from '../../../noyau/src/usage/usage.js';

// Réglages d'interface (pas des valeurs légales).
const TOLERANCE_HORLOGE_MS = 300_000;
const DUREE_MAX_ECRAN_MS = 3_600_000;
const PERSONNE_FICTIVE = 'personne-fictive-001';
const SECRET_FICTIF = 'FICTIF-PAS-UN-SECRET-'.repeat(2);
const DEFAUTS: Record<string, unknown> = {
  menu_etat: 'ouvert',
  chat_etat: 'reduit',
  mode: 'simple',
  usage_mesure: 'desactivee',
  premier_lancement: { termine: false },
};

export class ErreurUsage extends Error {
  override name = 'ErreurUsage';
  constructor(readonly code: 'champ_inconnu') {
    super(code);
  }
}

export type CorpsEcriture = { valeur: unknown; appareil: Appareil; modifieLeClient?: number | undefined };
export type ReponseEcriture = { body: { cle: string; appareil: Appareil; valeur: unknown; origine: Origine } };
export type ReponseLecture = { body: ReturnType<typeof lirePreferences> };
export type EvenementEnregistre = EvenementUsage & { pseudonyme: string };

/** Service en mémoire : une seule personne fictive, horloge injectable, rejeu par `Idempotency-Key`. */
export function creerServicePreferences(options: { maintenant?: () => number } = {}) {
  const maintenant = options.maintenant ?? Date.now;
  let lignes: Ligne[] = [];
  const mesures: EvenementEnregistre[] = [];
  const rejeux = new Map<string, unknown>();
  const unefois = <T>(operation: string, cle: string, calcul: () => T): T => {
    const id = `${operation}:${cle}`;
    if (rejeux.has(id)) return rejeux.get(id) as T;
    const reponse = calcul();
    rejeux.set(id, reponse);
    return reponse;
  };
  const mesureActive = (): 'active' | 'desactivee' =>
    lirePreferences(lignes, 'bureau', DEFAUTS)['usage_mesure']?.valeur === 'active' ? 'active' : 'desactivee';

  return {
    lire(appareil: 'bureau' | 'mobile' = 'bureau'): ReponseLecture {
      return { body: lirePreferences(lignes, appareil, DEFAUTS) };
    },
    /** Lève `ErreurPreference` (clé inconnue, valeur hors liste, format fixe) ; la dernière écriture gagne. */
    ecrire(cle: string, corps: CorpsEcriture, cleIdempotence: string): ReponseEcriture {
      return unefois('ecrire', cleIdempotence, () => {
        const v = validerPreference(cle, corps.valeur, corps.appareil);
        const client = corps.modifieLeClient === undefined ? {} : { modifieLeClient: corps.modifieLeClient };
        lignes = appliquerEcriture(lignes, { cle: v.cle, appareil: v.appareil, valeur: v.valeur, ...client }, { maintenant: maintenant(), toleranceMs: TOLERANCE_HORLOGE_MS });
        const lecture = lirePreferences(lignes, v.appareil === 'tous' ? 'bureau' : v.appareil, DEFAUTS)[v.cle];
        return { body: { cle: v.cle, appareil: v.appareil, valeur: lecture?.valeur, origine: lecture?.origine ?? 'personne' } };
      });
    },
    /** Lève `ErreurUsage('champ_inconnu')` ; les autres événements refusés sont jetés. Rien d'écrit si la mesure est désactivée. */
    enregistrerUsage(evenements: unknown[], cleIdempotence: string): void {
      unefois('usage', cleIdempotence, () => {
        const { acceptes, rejetes } = validerEvenements(evenements, { dureeMaxMs: DUREE_MAX_ECRAN_MS });
        if (rejetes.some((r) => r.code === 'champ_inconnu')) throw new ErreurUsage('champ_inconnu');
        const p = pseudonyme(PERSONNE_FICTIVE, SECRET_FICTIF);
        for (const e of enregistrer(acceptes, { mesure: mesureActive() })) mesures.push({ ...e, pseudonyme: p });
        return true;
      });
    },
    /** Mesures écrites (essais seulement). */
    mesures: (): readonly EvenementEnregistre[] => [...mesures],
  };
}
export type ServicePreferences = ReturnType<typeof creerServicePreferences>;
export { ErreurPreference };
