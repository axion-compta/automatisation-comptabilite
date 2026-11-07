import { describe, expect, it } from 'vitest';
import { ErreurChat } from '../../chat/types.js';
import { ajouterCorrection, exemplesDe, reglesAProposer, type Correction, type Exemple } from '../curateur.js';

const FOURNIL = 'Fournil Exemple';
const PAPETERIE = 'Papeterie Test';
const corr = (o: Partial<Correction> = {}): Correction => ({ societe: 'societe-a', fournisseur: FOURNIL, compte: '606', par: 'personne', le: '2026-01-01', ...o });
const jusque = (n: number, o: Partial<Correction> = {}): Exemple[] =>
  Array.from({ length: n }, (_, i) => corr({ ...o, le: `2026-02-0${String(i + 1)}` })).reduce<Exemple[]>((acc, c) => ajouterCorrection(acc, c), []);

describe('curateur de memoire', () => {
  it('correction-devient-exemple', () => {
    const r = ajouterCorrection([], corr());
    expect(r).toEqual([corr()]);
    expect(exemplesDe(r, 'societe-a')).toEqual([corr()]);
  });

  it('correction-par-une-piece-refusee', () => {
    expect(() => ajouterCorrection([], corr({ par: 'piece' }))).toThrow(ErreurChat);
    expect(() => ajouterCorrection([], corr({ par: 'piece' }))).toThrow(expect.objectContaining({ code: 'parametre_invalide' }) as Error);
  });

  it('seuil-de-concordance-exact', () => {
    expect(reglesAProposer(jusque(2), 'societe-a', { concordantes: 3 })).toEqual([]);
    expect(reglesAProposer(jusque(3), 'societe-a', { concordantes: 3 })).toEqual([{ fournisseur: FOURNIL, compte: '606', niveau: 'M', etat: 'proposee' }]);
  });

  it('correction-contraire-plus-recente-annule', () => {
    const exemples = [...jusque(3), corr({ compte: '607', le: '2026-03-01' })];
    expect(reglesAProposer(exemples, 'societe-a', { concordantes: 3 })).toEqual([]);
    const ancienne = [corr({ compte: '607', le: '2026-01-01' }), ...jusque(3)];
    expect(reglesAProposer(ancienne, 'societe-a', { concordantes: 3 })).toHaveLength(1);
    const memeJour = [...jusque(3), corr({ compte: '607', le: '2026-02-03' })];
    expect(reglesAProposer(memeJour, 'societe-a', { concordantes: 3 })).toEqual([]);
  });

  it('aucune-fuite-entre-societes', () => {
    const exemples = [...jusque(3), ...jusque(3, { societe: 'societe-b', fournisseur: PAPETERIE, compte: '626' })];
    expect(reglesAProposer(exemples, 'societe-a', { concordantes: 3 }).map((r) => r.fournisseur)).toEqual([FOURNIL]);
    expect(reglesAProposer(exemples, 'societe-b', { concordantes: 3 }).map((r) => r.fournisseur)).toEqual([PAPETERIE]);
    expect(exemplesDe(exemples, 'societe-b').every((e) => e.societe === 'societe-b')).toBe(true);
    expect(reglesAProposer(exemples, 'societe-c', { concordantes: 1 })).toEqual([]);
  });

  it('regle-jamais-appliquee', () => {
    const regles = reglesAProposer(jusque(5), 'societe-a', { concordantes: 1 });
    expect(regles.length).toBeGreaterThan(0);
    for (const r of regles) {
      expect(r.etat).toBe('proposee');
      expect(r.niveau).toBe('M');
    }
  });

  it('doublon-ignore', () => {
    const une = ajouterCorrection([], corr());
    expect(ajouterCorrection(une, corr())).toHaveLength(1);
    expect(ajouterCorrection(une, corr({ le: '2026-01-02' }))).toHaveLength(2);
    expect(ajouterCorrection(une, corr({ compte: '607' }))).toHaveLength(2);
    expect(une).toHaveLength(1);
  });

  it('reglage-invalide', () => {
    for (const c of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => reglesAProposer(jusque(3), 'societe-a', { concordantes: c })).toThrow(ErreurChat);
    }
  });

  it('liste-vide', () => {
    expect(reglesAProposer([], 'societe-a', { concordantes: 1 })).toEqual([]);
    expect(exemplesDe([], 'societe-a')).toEqual([]);
  });
});
