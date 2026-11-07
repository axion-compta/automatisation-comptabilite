// Prévision de trésorerie sur éléments datés : toujours une estimation, avec ses hypothèses.
import { type Centimes, ajouter, centimes } from '../../argent/index.js';
import { ajouterJours, comparerDates, estDateValide } from '../../dates/civiles.js';

export class ErreurPrevision extends Error {
  override name = 'ErreurPrevision';
}

export type SoldeCompte = { readonly compteId: string; readonly solde: Centimes; readonly date: string };
export type FluxDate = {
  readonly id: string;
  readonly date: string;
  /** Signé : encaissement positif, décaissement négatif. */
  readonly montant: Centimes;
  readonly origine: string;
  readonly certitude: string;
  readonly rapproche: boolean;
};
export type EntreePrevision = {
  readonly soldes: readonly SoldeCompte[];
  readonly flux: readonly FluxDate[];
  readonly aujourdhui: string;
  readonly horizonJours: number;
  readonly scenario: 'central' | 'prudent';
  readonly seuilBas: Centimes;
  readonly ancienneteMaxJours: number;
};
export type PointPrevision = { date: string; solde: Centimes; fluxIds: string[] };
export type Prevision = {
  estimation: true;
  soldeDepart: Centimes;
  points: PointPrevision[];
  alerte: boolean;
  hypotheses: string[];
  avertissements: { compteId: string; dateSolde: string }[];
};

const entierPositif = (n: number): boolean => Number.isSafeInteger(n) && n >= 0;

function courbe(e: EntreePrevision, depart: Centimes, scenario: 'central' | 'prudent'): PointPrevision[] {
  const limite = ajouterJours(e.aujourdhui, e.horizonJours);
  const parJour = new Map<string, FluxDate[]>();
  for (const f of e.flux) {
    if (f.rapproche || (scenario === 'prudent' && f.origine === 'facture_client')) continue;
    const jour = comparerDates(f.date, e.aujourdhui) < 0 ? e.aujourdhui : f.date;
    if (comparerDates(jour, limite) > 0) continue;
    parJour.set(jour, [...(parJour.get(jour) ?? []), f]);
  }
  parJour.set(e.aujourdhui, parJour.get(e.aujourdhui) ?? []);
  parJour.set(limite, parJour.get(limite) ?? []);
  let solde = depart;
  return [...parJour.keys()]
    .sort(comparerDates)
    .map((date) => {
      const du = parJour.get(date) ?? [];
      for (const f of du) solde = ajouter(solde, f.montant);
      return { date, solde, fluxIds: du.map((f) => f.id).sort() };
    });
}

export function prevoirTresorerie(e: EntreePrevision): Prevision {
  if (!entierPositif(e.horizonJours) || !entierPositif(e.ancienneteMaxJours)) {
    throw new ErreurPrevision('parametre_invalide');
  }
  if (!Number.isSafeInteger(e.seuilBas) || !estDateValide(e.aujourdhui)) {
    throw new ErreurPrevision('parametre_invalide');
  }
  if (e.scenario !== 'central' && e.scenario !== 'prudent') throw new ErreurPrevision('parametre_invalide');
  for (const s of e.soldes) {
    if (!Number.isSafeInteger(s.solde) || !estDateValide(s.date)) throw new ErreurPrevision('solde_invalide');
  }
  for (const f of e.flux) {
    if (!Number.isSafeInteger(f.montant) || !estDateValide(f.date)) throw new ErreurPrevision('flux_invalide');
  }
  const depart = e.soldes.reduce((s, x) => ajouter(s, x.solde), centimes(0));
  const points = courbe(e, depart, e.scenario);
  const alerte = courbe(e, depart, 'prudent').some((p) => p.solde < e.seuilBas);
  const retenus = new Set(points.flatMap((p) => p.fluxIds));
  const actifs = e.flux.filter((f) => retenus.has(f.id));
  const hypotheses = ['elements_dates_seulement'];
  if (e.scenario === 'central' && actifs.some((f) => f.origine === 'facture_client')) {
    hypotheses.push('echeance_client_sans_retard');
  }
  if (actifs.some((f) => f.origine === 'echeance_fiscale')) hypotheses.push('tva_estimee');
  if (e.soldes.length === 0) hypotheses.push('aucun_solde');
  const avertissements = e.soldes
    .filter((s) => comparerDates(ajouterJours(s.date, e.ancienneteMaxJours), e.aujourdhui) < 0)
    .map((s) => ({ compteId: s.compteId, dateSolde: s.date }));
  return { estimation: true, soldeDepart: depart, points, alerte, hypotheses, avertissements };
}
