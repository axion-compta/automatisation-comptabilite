import { describe, expect, it } from 'vitest';
import { ErreurProfil } from '../types.js';
import { choixFraisDeConstitution, enFormation, periodeDePiece, traitementPieceAvantImmatriculation, verifierDates } from '../trois-dates.js';
import type { DatesSociete } from '../trois-dates.js';

const D: DatesSociete = {
  depotCapital: '2026-01-10',
  immatriculation: '2026-02-10',
  debutActivite: '2026-02-15',
  exerciceDebut: '2026-03-01',
  exerciceFin: '2027-02-28',
};
const avec = (p: Partial<DatesSociete>): DatesSociete => ({ ...D, ...p });
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurProfil ? e.code : 'autre';
  }
  return undefined;
};

describe('trois dates', () => {
  it('piece-avant-immatriculation-p22', () => {
    expect(periodeDePiece(D, '2026-01-25')).toBe('avant_immatriculation');
    const t = traitementPieceAvantImmatriculation({ dansEtatDesActes: false, decisionDeReprise: false });
    expect(t).toEqual({ reprise: 'non', chargePermise: false, tvaDeductiblePermise: false, carte: 'reprise_a_verifier' });
  });

  it('piece-dans-etat-des-actes-reprise', () => {
    const attendu = { reprise: 'oui', chargePermise: true, tvaDeductiblePermise: true };
    expect(traitementPieceAvantImmatriculation({ dansEtatDesActes: true, decisionDeReprise: false })).toEqual(attendu);
    expect(traitementPieceAvantImmatriculation({ dansEtatDesActes: false, decisionDeReprise: true })).toEqual(attendu);
    expect(traitementPieceAvantImmatriculation({ dansEtatDesActes: true, decisionDeReprise: null })).toEqual(attendu);
  });

  it('reprise-inconnue-a-verifier', () => {
    const attendu = { reprise: 'a_verifier', chargePermise: false, tvaDeductiblePermise: false, carte: 'reprise_a_verifier' };
    expect(traitementPieceAvantImmatriculation({ dansEtatDesActes: null, decisionDeReprise: null })).toEqual(attendu);
    expect(traitementPieceAvantImmatriculation({ dansEtatDesActes: null, decisionDeReprise: false })).toEqual(attendu);
    expect(traitementPieceAvantImmatriculation({ dansEtatDesActes: false, decisionDeReprise: null })).toEqual(attendu);
  });

  it('periode-bornes', () => {
    const p = (d: string) => periodeDePiece(D, d);
    expect(p('2026-01-09')).toBe('avant_depot');
    expect(p('2026-01-10')).toBe('avant_immatriculation');
    expect(p('2026-01-11')).toBe('avant_immatriculation');
    expect(p('2026-02-09')).toBe('avant_immatriculation');
    expect(p('2026-02-10')).toBe('avant_exercice');
    expect(p('2026-02-11')).toBe('avant_exercice');
    expect(p('2026-02-28')).toBe('avant_exercice');
    expect(p('2026-03-01')).toBe('exercice');
    expect(p('2026-03-02')).toBe('exercice');
    expect(p('2027-02-28')).toBe('exercice');
    expect(p('2027-03-01')).toBe('apres_exercice');
  });

  it('periode : exercice commencant avant l immatriculation, dates nulles', () => {
    const tot = avec({ exerciceDebut: '2026-01-10' });
    expect(periodeDePiece(tot, '2026-01-10')).toBe('avant_immatriculation');
    expect(periodeDePiece(tot, '2026-02-10')).toBe('exercice');
    const sansDepot = avec({ depotCapital: null });
    expect(periodeDePiece(sansDepot, '2000-01-01')).toBe('avant_immatriculation');
    const formation = avec({ immatriculation: null });
    expect(periodeDePiece(formation, '2026-12-01')).toBe('avant_immatriculation');
    expect(periodeDePiece(formation, '2026-01-09')).toBe('avant_depot');
    expect(code(() => periodeDePiece(D, '2026-02-30'))).toBe('date_invalide');
  });

  it('en-formation-sans-immatriculation', () => {
    expect(enFormation(avec({ immatriculation: null }))).toBe(true);
    expect(enFormation(D)).toBe(false);
    expect(enFormation(avec({ immatriculation: '2026-02-10', depotCapital: null }))).toBe(false);
  });

  it('ordre-inverse-refuse', () => {
    expect(verifierDates(avec({ exerciceFin: '2026-02-28' }))).toEqual({ valide: false, motifs: ['ordre_inverse'] });
    expect(verifierDates(avec({ exerciceFin: '2026-03-01' })).valide).toBe(true);
    expect(verifierDates(D)).toEqual({ valide: true, motifs: [] });
  });

  it('immatriculation-avant-depot-refusee', () => {
    expect(verifierDates(avec({ immatriculation: '2026-01-09' }))).toEqual({ valide: false, motifs: ['immatriculation_avant_depot'] });
    expect(verifierDates(avec({ immatriculation: '2026-01-10' })).valide).toBe(true);
    expect(verifierDates(avec({ immatriculation: null })).valide).toBe(true);
    expect(verifierDates(avec({ depotCapital: null })).valide).toBe(true);
    expect(verifierDates(avec({ immatriculation: '2026-01-09', exerciceFin: '2026-01-01' })).motifs).toEqual([
      'ordre_inverse',
      'immatriculation_avant_depot',
    ]);
  });

  it('date-invalide-refusee', () => {
    for (const mauvaise of ['2026-02-30', '', '2026-1-1', 'abc']) {
      expect(verifierDates(avec({ depotCapital: mauvaise }))).toEqual({ valide: false, motifs: ['date_invalide'] });
      expect(verifierDates(avec({ immatriculation: mauvaise })).motifs).toEqual(['date_invalide']);
      expect(verifierDates(avec({ debutActivite: mauvaise })).motifs).toEqual(['date_invalide']);
      expect(verifierDates(avec({ exerciceDebut: mauvaise })).motifs).toEqual(['date_invalide']);
      expect(verifierDates(avec({ exerciceFin: mauvaise })).motifs).toEqual(['date_invalide']);
    }
  });

  it('frais-de-constitution-jamais-tranches', () => {
    expect(choixFraisDeConstitution()).toEqual({ options: ['charge', 'immobilisation'], tranche: false });
  });
});
