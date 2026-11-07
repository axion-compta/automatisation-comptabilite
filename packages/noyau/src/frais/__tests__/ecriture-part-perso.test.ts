import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../argent/index.js';
import { verifierEcriture } from '../../ecritures/modele.js';
import { proposerEcriturePartPerso } from '../ecriture-part-perso.js';
import { ErreurFrais, type ComptesFrais } from '../types.js';

const c = centimes;
const brut = (n: number) => n as Centimes;
const comptes: ComptesFrais & { compteCharge: string } = {
  chargeParNature: {}, chargeIk: 'C-IK', tvaDeductible: 'C-TVA', comptePersonne: 'C-PERS', banque: 'C-BQ', compteCharge: 'C-CHG',
};
const entete = (solde = 0) => ({ id: 'e5', journal: 'OD', date: '2026-03-15', soldePersonneAvant: c(solde) });
const piece = (ttc: number, tva: number, perso: number) => ({ ttc: c(ttc), tva: c(tva), partPersoTtc: c(perso) });
const lignes = (p: ReturnType<typeof piece>, solde = 0) =>
  proposerEcriturePartPerso(p, comptes, entete(solde)).ecriture.lignes.map((l) => [l.compte, l.debit, l.credit]);
const refus = (fn: () => unknown) => {
  try { fn(); } catch (e) { return e instanceof ErreurFrais ? e.code : 'autre'; }
  return 'aucune';
};

describe('proposerEcriturePartPerso (E5)', () => {
  it('nf15-moitie-personnelle', () => {
    const r = proposerEcriturePartPerso(piece(11000, 1000, 5500), comptes, entete());
    expect(r.ecriture.statut).toBe('propose');
    expect(r.ecriture.lignes.map((l) => [l.compte, l.debit, l.credit])).toEqual([
      ['C-CHG', 5000, 0], ['C-TVA', 500, 0], ['C-PERS', 5500, 0], ['C-BQ', 0, 11000],
    ]);
    expect(verifierEcriture(r.ecriture).equilibree).toBe(true);
  });

  it('sans-part-perso-pas-de-ligne-personne', () => {
    expect(lignes(piece(11000, 1000, 0))).toEqual([['C-CHG', 10000, 0], ['C-TVA', 1000, 0], ['C-BQ', 0, 11000]]);
    expect(lignes(piece(11000, 0, 0))).toEqual([['C-CHG', 11000, 0], ['C-BQ', 0, 11000]]);
  });

  it('tout-personnel-sans-charge', () => {
    expect(lignes(piece(11000, 1000, 11000))).toEqual([['C-PERS', 11000, 0], ['C-BQ', 0, 11000]]);
  });

  it('jamais-de-credit-personne', () => {
    let graine = 4242;
    const suivant = (max: number) => {
      graine = (graine * 1103515245 + 12345) % 2147483648;
      return graine % (max + 1);
    };
    for (let i = 0; i < 500; i++) {
      const ttc = suivant(500000) + 1;
      const r = proposerEcriturePartPerso(piece(ttc, suivant(ttc), suivant(ttc)), comptes, entete(suivant(100000)));
      expect(verifierEcriture(r.ecriture).equilibree).toBe(true);
      expect(r.ecriture.lignes.filter((l) => l.compte === 'C-PERS' && l.credit !== 0)).toEqual([]);
      expect(r.ecriture.lignes.every((l) => l.debit !== 0 || l.credit !== 0)).toBe(true);
    }
  });

  it('compte-debiteur-signale', () => {
    expect(proposerEcriturePartPerso(piece(11000, 1000, 5500), comptes, entete(5499)).compteDebiteur).toBe(true);
    expect(proposerEcriturePartPerso(piece(11000, 1000, 5500), comptes, entete(-100)).compteDebiteur).toBe(true);
  });

  it('compte-crediteur-non-signale', () => {
    expect(proposerEcriturePartPerso(piece(11000, 1000, 5500), comptes, entete(5500)).compteDebiteur).toBe(false);
    expect(proposerEcriturePartPerso(piece(11000, 1000, 5500), comptes, entete(9000)).compteDebiteur).toBe(false);
    expect(proposerEcriturePartPerso(piece(11000, 1000, 0), comptes, entete(0)).compteDebiteur).toBe(false);
  });

  it('entrees-invalides', () => {
    const e = () => entete();
    const cas = [
      { ...piece(11000, 1000, 5500), ttc: brut(Number.NaN) },
      { ...piece(11000, 1000, 5500), ttc: brut(Number.POSITIVE_INFINITY) },
      { ...piece(11000, 1000, 5500), tva: brut(10.5) },
      piece(11000, 1000, 11001),
      piece(11000, 11001, 0),
      piece(-100, 0, 0),
      piece(11000, -1, 0),
      piece(0, 0, 0),
    ];
    for (const p of cas) expect(refus(() => proposerEcriturePartPerso(p, comptes, e()))).toBe('entree_invalide');
    for (const s of [Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      expect(refus(() => proposerEcriturePartPerso(piece(11000, 1000, 0), comptes, { ...e(), soldePersonneAvant: brut(s) }))).toBe('entree_invalide');
    }
  });
});
