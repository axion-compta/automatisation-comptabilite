import { describe, expect, it } from 'vitest';
import { centimes } from '../../../argent/index.js';
import type { Ecriture, LigneEcriture, StatutEcriture } from '../../../ecritures/modele.js';
import { executerControles } from '../../moteur.js';
import { regleCCK01, regleCCK02, regleCCK03, reglesEquilibre } from '../equilibre.js';

function ligne(compte: string, debit: number, credit: number): LigneEcriture {
  return { compte, libelle: 'Libellé fictif', debit: centimes(debit), credit: centimes(credit) };
}
function ecr(id: string, statut: StatutEcriture, lignes: LigneEcriture[]): Ecriture {
  return { id, journal: 'AC', date: '2026-01-10', statut, lignes };
}
const equilibree = (id: string, statut: StatutEcriture = 'valide'): Ecriture =>
  ecr(id, statut, [ligne('607', 10000, 0), ligne('401', 0, 10000)]);

describe('controles d equilibre', () => {
  it('CT-01 ecriture equilibree : OK', () => {
    expect(regleCCK01.evaluer(equilibree('a'))).toEqual({ resultat: 'OK' });
  });

  it('CT-01 ecart d un centime en debit ou en credit : ALERTE avec ecart signe', () => {
    const plusDebit = ecr('b', 'valide', [ligne('607', 10001, 0), ligne('401', 0, 10000)]);
    const plusCredit = ecr('c', 'valide', [ligne('607', 10000, 0), ligne('401', 0, 10001)]);
    expect(regleCCK01.evaluer(plusDebit)).toEqual({ resultat: 'ALERTE', ecartCentimes: 1 });
    expect(regleCCK01.evaluer(plusCredit)).toEqual({ resultat: 'ALERTE', ecartCentimes: -1 });
  });

  it('CT-02 balance equilibree : OK, brouillons ignores', () => {
    const desequilibre = ecr('d', 'brouillon', [ligne('607', 5, 0)]);
    expect(regleCCK02.evaluer([equilibree('a'), desequilibre])).toEqual({ resultat: 'OK' });
    expect(regleCCK02.evaluer([])).toEqual({ resultat: 'OK' });
  });

  it('CT-02 ecart d un centime sur les ecritures validees : ALERTE', () => {
    const faux = ecr('e', 'valide', [ligne('607', 10001, 0), ligne('401', 0, 10000)]);
    expect(regleCCK02.evaluer([equilibree('a'), faux])).toEqual({ resultat: 'ALERTE', ecartCentimes: 1 });
  });

  it('CT-03 solde d ouverture + mouvements = cloture : OK', () => {
    const objet = {
      compte: '512',
      soldeOuverture: centimes(1000),
      soldeCloture: centimes(1500),
      mouvements: [
        { debit: centimes(800), credit: centimes(0) },
        { debit: centimes(0), credit: centimes(300) },
      ],
    };
    expect(regleCCK03.evaluer(objet)).toEqual({ resultat: 'OK' });
    expect(regleCCK03.evaluer({ ...objet, mouvements: [], soldeCloture: centimes(1000) })).toEqual({
      resultat: 'OK',
    });
  });

  it('CT-03 ecart d un centime : ALERTE avec ecart signe', () => {
    const base = {
      compte: '512',
      soldeOuverture: centimes(1000),
      mouvements: [{ debit: centimes(0), credit: centimes(300) }],
    };
    expect(regleCCK03.evaluer({ ...base, soldeCloture: centimes(699) })).toEqual({
      resultat: 'ALERTE',
      ecartCentimes: 1,
    });
    expect(regleCCK03.evaluer({ ...base, soldeCloture: centimes(701) })).toEqual({
      resultat: 'ALERTE',
      ecartCentimes: -1,
    });
  });

  it('exigence-et-version-renseignees', () => {
    expect(Object.keys(reglesEquilibre)).toEqual(['CC-K01', 'CC-K02', 'CC-K03']);
    for (const [id, r] of Object.entries(reglesEquilibre)) {
      expect(r.id).toBe(id);
      expect(r.version).toBe(1);
      expect(r.gravite).toBe('B');
      expect(r.actif).toBe(true);
    }
    expect(regleCCK01.bloque).toEqual(['validation', 'tva', 'export', 'cloture']);
    expect(regleCCK02.bloque).toEqual(['validation', 'tva', 'export', 'cloture']);
    expect(regleCCK03.bloque).toEqual(['export', 'cloture']);
    expect(regleCCK01.declencheurs).toEqual(['continu', 'avant_tva', 'avant_export', 'avant_cloture']);
    expect(regleCCK02.declencheurs).toEqual(['continu', 'avant_tva', 'avant_export', 'avant_cloture']);
    expect(regleCCK03.declencheurs).toEqual(['avant_export', 'avant_cloture']);
  });

  it('CT-01 le moteur trace l ecart et ne compte pas OK une ecriture en ecart', () => {
    const faux = ecr('f', 'valide', [ligne('607', 10001, 0), ligne('401', 0, 10000)]);
    const traces = executerControles(
      [regleCCK01],
      [
        { type: 'ecriture', id: 'a', donnee: equilibree('a') },
        { type: 'ecriture', id: 'f', donnee: faux },
      ],
      'avant_cloture',
      '2026-01-15T10:00:00Z',
    );
    expect(traces.map((t) => t.resultat)).toEqual(['OK', 'ALERTE']);
    expect(traces[1]?.ecartCentimes).toBe(1);
    expect(traces[0]?.ecartCentimes).toBeUndefined();
  });
});
