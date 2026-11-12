// Temps humain par carte (V3-QUA-007) : mesure la durée de résolution d'une carte et émet « carte_resolue ».
// Sans contenu : seulement le code d'écran et la durée. Aucun appel réseau ici : tout passe par api.ts.
import { ecrire, nouvelleCle } from '../api.js';

export type EvenementCarte = { type: 'carte_resolue'; ecran_code: string; duree_ms: number };
export type OptionsMesure = {
  /** Défaut : mesure désactivée. */
  mesureActive?: () => boolean;
  envoyer?: (e: EvenementCarte) => Promise<unknown>;
};

/** Mêmes bornes que la route /usage : durée entière de 0 à une heure. */
export const DUREE_MAX_MS = 3_600_000;
const ECRAN = /^[a-z][a-z0-9]{1,5}$/;
const TOUT_ACCEPTER = { safeParse: (v: unknown) => ({ success: true, data: v }) };

const envoyerParDefaut = (e: EvenementCarte): Promise<unknown> =>
  ecrire('POST', '/usage', { evenements: [e] }, TOUT_ACCEPTER, nouvelleCle());

export function demarrerMesure(ecranCode: string, horloge: () => number, options: OptionsMesure = {}): { resoudre: () => Promise<void> } {
  if (!ECRAN.test(ecranCode)) throw new RangeError('code d’écran invalide');
  const { mesureActive = () => false, envoyer = envoyerParDefaut } = options;
  const debut = horloge();
  let fait = false;
  return {
    async resoudre() {
      if (fait) return;
      fait = true;
      if (!mesureActive()) return;
      const duree = horloge() - debut;
      if (!Number.isInteger(duree) || duree < 0 || duree > DUREE_MAX_MS) return;
      await envoyer({ type: 'carte_resolue', ecran_code: ecranCode, duree_ms: duree });
    },
  };
}
