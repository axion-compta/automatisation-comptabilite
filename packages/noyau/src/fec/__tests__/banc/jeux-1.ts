// Jeux fictifs du banc FEC (société fictive, SIREN 123456782). Montants en centimes.
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
  libellesComptes: { '101000': 'Capital', '411000': 'Clients', '401000': 'Fournisseurs', '512000': 'Banque', '706000': 'Prestations', '607000': 'Achats', '445710': 'TVA collectee', '445660': 'TVA deductible' },
  libellesJournaux: { AN: 'A nouveaux', VE: 'Ventes', AC: 'Achats', BQ: 'Banque' },
  libellesTiers: { CLI001: 'Client Alpha fictif', FOU001: 'Fournisseur Beta fictif' },
};
const jeu = (ecritures: Ecriture[], datesValidation: Record<string, string>, extra: Partial<ContexteFec> = {}): JeuBanc => ({
  ecritures,
  contexte: { ...base, datesValidation, ...extra },
});

// Exercice 2025-04-01 au 2026-03-31 : 8 lignes valides, total 19 000,00, plus un brouillon de 50,00.
export const fecA: JeuBanc = jeu(
  [
    ecr('e-ve1', 'VE', '2025-05-10', 'VE-1', [d('411000', 'Facture Alpha', 1200000, 'CLI001'), k('706000', 'Prestation', 1000000), k('445710', 'TVA', 200000)]),
    ecr('e-brouillon', 'VE', '2025-05-11', 'VE-2', [d('411000', 'Brouillon', 5000, 'CLI001'), k('706000', 'Brouillon', 5000)], 'brouillon'),
    ecr('e-ac1', 'AC', '2025-05-20', 'AC-1', [d('607000', 'Achat fournitures', 160000), d('445660', 'TVA', 40000), k('401000', 'Facture Beta', 200000, 'FOU001')]),
    ecr('e-an1', 'AN', '2025-04-01', 'AN-1', [d('512000', 'Report banque', 500000), k('101000', 'Report capital', 500000)]),
  ],
  { 'e-an1': '2025-04-01', 'e-ve1': '2025-05-10', 'e-ac1': '2025-05-20' },
);

// Exercice 2025-07-01 au 2026-06-30 : l'écriture validée en premier passe avant, malgré son numéro.
export const decale: JeuBanc = jeu(
  [
    ecr('e-ve1', 'VE', '2026-06-30', 'VE-1', [d('411000', 'Facture Alpha', 12000, 'CLI001'), k('706000', 'Prestation', 12000)]),
    ecr('e-ac1', 'AC', '2025-07-15', 'AC-9', [d('607000', 'Achat', 3000), k('401000', 'Facture Beta', 3000, 'FOU001')]),
    ecr('e-an1', 'AN', '2025-07-01', 'AN-1', [d('512000', 'Report banque', 100000), k('101000', 'Report capital', 100000)]),
  ],
  { 'e-an1': '2025-07-01', 'e-ac1': '2025-07-15', 'e-ve1': '2026-06-30' },
);

// Écriture erronée, sa contre-passation (lien vers l'originale) et l'écriture corrigée : les trois sont dans le FEC.
export const contrePassation: JeuBanc = {
  ...jeu(
    [
      { ...ecr('e-ve1', 'VE', '2026-01-10', 'VE-1', [d('411000', 'Facture Alpha', 10000, 'CLI001'), k('706000', 'Prestation', 10000)]), contrePassee: true },
      { ...ecr('e-ve2', 'VE', '2026-01-12', 'VE-2', [k('411000', 'Contre-passation VE-1', 10000, 'CLI001'), d('706000', 'Contre-passation VE-1', 10000)]), type: 'correction', lienOriginale: 'e-ve1' },
      ecr('e-ve3', 'VE', '2026-01-12', 'VE-3', [d('411000', 'Facture Alpha corrigee', 8000, 'CLI001'), k('706000', 'Prestation', 8000)]),
    ],
    { 'e-ve1': '2026-01-10', 'e-ve2': '2026-01-12', 'e-ve3': '2026-01-12' },
  ),
};

// Facture de 1 200,00 lettrée sur un paiement de 1 000,00 : le code AA est posé sur les deux lignes du compte client.
export const lettragePartiel: JeuBanc = jeu(
  [
    ecr('e-ve1', 'VE', '2026-01-10', 'VE-1', [d('411000', 'Facture Alpha', 120000, 'CLI001'), k('706000', 'Prestation', 120000)]),
    ecr('e-bq1', 'BQ', '2026-02-10', 'BQ-1', [d('512000', 'Reglement Alpha', 100000), k('411000', 'Reglement Alpha', 100000, 'CLI001')]),
  ],
  { 'e-ve1': '2026-01-10', 'e-bq1': '2026-02-10' },
  { lettrages: { 'e-ve1#0': { code: 'AA', date: '2026-02-10' }, 'e-bq1#1': { code: 'AA', date: '2026-02-10' } } },
);
