// Actions sur les alertes (AL-R4) : reporter, ignorer, annuler. Fonctions pures, codes seulement.
// Les valeurs de produit (jours permis, taille du motif, durée d'annulation) sont passées par l'appelant.
import { ajouterJours, comparerDates } from '../interface/dates.js';
import type { Alerte, LigneJournal } from './moteur.js';

export type CodeActionAlerte =
  | 'role_insuffisant' | 'role_lecture' | 'version_perimee' | 'alerte_inactive' | 'report_invalide'
  | 'report_apres_echeance' | 'report_interdit' | 'motif_requis' | 'bloquant_non_ignorable' | 'delai_annulation_depasse';

const STATUTS: Record<CodeActionAlerte, number> = {
  role_insuffisant: 403, role_lecture: 403, report_interdit: 403, bloquant_non_ignorable: 403,
  version_perimee: 409, alerte_inactive: 409, delai_annulation_depasse: 409,
  report_invalide: 422, report_apres_echeance: 422, motif_requis: 422,
};

export class ErreurActionAlerte extends Error {
  readonly code: CodeActionAlerte;
  readonly statut: number;
  constructor(code: CodeActionAlerte) {
    super(code);
    this.name = 'ErreurActionAlerte';
    this.code = code;
    this.statut = STATUTS[code];
  }
}

const VALIDER = 'compta-valider';
const LIRE = 'compta-lire';
export type AlerteReportable = Alerte & { reporteeJusquAu?: string };
export interface ResultatAction {
  alerte: AlerteReportable;
  journal: LigneJournal;
}
interface Commun {
  versionAttendue: number;
  permissions: readonly string[];
}

/** Permission, puis version, puis alerte active : les règles métier viennent après. */
function controler(a: Alerte, o: Commun): void {
  if (!o.permissions.includes(VALIDER)) throw new ErreurActionAlerte(o.permissions.includes(LIRE) ? 'role_lecture' : 'role_insuffisant');
  if (a.version !== o.versionAttendue) throw new ErreurActionAlerte('version_perimee');
  if (a.etat !== 'ouverte' && a.etat !== 'reportee') throw new ErreurActionAlerte('alerte_inactive');
}

function ligne(avant: Alerte, apres: Alerte, cause: LigneJournal['cause'], le: string): LigneJournal {
  return { alerteId: apres.id, deEtat: avant.etat, aEtat: apres.etat, deGravite: avant.gravite, aGravite: apres.gravite, cause, acteurType: 'humain', le };
}

export function reporter(a: Alerte, o: Commun & { jours: number; jour: string; joursPermis: readonly number[] }): ResultatAction {
  controler(a, o);
  if (!Number.isSafeInteger(o.jours) || !o.joursPermis.includes(o.jours)) throw new ErreurActionAlerte('report_invalide');
  if (a.gravite === 'urgent' || a.gravite === 'bloquant') throw new ErreurActionAlerte('report_interdit');
  const jusqua = ajouterJours(o.jour, o.jours);
  if (a.echeanceLe !== undefined && comparerDates(jusqua, a.echeanceLe) > 0) throw new ErreurActionAlerte('report_apres_echeance');
  const apres: AlerteReportable = { ...a, etat: 'reportee', reporteeJusquAu: jusqua, version: a.version + 1 };
  return { alerte: apres, journal: ligne(a, apres, 'report', o.jour) };
}

export function ignorer(a: Alerte, o: Commun & { motif: string; motifMin: number; le: string }): ResultatAction {
  controler(a, o);
  if (a.gravite === 'bloquant') throw new ErreurActionAlerte('bloquant_non_ignorable');
  if (Array.from(o.motif.trim()).length < o.motifMin) throw new ErreurActionAlerte('motif_requis');
  const apres: Alerte = { ...a, etat: 'ignoree', version: a.version + 1 };
  return { alerte: apres, journal: ligne(a, apres, 'ignorer', o.le) };
}

/** Rend l'état d'avant si l'annulation tombe dans la durée permise ; horodatages en millisecondes entières. */
export function annuler(
  a: Alerte,
  derniere: { le: number; avant: Alerte },
  o: { maintenant: number; delaiMs: number; le: string },
): ResultatAction {
  const ecart = o.maintenant - derniere.le;
  const entiers = [derniere.le, o.maintenant, o.delaiMs].every(Number.isSafeInteger);
  if (!entiers || ecart < 0 || ecart > o.delaiMs) throw new ErreurActionAlerte('delai_annulation_depasse');
  const apres: Alerte = { ...derniere.avant, version: a.version + 1 };
  return { alerte: apres, journal: ligne(a, apres, 'annulation', o.le) };
}
