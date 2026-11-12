import { genererVuesBanque } from '../../../donnees-fictives/src/banque-vues.js';
import type { VuesBanque } from '../../../donnees-fictives/src/banque-vues.js';
import type { z } from 'zod';
import type { AlerteIban, EcheanceFournisseur, Flux, Prevision } from './tresorerie.js';

type Scenario = 'central' | 'prudent';
const SEUIL_BAS_CENTIMES = 500000;
const ORIGINE_CLIENTS = 'clients';
const MS_PAR_JOUR = 86400000;
const HYPOTHESES = ['Estimation : somme simple des flux du jeu d’exemple, sans règle métier.', 'Les montants à venir sont supposés encaissés ou réglés à leur date.'];
const HYPOTHESE_PRUDENTE = 'Scénario prudent : les encaissements clients ne sont pas comptés.';

const ajouterJours = (date: string, jours: number): string => new Date(Date.parse(date) + jours * MS_PAR_JOUR).toISOString().slice(0, 10);
const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Service en mémoire, lecture seule, bâti sur les vues fictives de la banque. */
export function creerServiceTresorerie(vues: VuesBanque = genererVuesBanque()) {
  const depart = vues.soldesDepart[0];
  const dateVue = depart?.date ?? '1970-01-01';
  const flux: z.infer<typeof Flux>[] = vues.flux
    .map((f) => ({ id: f.id, date: f.date, montantCentimes: f.montant, origine: f.origine, certitude: f.certitude, libelleCode: f.libelleCode }))
    .sort((a, b) => cmp(a.date, b.date) || cmp(a.id, b.id));
  const dettes = vues.dettes.map((d): z.infer<typeof EcheanceFournisseur> => ({
    pieceId: d.pieceId, fournisseurNom: d.fournisseurNom, echeance: d.echeance, resteCentimes: d.reste, ibanMasque: d.ibanMasque, ibanChange: d.ibanChange,
  }));

  return {
    prevision(horizon: number, scenario: Scenario): { body: z.infer<typeof Prevision> } {
      const fin = ajouterJours(dateVue, horizon);
      const retenus = flux.filter((f) => f.date >= dateVue && f.date <= fin && (scenario === 'central' || f.origine !== ORIGINE_CLIENTS));
      const dates = [...new Set(retenus.map((f) => f.date))];
      let solde = depart?.solde ?? 0;
      const points = dates.map((date) => {
        const du = retenus.filter((f) => f.date === date);
        solde += du.reduce((t, f) => t + f.montantCentimes, 0);
        return { date, soldeCentimes: solde, fluxIds: du.map((f) => f.id) };
      });
      return {
        body: {
          estimation: true,
          soldeDepartCentimes: depart?.solde ?? 0,
          points,
          seuilBasCentimes: SEUIL_BAS_CENTIMES,
          alerte: points.some((p) => p.soldeCentimes < SEUIL_BAS_CENTIMES),
          hypotheses: scenario === 'prudent' ? [...HYPOTHESES, HYPOTHESE_PRUDENTE] : HYPOTHESES,
        },
      };
    },
    /** `du` après `au` : liste vide. */
    flux(q: { du?: string | undefined; au?: string | undefined; origine?: string | undefined } = {}) {
      return { body: flux.filter((f) => (q.du === undefined || f.date >= q.du) && (q.au === undefined || f.date <= q.au) && (q.origine === undefined || f.origine === q.origine)) };
    },
    /** Dettes à régler, hors celles dont l'IBAN a changé (elles sont dans les alertes). */
    echeances(horizon?: number) {
      const fin = horizon === undefined ? undefined : ajouterJours(dateVue, horizon);
      return { body: dettes.filter((d) => !d.ibanChange && (fin === undefined || d.echeance <= fin)).sort((a, b) => cmp(a.echeance, b.echeance) || cmp(a.pieceId, b.pieceId)) };
    },
    alertesIban() {
      return {
        body: dettes
          .filter((d) => d.ibanChange)
          .map((d): z.infer<typeof AlerteIban> => ({ pieceId: d.pieceId, fournisseurNom: d.fournisseurNom, echeance: d.echeance, resteCentimes: d.resteCentimes, ibanMasque: d.ibanMasque })),
      };
    },
  };
}
