import { CLES_PROFIL } from './profil-champs.js';
import type { Apercu, ChangementConfirme, DemandeChangement } from './profil-changements.js';
import type { ServiceProfilChamps } from './profil-champs-service.js';

export type CodeErreurChangement = 'PERIODE_DEPOSEE' | 'APERCU_INCONNU' | 'APERCU_PERIME' | 'CLE_INCONNUE';
export class ErreurChangement extends Error {
  constructor(readonly code: CodeErreurChangement) {
    super(code);
  }
}

/** Objets fictifs de la société : aucun lien avec une donnée réelle. */
export const BROUILLONS_FICTIFS = ['2026-01-20', '2026-03-10', '2026-05-05', '2026-08-12'];
export const DECLARATIONS_FICTIVES = [
  { debut: '2026-01-01', fin: '2026-03-31', deposee: true },
  { debut: '2026-04-01', fin: '2026-06-30', deposee: false },
  { debut: '2026-07-01', fin: '2026-09-30', deposee: false },
];
export const ECHEANCES_FICTIVES = [
  { id: 'echeance-tva-t2', date: '2026-07-24' },
  { id: 'echeance-tva-t3', date: '2026-10-24' },
];
/** Clés dont le changement déplace des objets ; les autres ne touchent rien. */
const CLES_IMPACT = ['forme', 'exercice_debut', 'exercice_fin', 'regime_tva', 'regime_imposition'];

/** Aperçu sans effet ; confirmation = ajout d'une ligne datée. Le profil lu sert d'empreinte. */
export function creerServiceProfilChangements(profilChamps: Pick<ServiceProfilChamps, 'lire'>) {
  const lignes: ChangementConfirme[] = [];
  const apercus = new Map<string, { demande: DemandeChangement; empreinte: string }>();
  const reponses = new Map<string, { apercuId: string; ligne: ChangementConfirme }>();
  const empreinte = (jour: string) => JSON.stringify([profilChamps.lire(undefined, jour), lignes.length]);

  return {
    lignes: (): readonly ChangementConfirme[] => lignes.slice(),
    apercu(demande: DemandeChangement, aujourdhui: string): Apercu {
      if (!(CLES_PROFIL as readonly string[]).includes(demande.cle)) throw new ErreurChangement('CLE_INCONNUE');
      if (DECLARATIONS_FICTIVES.some((d) => d.deposee && demande.effetDebut <= d.fin)) throw new ErreurChangement('PERIODE_DEPOSEE');
      const touche = CLES_IMPACT.includes(demande.cle);
      const apercuId = 'apercu-' + String(apercus.size + 1).padStart(6, '0');
      apercus.set(apercuId, { demande, empreinte: empreinte(aujourdhui) });
      return {
        apercuId,
        brouillonsRecalcules: touche ? BROUILLONS_FICTIFS.filter((j) => j >= demande.effetDebut).length : 0,
        declarationsRecalculees: touche ? DECLARATIONS_FICTIVES.filter((d) => !d.deposee && d.fin >= demande.effetDebut).map(({ debut, fin }) => ({ debut, fin })) : [],
        echeancesDeplacees: touche ? ECHEANCES_FICTIVES.filter((e) => e.date >= demande.effetDebut).map((e) => e.id) : [],
        ecrituresValideesTouchees: 0,
      };
    },
    confirmer(apercuId: string, cleIdem: string, aujourdhui: string): ChangementConfirme {
      const deja = reponses.get(cleIdem);
      if (deja?.apercuId === apercuId) return deja.ligne;
      const a = apercus.get(apercuId);
      if (!a) throw new ErreurChangement('APERCU_INCONNU');
      if (a.empreinte !== empreinte(aujourdhui)) throw new ErreurChangement('APERCU_PERIME');
      const ligne: ChangementConfirme = { ...a.demande, confirmeLe: aujourdhui };
      lignes.push(ligne);
      apercus.delete(apercuId);
      reponses.set(cleIdem, { apercuId, ligne });
      return ligne;
    },
  };
}
export type ServiceProfilChangements = ReturnType<typeof creerServiceProfilChangements>;
