// Jeux fictifs du banc FEC 3 (société fictive, SIREN 123456782) : plusieurs journaux, à-nouveaux par tiers, changement de logiciel.
import { type Centimes, centimes } from '../../../argent/index.js';
import type { Ecriture, LigneEcriture } from '../../../ecritures/modele.js';
import type { ContexteFec } from '../../lignes.js';
import type { JeuBanc } from './outils.js';

const c = (n: number): Centimes => centimes(n);
const d = (compte: string, libelle: string, montant: number, auxiliaire?: string): LigneEcriture =>
  ({ compte, ...(auxiliaire === undefined ? {} : { auxiliaire }), libelle, debit: c(montant), credit: c(0) });
const k = (compte: string, libelle: string, montant: number, auxiliaire?: string): LigneEcriture =>
  ({ compte, ...(auxiliaire === undefined ? {} : { auxiliaire }), libelle, debit: c(0), credit: c(montant) });
const ecr = (journal: string, date: string, numero: string, lignes: LigneEcriture[]): Ecriture =>
  ({ id: `e-${numero.toLowerCase()}`, journal, date, numero, statut: 'valide', lignes });

const base: Omit<ContexteFec, 'datesValidation'> = {
  journalANouveaux: 'AN',
  libellesComptes: { '101000': 'Capital', '411000': 'Clients', '401000': 'Fournisseurs', '512000': 'Banque', '706000': 'Prestations', '607000': 'Achats' },
  libellesJournaux: { AN: 'A nouveaux', VE: 'Ventes', AC: 'Achats', BQ1: 'Banque principale', OD: 'Operations diverses' },
  libellesTiers: { CLI001: 'Client Alpha fictif', CLI002: 'Client Gamma fictif', CLI003: 'Client Delta fictif', FOU001: 'Fournisseur Beta fictif' },
};
// La date de validation est celle de l'écriture.
const jeu = (ecritures: Ecriture[]): JeuBanc => ({
  ecritures,
  contexte: { ...base, datesValidation: Object.fromEntries(ecritures.map((e) => [e.id, e.date])) },
});

// Cinq journaux : AN d'abord, puis tri par date.
export const plusieursJournaux: JeuBanc = jeu([
  ecr('OD', '2026-01-31', 'OD-1', [d('607000', 'Regularisation', 500), k('401000', 'Regularisation', 500, 'FOU001')]),
  ecr('BQ1', '2026-01-20', 'BQ1-1', [d('512000', 'Reglement Alpha', 12000), k('411000', 'Reglement Alpha', 12000, 'CLI001')]),
  ecr('AC', '2026-01-12', 'AC-1', [d('607000', 'Achat fournitures', 3000), k('401000', 'Facture Beta', 3000, 'FOU001')]),
  ecr('VE', '2026-01-10', 'VE-1', [d('411000', 'Facture Alpha', 12000, 'CLI001'), k('706000', 'Prestation', 12000)]),
  ecr('AN', '2026-01-01', 'AN-1', [d('512000', 'Report banque', 100000), k('101000', 'Report capital', 100000)]),
]);

// À-nouveaux du compte 411000 détaillés sur trois clients.
export const aNouveauxParTiers: JeuBanc = jeu([
  ecr('BQ1', '2026-02-05', 'BQ1-1', [d('512000', 'Reglement Gamma', 12000), k('411000', 'Reglement Gamma', 12000, 'CLI002')]),
  ecr('AN', '2026-01-01', 'AN-1', [
    d('411000', 'Report Alpha', 30000, 'CLI001'), d('411000', 'Report Gamma', 20000, 'CLI002'),
    d('411000', 'Report Delta', 10000, 'CLI003'), k('101000', 'Report capital', 60000),
  ]),
]);

// Changement de logiciel au 1er mars : soldes repris en à-nouveaux à cette date, puis écritures du mois.
export const changementDeLogiciel: JeuBanc = jeu([
  ecr('BQ1', '2026-03-15', 'BQ1-1', [d('512000', 'Reglement Alpha', 20000), k('411000', 'Reglement Alpha', 20000, 'CLI001')]),
  ecr('VE', '2026-03-10', 'VE-1', [d('411000', 'Facture Alpha', 8000, 'CLI001'), k('706000', 'Prestation', 8000)]),
  ecr('AN', '2026-03-01', 'AN-1', [
    d('411000', 'Reprise Alpha', 40000, 'CLI001'), d('512000', 'Reprise banque', 25000),
    k('401000', 'Reprise Beta', 15000, 'FOU001'), k('101000', 'Reprise capital', 50000),
  ]),
]);
