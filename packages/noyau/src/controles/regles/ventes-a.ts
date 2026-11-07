// Contrôles de vente CC-V01 à CC-V10 (anomalies A1 à A10). Les règles appellent les fonctions pures
// du lot 10 et ne recalculent rien. Aucun texte affiché, aucun taux ni seuil : tout arrive en argument.
import type { Centimes } from '../../argent/index.js';
import { controleTotaux, controleTvaParTaux, type EntreeTotaux, type LigneControleTva } from '../../ventes/controles-piece.js';
import { dedoublonner, type PieceRecue } from '../../ventes/dedoublonnage.js';
import { controlerMentions, type EntreeMentions } from '../../ventes/mentions.js';
import { rangerFacture, type DemandeRangement } from '../../ventes/periode.js';
import { dateExigibilite, type CasLigne, type DatesVente } from '../../ventes/schema.js';
import { analyserSeries, type PieceSerie } from '../../ventes/series.js';
import type { NatureLigne } from '../../ventes/types.js';
import type { Blocage, Declencheur, Gravite, RegleControle, SortieRegle } from '../moteur.js';
import { alerte, ErreurControle, ok } from './commun.js';

export interface ObjetTauxVente {
  lignes: readonly LigneControleTva[];
  /** Taux attendus à la date, en points de base, lus par l'appelant. */
  tauxAttendus: readonly number[];
}
export interface ObjetSerieVente {
  pieces: readonly PieceSerie[];
  maxTrous: number;
}
export interface ObjetDateOperation {
  cas: CasLigne;
  nature: NatureLigne;
  dates: DatesVente;
}

const ARRIVEE: Declencheur[] = ['arrivee', 'a_la_demande'];
const ARRIVEE_TVA: Declencheur[] = ['arrivee', 'avant_tva', 'a_la_demande'];

function regle<T>(id: string, gravite: Gravite, bloque: Blocage[], declencheurs: Declencheur[], evaluer: (o: T) => SortieRegle): RegleControle<T> {
  return { id, version: 1, gravite, bloque, declencheurs, actif: true, evaluer };
}

/** Alerte avec le nombre d'éléments en cause, OK sinon. */
const compte = (n: number): SortieRegle => (n === 0 ? ok() : alerte(undefined, n));
export const regleCCV01 = regle<EntreeTotaux>('CC-V01', 'M', [], ARRIVEE, (o) => {
  const r = controleTotaux(o);
  return r.ok ? ok() : alerte(r.ecart);
});
export const regleCCV02 = regle<ObjetTauxVente>('CC-V02', 'M', [], ARRIVEE_TVA, (o) => {
  const l = controleTvaParTaux(o.lignes, o.tauxAttendus).find((x) => x.anomalie === 'A2');
  return l === undefined ? ok() : alerte(l.ecart as Centimes);
});
export const regleCCV03 = regle<ObjetTauxVente>('CC-V03', 'B', ['tva'], ARRIVEE_TVA, (o) => {
  const l = controleTvaParTaux(o.lignes, o.tauxAttendus).find((x) => x.anomalie === 'A3');
  return l === undefined ? ok() : alerte(undefined, l.tauxPdb);
});

function series(o: ObjetSerieVente) {
  return analyserSeries(o.pieces, { maxTrous: o.maxTrous });
}
export const regleCCV04 = regle<ObjetSerieVente>('CC-V04', 'M', [], ARRIVEE, (o) => compte(series(o).reduce((n, s) => n + s.trous.length, 0)));
export const regleCCV05 = regle<ObjetSerieVente>('CC-V05', 'M', ['validation'], ARRIVEE, (o) => compte(series(o).reduce((n, s) => n + s.doublons.length, 0)));
export const regleCCV06 = regle<ObjetSerieVente>('CC-V06', 'm', [], ARRIVEE, (o) => compte(series(o).reduce((n, s) => n + s.datesQuiReculent.length, 0)));
export const regleCCV07 = regle<EntreeMentions>('CC-V07', 'M', [], ARRIVEE, (o) => {
  const carte = controlerMentions(o).cartes.find((x) => x.anomalie === 'A7');
  return carte === undefined ? ok() : alerte(undefined, carte.code);
});
export const regleCCV08 = regle<ObjetDateOperation>('CC-V08', 'm', [], ARRIVEE, (o) => dateExigibilite(o.cas, o.nature, o.dates).dateOperationSupposee ? alerte() : ok());
export const regleCCV09 = regle<DemandeRangement>('CC-V09', 'M', [], ARRIVEE_TVA, (o) => rangerFacture(o).cartes.includes('A9') ? alerte() : ok());
export const regleCCV10 = regle<readonly PieceRecue[]>('CC-V10', 'm', [], ARRIVEE, (pieces) => {
  if (!Array.isArray(pieces)) throw new ErreurControle('entree_invalide');
  return compte(dedoublonner(pieces).doublons.length);
});

export const reglesVentesA = [regleCCV01, regleCCV02, regleCCV03, regleCCV04, regleCCV05, regleCCV06, regleCCV07, regleCCV08, regleCCV09, regleCCV10] as const;
