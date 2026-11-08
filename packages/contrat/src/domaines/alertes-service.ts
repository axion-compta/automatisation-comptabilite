import { genererInterface } from '../../../donnees-fictives/src/interface.js';
import { alertesDuJour, compteursParEntree } from '../../../noyau/src/alertes/gravite.js';
import type { Alerte } from '../../../noyau/src/alertes/moteur.js';
import { ajouterJours } from '../../../noyau/src/interface/dates.js';
import { rangGravite } from '../../../noyau/src/interface/types.js';
import type { AlerteVue } from './alertes.js';
import { EXERCICE_FICTIF } from './calendrier-service.js';

export type OptionsAlertes = { etat?: AlerteVue['etat'] | undefined; entree?: string | undefined; limite?: number | undefined; decalage?: number | undefined };

const LIEN_ALERTES = '/alertes';
/** Nombre de cartes des « alertes du jour » (AL-R5). */
export const CARTES_DU_JOUR = 3;

/** Service en mémoire bâti sur le jeu fictif ; il garde son état (modifié plus tard par la fiche L15-T41). */
export function creerServiceAlertes() {
  const profil = genererInterface().profils.pleine;
  const entrees = new Map(profil.alertes.map((a) => [a.regle, a.entreeMenu]));
  const etat: AlerteVue[] = profil.alertes.map((a, i) => ({
    id: a.id, regle: a.regle, gravite: a.gravite, etat: a.etat, entreeMenu: a.entreeMenu,
    ouverteLe: ajouterJours(profil.jourDeReference, -i), version: a.version, titreCode: a.regle, lien: LIEN_ALERTES,
  }));
  const vue = (a: Alerte): AlerteVue => etat.find((x) => x.id === a.id) as AlerteVue;
  const noyau = (): Alerte[] =>
    etat.map((a) => ({ id: a.id, regle: a.regle, objetType: 'alerte', objetId: a.id, cle: a.id, gravite: a.gravite, etat: a.etat, version: a.version, ...(a.echeanceLe !== undefined ? { echeanceLe: a.echeanceLe } : {}) }));
  const trier = (a: AlerteVue, b: AlerteVue): number => {
    const ouverte = Number(b.etat === 'ouverte') - Number(a.etat === 'ouverte');
    if (ouverte !== 0) return ouverte;
    const g = rangGravite(b.gravite) - rangGravite(a.gravite);
    if (g !== 0) return g;
    if (a.ouverteLe !== b.ouverteLe) return a.ouverteLe < b.ouverteLe ? 1 : -1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  };

  return {
    exerciceConnu: (exercice: string): boolean => exercice === EXERCICE_FICTIF,
    lister(o: OptionsAlertes = {}): { body: AlerteVue[]; decalage: number; total: number } {
      const triees = etat.filter((a) => (!o.etat || a.etat === o.etat) && (!o.entree || a.entreeMenu === o.entree)).sort(trier);
      const decalage = o.decalage ?? 0;
      const fin = o.limite === undefined ? undefined : decalage + o.limite;
      return { body: triees.slice(decalage, fin).map((a) => ({ ...a })), decalage, total: triees.length };
    },
    compteurs() {
      const tout = noyau();
      const jour = alertesDuJour(tout, CARTES_DU_JOUR);
      return {
        body: {
          parEntree: compteursParEntree(tout, (regle) => entrees.get(regle) ?? ''),
          alertesDuJour: { cartes: jour.cartes.map((a) => ({ ...vue(a) })), urgentesTotal: jour.urgentesTotal },
        },
      };
    },
  };
}
export type ServiceAlertesComplet = ReturnType<typeof creerServiceAlertes>;
