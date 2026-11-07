// Contrôles de vente CC-V11 à CC-V20 (A11 à A20) : fonctions pures du lot 10, aucun texte, taux, seuil ni pays en dur.
import type { Centimes } from '../../argent/index.js';
import { balanceAgee, type EntreeBalanceAgee } from '../../ventes/balance-agee.js';
import { ecritureEncaissement, type EntreeEcritureEncaissement } from '../../ventes/ecriture-encaissement.js';
import { ecritureFacture, type EntreeEcritureFacture } from '../../ventes/ecriture-facture.js';
import { aEmettreParPlateforme, type EntreeEmission } from '../../ventes/emission-electronique.js';
import { controleSolde, type EntreeControleSolde } from '../../ventes/imputation-acompte.js';
import { rangerFacture, type DemandeRangement } from '../../ventes/periode.js';
import { rattacherAvoir, type AvoirALier, type FactureCandidate } from '../../ventes/rattachement-avoir.js';
import { NATURES_CLIENT, STATUTS_VIES, type NatureClient, type StatutVies } from '../../ventes/types.js';
import type { Blocage, Declencheur, Gravite, RegleControle, SortieRegle } from '../moteur.js';
import { alerte, ErreurControle, ok } from './commun.js';

export interface ObjetAvoir {
  avoir: AvoirALier;
  factures: readonly FactureCandidate[];
}
export interface ObjetIdentifiantClient {
  nature: NatureClient;
  siren?: string;
  tva?: string;
}
export interface ObjetClientUe {
  pays: string;
  statutVies: StatutVies;
  paysUe: readonly string[];
}

const ARRIVEE: Declencheur[] = ['arrivee', 'a_la_demande'];
const ARRIVEE_TVA: Declencheur[] = ['arrivee', 'avant_tva', 'a_la_demande'];

function regle<T>(id: string, gravite: Gravite, bloque: Blocage[], declencheurs: Declencheur[], evaluer: (o: T) => SortieRegle): RegleControle<T> {
  return { id, version: 1, gravite, bloque, declencheurs, actif: true, evaluer };
}

const signal = (b: boolean): SortieRegle => (b ? alerte() : ok());
const invalide = (): never => { throw new ErreurControle('entree_invalide'); };
const manquant = (v: string | undefined): boolean => {
  if (v !== undefined && typeof v !== 'string') return invalide();
  return v === undefined || v.trim() === '';
};

export const regleCCV11 = regle<DemandeRangement>('CC-V11', 'M', [], ARRIVEE_TVA, (o) => signal(rangerFacture(o).cartes.includes('A11')));
export const regleCCV12 = regle<ObjetAvoir>('CC-V12', 'M', [], ARRIVEE, (o) => signal(rattacherAvoir(o.avoir, o.factures).cartes.includes('A12')));
export const regleCCV13 = regle<ObjetAvoir>('CC-V13', 'M', [], ARRIVEE, (o) => signal(rattacherAvoir(o.avoir, o.factures).cartes.includes('A13')));
export const regleCCV14 = regle<EntreeControleSolde>('CC-V14', 'M', [], ARRIVEE, (o) => {
  const r = controleSolde(o);
  return r.ok ? ok() : alerte(r.ecart);
});
export const regleCCV15 = regle<ObjetIdentifiantClient>('CC-V15', 'm', [], ARRIVEE, (o) => {
  if (!NATURES_CLIENT.includes(o.nature)) return invalide();
  const sansSiren = manquant(o.siren), sansTva = manquant(o.tva);
  return signal(o.nature === 'professionnel' && sansSiren && sansTva);
});
export const regleCCV16 = regle<EntreeEcritureFacture>('CC-V16', 'B', ['tva'], ARRIVEE_TVA, (o) => signal(ecritureFacture(o).cartes.includes('A16')));
export const regleCCV17 = regle<ObjetClientUe>('CC-V17', 'M', [], ARRIVEE, (o) => {
  const listeValide = Array.isArray(o.paysUe) && o.paysUe.every((p) => typeof p === 'string');
  if (typeof o.pays !== 'string' || !listeValide || !STATUTS_VIES.includes(o.statutVies)) return invalide();
  return signal(o.paysUe.includes(o.pays) && o.statutVies !== 'verifie');
});
export const regleCCV18 = regle<EntreeEcritureEncaissement>('CC-V18', 'M', [], ARRIVEE, (o) => signal(ecritureEncaissement(o).cartes.includes('A18')));
export const regleCCV19 = regle<EntreeBalanceAgee>('CC-V19', 'B', ['cloture'], ARRIVEE, (o) => {
  const r = balanceAgee(o);
  return r.alerte === undefined ? ok() : alerte(r.ecart as Centimes);
});
export const regleCCV20 = regle<EntreeEmission>('CC-V20', 'M', [], ARRIVEE, (o) => {
  const r = aEmettreParPlateforme(o);
  if (r.parametreAbsent) throw new ErreurControle('parametre_absent');
  return signal(r.signal);
});

export const reglesVentesB = [regleCCV11, regleCCV12, regleCCV13, regleCCV14, regleCCV15, regleCCV16, regleCCV17, regleCCV18, regleCCV19, regleCCV20] as const;
