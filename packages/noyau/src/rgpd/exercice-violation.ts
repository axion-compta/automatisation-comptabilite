import type { EvenementArret, EvenementReprise } from '../securite/arret.js';
import { ecartMillisecondes, verifierHorodatage } from '../exploitation/types.js';
import { ErreurRgpd, donneesPermises } from './types.js';
import { resultatExercice, type RaisonExercice } from './violations.js';

export type EntreeExercice = {
  societeTemoin: string;
  societesTemoins: readonly string[];
  debutLe: string;
  finLe: string;
  messageSocietePretLe: string | null;
  dossierAutoritePretLe: string | null;
  arretUrgenceActions: number | null;
  evenementsArret: readonly (EvenementArret | EvenementReprise)[];
};

export type RaisonCompteRendu = RaisonExercice | 'reprise_absente';

export type CompteRenduExercice = {
  reussi: boolean;
  raisons: RaisonCompteRendu[];
  ligne: {
    type: 'rgpd.exercice_a_blanc';
    horodatage: string;
    donnees: { reussi: boolean; raisons: string; societeTemoin: string };
  };
};

function instant(h: string): void {
  try {
    verifierHorodatage(h);
  } catch {
    throw new ErreurRgpd('horodatage_invalide');
  }
}

export function compteRenduExercice(e: EntreeExercice, r: { limiteHeures: number }): CompteRenduExercice {
  const temoin = e.societeTemoin;
  if (typeof temoin !== 'string' || temoin === '' || !e.societesTemoins.includes(temoin)) {
    throw new ErreurRgpd('valeur_interdite');
  }
  for (const ev of e.evenementsArret) {
    if (ev.cible === 'global' || ev.cible?.societeId !== temoin) throw new ErreurRgpd('valeur_interdite');
  }
  instant(e.debutLe);
  instant(e.finLe);
  for (const ev of e.evenementsArret) {
    instant(ev.horodatage);
    if (ecartMillisecondes(e.debutLe, ev.horodatage) < 0 || ecartMillisecondes(ev.horodatage, e.finLe) < 0) {
      throw new ErreurRgpd('ordre_invalide');
    }
  }
  if (e.arretUrgenceActions !== null && !e.evenementsArret.some((ev) => ev.type === 'securite.arret_urgence')) {
    throw new ErreurRgpd('ordre_invalide');
  }
  const ordonnes = e.evenementsArret
    .map((ev, i) => ({ ev, i }))
    .sort((a, b) => ecartMillisecondes(b.ev.horodatage, a.ev.horodatage) || a.i - b.i);
  const dernier = ordonnes.at(-1)?.ev;
  const base = resultatExercice(
    {
      debutLe: e.debutLe,
      messageSocietePretLe: e.messageSocietePretLe,
      dossierAutoritePretLe: e.dossierAutoritePretLe,
      arretUrgenceActions: e.arretUrgenceActions,
    },
    r,
  );
  const raisons: RaisonCompteRendu[] = [...base.raisons];
  if (dernier !== undefined && dernier.type !== 'securite.reprise') raisons.push('reprise_absente');
  const triees = [...new Set(raisons)].sort();
  const donnees = { reussi: triees.length === 0, raisons: triees.join(','), societeTemoin: temoin };
  donneesPermises(donnees);
  return { reussi: donnees.reussi, raisons: triees, ligne: { type: 'rgpd.exercice_a_blanc', horodatage: e.finLe, donnees } };
}
