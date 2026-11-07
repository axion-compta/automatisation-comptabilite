// Jeux fictifs du banc FEC 2 (société fictive, SIREN 123456782). Montants en centimes.
import { type Centimes, centimes } from '../../../argent/index.js';
import type { Ecriture, LigneEcriture, StatutEcriture } from '../../../ecritures/modele.js';
import type { ContexteFec } from '../../lignes.js';
import type { JeuBanc } from './outils.js';

const c = (n: number): Centimes => centimes(n);
const zero = c(0);
const d = (compte: string, libelle: string, montant: number, auxiliaire?: string): LigneEcriture =>
  auxiliaire === undefined ? { compte, libelle, debit: c(montant), credit: zero } : { compte, auxiliaire, libelle, debit: c(montant), credit: zero };
const k = (compte: string, libelle: string, montant: number, auxiliaire?: string): LigneEcriture =>
  auxiliaire === undefined ? { compte, libelle, debit: zero, credit: c(montant) } : { compte, auxiliaire, libelle, debit: zero, credit: c(montant) };
const ecr = (id: string, journal: string, date: string, numero: string, lignes: LigneEcriture[], statut: StatutEcriture = 'valide'): Ecriture => ({
  id,
  journal,
  date,
  numero,
  statut,
  lignes,
});

const base: Omit<ContexteFec, 'datesValidation'> = {
  journalANouveaux: 'AN',
  libellesComptes: { '411000': 'Clients', '401000': 'Fournisseurs', '512000': 'Banque', '706000': 'Prestations', '607000': 'Achats' },
  libellesJournaux: { AN: 'A nouveaux', VE: 'Ventes', AC: 'Achats', BQ: 'Banque' },
  libellesTiers: { CLI001: 'Client Alpha fictif', FOU001: 'Fournisseur Beta fictif' },
};
const jeu = (ecritures: Ecriture[], datesValidation: Record<string, string>): JeuBanc => ({ ecritures, contexte: { ...base, datesValidation } });
const vente = (id: string, date: string, montant: number): Ecriture =>
  ecr(id, 'VE', date, `VE-${id.slice(-1)}`, [d('411000', 'Facture Alpha', montant, 'CLI001'), k('706000', 'Prestation', montant)]);
const reglement = (id: string, date: string, montant: number): Ecriture =>
  ecr(id, 'BQ', date, `BQ-${id.slice(-1)}`, [d('512000', 'Reglement Alpha', montant), k('411000', 'Reglement Alpha', montant, 'CLI001')]);

// Premier exercice de 6 mois (2025-10-01 au 2026-03-31) : pas de journal d'à-nouveaux.
export const sixMois: JeuBanc = jeu(
  [vente('e-ve1', '2025-10-15', 100000), reglement('e-bq1', '2026-03-20', 60000)],
  { 'e-ve1': '2025-10-15', 'e-bq1': '2026-03-20' },
);

// Premier exercice de 18 mois (2025-01-01 au 2026-06-30).
export const dixHuitMois: JeuBanc = jeu(
  [vente('e-ve1', '2025-02-10', 24000), ecr('e-ac1', 'AC', '2026-05-05', 'AC-1', [d('607000', 'Achat fournitures', 5000), k('401000', 'Facture Beta', 5000, 'FOU001')])],
  { 'e-ve1': '2025-02-10', 'e-ac1': '2026-05-05' },
);

// Premier exercice de 24 mois (2024-07-01 au 2026-06-30).
export const vingtQuatreMois: JeuBanc = jeu(
  [vente('e-ve1', '2024-09-10', 36000), reglement('e-bq1', '2026-06-15', 36000)],
  { 'e-ve1': '2024-09-10', 'e-bq1': '2026-06-15' },
);

// Société sans mouvement : aucune écriture validée.
export const sansMouvement: JeuBanc = jeu([], {});

// 3 écritures validées et 4 brouillons : seules les validées sortent.
export const brouillonsPresents: JeuBanc = jeu(
  [
    vente('e-ve1', '2026-01-10', 12000),
    ecr('e-br1', 'VE', '2026-01-11', 'VE-2', [d('411000', 'Brouillon un', 1000, 'CLI001'), k('706000', 'Brouillon un', 1000)], 'brouillon'),
    reglement('e-bq1', '2026-02-10', 5000),
    ecr('e-br2', 'AC', '2026-02-11', 'AC-2', [d('607000', 'Brouillon deux', 2000), k('401000', 'Brouillon deux', 2000, 'FOU001')], 'brouillon'),
    ecr('e-ac1', 'AC', '2026-02-12', 'AC-1', [d('607000', 'Achat fournitures', 3000), k('401000', 'Facture Beta', 3000, 'FOU001')]),
    ecr('e-br3', 'BQ', '2026-02-13', 'BQ-3', [d('512000', 'Brouillon trois', 400), k('411000', 'Brouillon trois', 400, 'CLI001')], 'brouillon'),
    ecr('e-br4', 'VE', '2026-02-14', 'VE-4', [d('411000', 'Brouillon quatre', 700, 'CLI001'), k('706000', 'Brouillon quatre', 700)], 'brouillon'),
  ],
  { 'e-ve1': '2026-01-10', 'e-bq1': '2026-02-10', 'e-ac1': '2026-02-12' },
);
