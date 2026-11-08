import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../../argent/index.js';
import type { EtatRapprochement, Lien, LigneBancaire } from '../../types.js';
import { ErreurExplication, expliquer } from '../explication.js';

const ligne = (etat: EtatRapprochement, id = 'L1'): LigneBancaire => ({
  id, societeId: 's1', compteId: 'c1', releveId: 'r1', rang: 1, dateOperation: '2026-03-10', montant: -1000 as Centimes, devise: 'EUR',
  libelleBrut: 'VIR', moyen: 'virement', etatTechnique: 'completee', etatRapprochement: etat,
});
const lien = (facteurs: Lien['facteurs'], ligneId = 'L1'): Lien => ({
  id: 'K1', groupeId: 'G1', ligneId, pieceId: 'P1', montantAffecte: 1000 as Centimes, score: 100, facteurs, passe: 5,
  codeRaison: 'ok', proposePar: 'regle', etat: 'propose', version: 1,
});
const CINQ = [['montant', 45], ['contrepartie', 25], ['reference', 20], ['date', 7], ['sens_et_moyen', 3]] as const;
const facteurs = CINQ.map(([nom, points]) => ({ nom, points, code: `f_${nom}` }));
const erreur = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurExplication ? e.code : 'autre';
  }
  return undefined;
};

describe('explication', () => {
  it('t05-1-cinq-facteurs', () => {
    const valeurs = { montant: { ecartCentimes: 0 }, date: { jours: 2 }, reference: { lue: 'F-12' }, contrepartie: { alias: 'Atelier Fictif' } };
    const r = expliquer(ligne('RAPPROCHEE'), lien(facteurs), [], 3, valeurs);
    expect(r.codeMot).toBe('rattache');
    expect(r.facteurs.map((f) => f.points)).toEqual([45, 25, 20, 7, 3]);
    expect(r.facteurs.map((f) => f.code)).toEqual(CINQ.map(([n]) => `f_${n}`));
    expect(r.facteurs[0]?.valeurs).toEqual({ ecartCentimes: 0 });
    expect(r.facteurs[3]?.valeurs).toEqual({ jours: 2 });
    expect(r.facteurs[4]?.valeurs).toEqual({});
    expect(r).toMatchObject({ score: 100, etat: 'RAPPROCHEE', passe: 5, proposePar: 'regle' });
  });

  it('douteuse-deux-candidats', () => {
    const r = expliquer(ligne('DOUTEUSE'), lien(facteurs.slice(0, 2)), [{ pieceId: 'P1', score: 70 }, { pieceId: 'P2', score: 68 }, { pieceId: 'P3', score: 40 }], 1);
    expect(r.codeMot).toBe('hesite');
    expect(r.autresCandidats).toEqual([{ pieceId: 'P2', score: 68 }]);
  });

  it('sans-lien-code-de-l-etat', () => {
    const attendus: [EtatRapprochement, string][] = [
      ['RAPPROCHEE', 'rattache'], ['PROPOSEE', 'propose'], ['DOUTEUSE', 'hesite'], ['SANS_PIECE', 'sans_piece'], ['SANS_PIECE_REQUISE', 'sans_piece'],
      ['A_QUALIFIER', 'a_qualifier'], ['NEUTRALISEE', 'neutralisee'], ['PERSO', 'neutralisee'], ['IGNOREE', 'ignoree'],
    ];
    for (const [etat, code] of attendus) {
      const r = expliquer(ligne(etat), undefined, [], 0);
      expect(r.codeMot).toBe(code);
      expect(r.etat).toBe(etat);
      expect(r.facteurs).toEqual([]);
      expect(r.score).toBeUndefined();
      expect(r.passe).toBeUndefined();
      expect(r.proposePar).toBeUndefined();
    }
  });

  it('aucun-iban-dans-les-valeurs', () => {
    const iban = ['FR76', '3000', '6000', '0112', '3456', '7890', '189'];
    const valeurs = { montant: { brut: iban.join(''), espace: iban.join(' '), minuscule: iban.join('').toLowerCase(), libelle: 'Atelier Fictif', n: 5 } };
    const r = expliquer(ligne('PROPOSEE'), lien(facteurs.slice(0, 1)), [], 0, valeurs);
    expect(r.facteurs[0]?.valeurs).toEqual({ libelle: 'Atelier Fictif', n: 5 });
    expect(JSON.stringify(r)).not.toMatch(/FR76/i);
  });

  it('candidats-tries-et-bornes', () => {
    const cands = [{ pieceId: 'B', score: 50 }, { pieceId: 'A', score: 50 }, { pieceId: 'C', score: 90 }, { pieceId: 'D', score: 10 }];
    const base = lien(facteurs.slice(0, 1));
    const ids = (n: number, c = cands) => expliquer(ligne('PROPOSEE'), base, c, n).autresCandidats.map((x) => x.pieceId);
    expect(ids(10)).toEqual(['C', 'A', 'B', 'D']);
    expect(ids(2)).toEqual(['C', 'A']);
    expect(ids(0)).toEqual([]);
    expect(ids(3, [])).toEqual([]);
    expect(ids(10, [{ pieceId: 'P1', score: 99 }, ...cands])).toEqual(['C', 'A', 'B', 'D']);
    for (const mauvaise of [Number.NaN, -1, 1.5, Infinity]) expect(erreur(() => expliquer(ligne('PROPOSEE'), base, cands, mauvaise))).toBe('borne_invalide');
    expect(erreur(() => expliquer(ligne('PROPOSEE'), base, [{ pieceId: 'X', score: Number.NaN }], 1))).toBe('candidat_invalide');
    expect(cands.map((x) => x.pieceId)).toEqual(['B', 'A', 'C', 'D']);
  });

  it('facteur-nul-garde', () => {
    const r = expliquer(ligne('PROPOSEE'), lien([{ nom: 'date', points: 0, code: 'f_date' }, { nom: 'ecart', points: -10, code: 'f_ecart' }]), [], 0);
    expect(r.facteurs.map((f) => f.points)).toEqual([0, -10]);
    expect(erreur(() => expliquer(ligne('PROPOSEE', 'L1'), lien(facteurs, 'L2'), [], 0))).toBe('lien_etranger');
  });
});
