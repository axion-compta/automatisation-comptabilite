import { genererInterface } from '../../../donnees-fictives/src/interface.js';
import { annuler, ErreurActionAlerte, ignorer, reporter, type ResultatAction } from '../../../noyau/src/alertes/actions.js';
import { alertesDuJour, compteursParEntree } from '../../../noyau/src/alertes/gravite.js';
import type { Alerte, LigneJournal } from '../../../noyau/src/alertes/moteur.js';
import { ajouterJours } from '../../../noyau/src/interface/dates.js';
import { rangGravite } from '../../../noyau/src/interface/types.js';
import type { AlerteVue } from './alertes.js';
import { EXERCICE_FICTIF } from './calendrier-service.js';

export type OptionsAlertes = { etat?: AlerteVue['etat'] | undefined; entree?: string | undefined; limite?: number | undefined; decalage?: number | undefined };

const LIEN_ALERTES = '/alertes';
/** Nombre de cartes des « alertes du jour » (AL-R5). */
export const CARTES_DU_JOUR = 3;

/** Réglages des actions (valeurs de produit nommées, passées aux règles pures). */
export const JOURS_PERMIS: readonly number[] = [1, 3, 7];
export const MOTIF_MIN = 5;
export const DELAI_ANNULATION_MS = 10_000;
const PERMISSIONS_FICTIVES = ['compta-lire', 'compta-valider'];

export type OptionsServiceAlertes = {
  maintenant?: () => number; jour?: () => string; permissions?: readonly string[]; echeances?: Record<string, string>;
};
export type ActionAlerte = 'reporter' | 'ignorer' | 'annuler';
export type ResultatActionVue = { body: AlerteVue & { avant: AlerteVue['etat']; apres: AlerteVue['etat'] } };
/** Échec d'une action : code du noyau (ou alerte_inconnue) et version actuelle pour le conflit. */
export class ErreurService extends Error {
  constructor(readonly code: string, readonly versionActuelle?: number) { super(code); }
}

/** Service en mémoire bâti sur le jeu fictif ; il garde son état et le journal des actions. */
export function creerServiceAlertes(options: OptionsServiceAlertes = {}) {
  const maintenant = options.maintenant ?? Date.now;
  const permissions = options.permissions ?? PERMISSIONS_FICTIVES;
  const profil = genererInterface().profils.pleine;
  const entrees = new Map(profil.alertes.map((a) => [a.regle, a.entreeMenu]));
  const etat: AlerteVue[] = profil.alertes.map((a, i) => ({
    id: a.id, regle: a.regle, gravite: a.gravite, etat: a.etat, entreeMenu: a.entreeMenu,
    ouverteLe: ajouterJours(profil.jourDeReference, -i), version: a.version, titreCode: a.regle, lien: LIEN_ALERTES,
    ...(options.echeances?.[a.regle] !== undefined ? { echeanceLe: options.echeances[a.regle] as string } : {}),
  }));
  const jourCourant = options.jour ?? ((): string => profil.jourDeReference);
  const journal: LigneJournal[] = [];
  const dernieres = new Map<string, { le: number; avant: Alerte }>();
  const rejeux = new Map<string, ResultatActionVue>();
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

  function agir(action: ActionAlerte, cle: string, id: string, version: number, corps: { jours?: number; motif?: string }): ResultatActionVue {
    const deja = rejeux.get(`${action}:${id}:${cle}`);
    if (deja) return structuredClone(deja);
    const courante = etat.find((a) => a.id === id);
    if (!courante) throw new ErreurService('alerte_inconnue');
    const avant = noyau().find((a) => a.id === id) as Alerte;
    const commun = { versionAttendue: version, permissions };
    const le = jourCourant();
    let res: ResultatAction;
    try {
      if (action === 'reporter') res = reporter(avant, { ...commun, jours: corps.jours as number, jour: le, joursPermis: JOURS_PERMIS });
      else if (action === 'ignorer') res = ignorer(avant, { ...commun, motif: corps.motif as string, motifMin: MOTIF_MIN, le });
      else {
        const derniere = dernieres.get(id);
        if (!permissions.includes('compta-valider')) throw new ErreurActionAlerte('role_insuffisant');
        if (avant.version !== version) throw new ErreurActionAlerte('version_perimee');
        if (!derniere) throw new ErreurActionAlerte('delai_annulation_depasse');
        res = annuler(avant, derniere, { maintenant: maintenant(), delaiMs: DELAI_ANNULATION_MS, le });
      }
    } catch (e) {
      if (e instanceof ErreurActionAlerte) throw new ErreurService(e.code, e.code === 'version_perimee' ? courante.version : undefined);
      throw e;
    }
    if (action === 'annuler') dernieres.delete(id);
    else dernieres.set(id, { le: maintenant(), avant });
    courante.etat = res.alerte.etat;
    courante.version = res.alerte.version;
    journal.push(res.journal);
    const reponse: ResultatActionVue = { body: { ...courante, avant: avant.etat, apres: courante.etat } };
    rejeux.set(`${action}:${id}:${cle}`, structuredClone(reponse));
    return reponse;
  }

  return {
    journal: (): LigneJournal[] => journal.map((l) => ({ ...l })),
    reporter: (cle: string, id: string, jours: number, version: number) => agir('reporter', cle, id, version, { jours }),
    ignorer: (cle: string, id: string, motif: string, version: number) => agir('ignorer', cle, id, version, { motif }),
    annuler: (cle: string, id: string, version: number) => agir('annuler', cle, id, version, {}),
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
