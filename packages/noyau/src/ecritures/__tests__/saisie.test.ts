import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { creerProposition } from '../../chat/proposition.js';
import { ErreurEcriture, verifierEcriture, type Ecriture } from '../modele.js';
import { saisieRapide, ErreurSaisie, type EntreeSaisie, type PlanSaisie, type TauxTva } from '../saisie.js';

const c = centimes;
const plan: PlanSaisie = {
  journal: 'AC',
  contrepartie: '401',
  comptes: ['606', '622', '626', '401', '512'],
  historique: [
    { libelle: 'Papeterie du Centre', compte: '606' },
    { libelle: 'papeterie  du centre ', compte: '606' },
    { libelle: 'Honoraires Dupont Fictif', compte: '622' },
    { libelle: 'Mercerie Martin', compte: '606' },
    { libelle: 'Mercerie Martin', compte: '626' },
  ],
};
const taux: TauxTva = [
  { pointsDeBase: 2000, compteTva: '44566' },
  { pointsDeBase: 1000, compteTva: '44566' },
  { pointsDeBase: 0, compteTva: '44566' },
];
const entree = (extra: Partial<EntreeSaisie> = {}): EntreeSaisie => ({
  id: 'saisie-1', date: '2027-03-10', libelle: 'Papeterie du Centre', montantTtc: c(12000), compte: '606', tauxTvaPdb: 2000, ...extra,
});
const code = (fn: () => unknown): string => {
  try { fn(); } catch (e) { if (e instanceof ErreurSaisie || e instanceof ErreurEcriture) return e.code; throw e; }
  return 'aucune';
};

describe('saisie manuelle rapide', () => {
  it('saisie-simple-equilibree', () => {
    const r = saisieRapide(entree(), plan, taux);
    expect(r.ecriture.statut).toBe('brouillon');
    expect(r.ecriture.lignes.map((l) => [l.compte, l.debit, l.credit])).toEqual([
      ['606', 10000, 0],
      ['44566', 2000, 0],
      ['401', 0, 12000],
    ]);
    expect(verifierEcriture(r.ecriture).equilibree).toBe(true);
    // TVA à 0 % : pas de ligne de TVA ; arrondi au centime (10,00 TTC à 20 % : TVA 1,67).
    expect(saisieRapide(entree({ tauxTvaPdb: 0 }), plan, taux).ecriture.lignes).toHaveLength(2);
    const arrondi = saisieRapide(entree({ montantTtc: c(1000) }), plan, taux).ecriture.lignes;
    expect(arrondi.map((l) => l.debit + l.credit)).toEqual([833, 167, 1000]);
    // 11,00 TTC à 20 % : HT 9,1666 arrondi à 9,17 (et non 9,16).
    expect(saisieRapide(entree({ montantTtc: c(1100) }), plan, taux).ecriture.lignes.map((l) => l.debit + l.credit)).toEqual([917, 183, 1100]);
    expect(code(() => saisieRapide(entree({ montantHt: c(-1) }), plan, taux))).toBe('montant_invalide');
    for (const m of [0, -100, Number.NaN, 1.5]) expect(code(() => saisieRapide(entree({ montantTtc: m as never }), plan, taux))).toBe('montant_invalide');
    for (const m of [Number.NaN, 1.5]) expect(code(() => saisieRapide(entree({ montantHt: m as never }), plan, taux))).toBe('montant_invalide');
    expect(code(() => saisieRapide(entree({ date: '2027-02-30' }), plan, taux))).toBe('date_invalide');
    expect(code(() => saisieRapide(entree({ libelle: '  ' }), plan, taux))).toBe('libelle_vide');
    expect(code(() => saisieRapide(entree({ compte: '999' }), plan, taux))).toBe('compte_inconnu');
    expect(code(() => saisieRapide(entree({ tauxTvaPdb: 550 }), plan, taux))).toBe('taux_inconnu');
  });

  it('proposition-compte-depuis-libelle', () => {
    const sansCompte = entree({ compte: undefined });
    const r = saisieRapide(sansCompte, plan, taux);
    expect(r.propositions.compte).toBe('606');
    expect(r.ecriture.lignes[0]?.compte).toBe('606');
    expect(saisieRapide(entree({ libelle: 'HONORAIRES dupont fictif', compte: '626' }), plan, taux).propositions.compte).toBe('622');
    // Un accent de différence ne change pas la clé de recherche.
    expect(saisieRapide(entree({ libelle: 'Papèterie du Centre', compte: undefined }), plan, taux).propositions.compte).toBe('606');
    // Libellé inconnu ou à égalité : aucune proposition, donc refus sans compte saisi.
    expect(code(() => saisieRapide(entree({ libelle: 'Inconnu Fictif', compte: undefined }), plan, taux))).toBe('compte_manquant');
    expect(code(() => saisieRapide(entree({ libelle: 'Mercerie Martin', compte: undefined }), plan, taux))).toBe('compte_manquant');
    expect(saisieRapide(entree({ libelle: 'Mercerie Martin' }), plan, taux).propositions.compte).toBeUndefined();
  });

  it('proposition-tva-depuis-taux', () => {
    const r = saisieRapide(entree(), plan, taux);
    expect(r.propositions.tva).toEqual({ pointsDeBase: 2000, compteTva: '44566', montant: 2000 });
    expect(saisieRapide(entree({ tauxTvaPdb: 1000 }), plan, taux).propositions.tva).toEqual({ pointsDeBase: 1000, compteTva: '44566', montant: 1091 });
    expect(saisieRapide(entree({ tauxTvaPdb: 0 }), plan, taux).propositions.tva).toEqual({ pointsDeBase: 0, compteTva: '44566', montant: 0 });
  });

  it('equivalence-avec-le-chat', () => {
    const attendue: Ecriture = {
      id: 'saisie-1', journal: 'AC', date: '2027-03-10', statut: 'brouillon',
      lignes: [
        { compte: '606', libelle: 'Papeterie du Centre', debit: c(10000), credit: c(0) },
        { compte: '44566', libelle: 'Papeterie du Centre', debit: c(2000), credit: c(0) },
        { compte: '401', libelle: 'Papeterie du Centre', debit: c(0), credit: c(12000) },
      ],
    };
    const chat = creerProposition({ id: 'p-1', outil: 'ecritures.proposer', niveau: 'M', cibles: ['saisie-1'], avant: null, apres: attendue, creeLe: '2027-03-10T09:00:00.000Z', dureeMs: 60000 });
    expect(saisieRapide(entree(), plan, taux).ecriture).toEqual(chat.apres);
    // Une saisie sans compte, résolue par l'historique, donne la même écriture.
    expect(saisieRapide(entree({ compte: undefined }), plan, taux).ecriture).toEqual(chat.apres);
  });

  it('saisie-desequilibree-refusee', () => {
    // HT et TTC saisis ensemble : la TVA recalculée sur le HT doit retomber sur le TTC.
    expect(code(() => saisieRapide(entree({ montantHt: c(9000) }), plan, taux))).toBe('desequilibre');
    expect(code(() => saisieRapide(entree({ montantHt: c(10001) }), plan, taux))).toBe('desequilibre');
    expect(saisieRapide(entree({ montantHt: c(10000) }), plan, taux).ecriture.lignes[0]?.debit).toBe(10000);
    // Frontière de l'arrondi : TVA 166,6 arrondie à 167, donc HT 833 + TVA 167 = TTC 1000 accepté.
    expect(saisieRapide(entree({ montantTtc: c(1000), montantHt: c(833) }), plan, taux).ecriture.lignes.map((l) => l.debit + l.credit)).toEqual([833, 167, 1000]);
    expect(code(() => saisieRapide(entree({ montantHt: c(0) }), plan, taux))).toBe('desequilibre');
  });
});
