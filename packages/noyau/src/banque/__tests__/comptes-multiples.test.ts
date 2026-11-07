import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../argent/index.js';
import { apparierVirementsInternes, ErreurComptesMultiples, soldeCarteDiffere, soldeTotalParDevise } from '../comptes-multiples.js';
import type { LigneBancaire } from '../types.js';

const c = (n: number): Centimes => n as Centimes;
const l = (id: string, compteId: string, date: string, montant: number, societeId = 's1', contrepartieId?: string): LigneBancaire => ({
  ...(contrepartieId === undefined ? {} : { contrepartieId }), id, societeId, compteId, releveId: 'r', rang: 1, dateOperation: date, montant: c(montant), devise: 'EUR',
  libelleBrut: 'VIR', moyen: 'virement', etatTechnique: 'completee', etatRapprochement: 'A_QUALIFIER',
});
const R = { joursOuvres: 2, joursFermes: [] as string[] };
const COMPTES = ['A', 'B'];
const echoue = (f: () => unknown): boolean => {
  try { f(); } catch (e) { return e instanceof ErreurComptesMultiples; }
  return false;
};

describe('virements internes', () => {
  it('t09-3-virement-interne', () => {
    const r = apparierVirementsInternes([l('o', 'A', '2026-09-10', -50000), l('i', 'B', '2026-09-11', 50000)], COMPTES, R);
    expect(r.paires).toEqual([{ sortieId: 'o', entreeId: 'i', montant: 50000 }]);
    expect(r.orphelines).toEqual([]);
  });
  it('moitie-manquante-a-qualifier', () => {
    const r = apparierVirementsInternes([l('o', 'A', '2026-09-10', -50000, 's1', 'B')], COMPTES, R);
    expect(r.paires).toEqual([]);
    expect(r.orphelines).toEqual([{ ligneId: 'o', code: 'moitie_manquante' }]);
  });
  it('virement client isolé : ni paire ni orpheline', () => {
    const r = apparierVirementsInternes([l('c', 'A', '2026-09-10', 12000, 's1', 'client-9')], COMPTES, R);
    expect(r).toEqual({ paires: [], orphelines: [] });
    expect(apparierVirementsInternes([l('c', 'A', '2026-09-10', 12000)], COMPTES, R)).toEqual({ paires: [], orphelines: [] });
  });
  it('autre-societe-jamais-interne', () => {
    const r = apparierVirementsInternes([l('o', 'A', '2026-09-10', -50000), l('i', 'B', '2026-09-10', 50000, 's2')], COMPTES, R);
    expect(r.paires).toEqual([]);
  });
  it('hors-delai-jours-ouvres', () => {
    const r = apparierVirementsInternes([l('o', 'A', '2026-09-07', -100), l('i', 'B', '2026-09-10', 100)], COMPTES, R);
    expect(r.paires).toEqual([]);
    expect(r.orphelines.map((x) => x.ligneId)).toEqual(['i', 'o']);
    expect(apparierVirementsInternes([l('o', 'A', '2026-09-07', -100), l('i', 'B', '2026-09-09', 100)], COMPTES, R).paires).toHaveLength(1);
  });
  it('week-end-ne-compte-pas', () => {
    const lignes = [l('o', 'A', '2026-09-11', -100), l('i', 'B', '2026-09-14', 100)];
    expect(apparierVirementsInternes(lignes, COMPTES, { joursOuvres: 1, joursFermes: [] }).paires).toHaveLength(1);
    expect(apparierVirementsInternes(lignes, COMPTES, { joursOuvres: 0, joursFermes: [] }).paires).toHaveLength(0);
    expect(apparierVirementsInternes(lignes, COMPTES, { joursOuvres: 1, joursFermes: ['2026-09-14'] }).paires).toHaveLength(1);
    const ferme = [l('o', 'A', '2026-09-11', -100), l('i', 'B', '2026-09-15', 100)];
    expect(apparierVirementsInternes(ferme, COMPTES, { joursOuvres: 1, joursFermes: [] }).paires).toHaveLength(0);
    expect(apparierVirementsInternes(ferme, COMPTES, { joursOuvres: 1, joursFermes: ['2026-09-14'] }).paires).toHaveLength(1);
  });
  it('plus proche en date ; égalité = orphelines pour les deux', () => {
    const proche = apparierVirementsInternes([l('o1', 'A', '2026-09-09', -100), l('o2', 'A', '2026-09-10', -100), l('i', 'B', '2026-09-10', 100)], COMPTES, R);
    expect(proche.paires).toEqual([{ sortieId: 'o2', entreeId: 'i', montant: 100 }]);
    expect(proche.orphelines).toEqual([{ ligneId: 'o1', code: 'moitie_manquante' }]);
    const egal = apparierVirementsInternes([l('o1', 'A', '2026-09-09', -100), l('o2', 'A', '2026-09-11', -100), l('i', 'B', '2026-09-10', 100)], COMPTES, R);
    expect(egal.paires).toEqual([]);
    expect(egal.orphelines.map((x) => x.ligneId).sort()).toEqual(['i', 'o1', 'o2']);
  });
  it('même compte, listes vides, entrées invalides', () => {
    expect(apparierVirementsInternes([l('o', 'A', '2026-09-10', -100), l('i', 'A', '2026-09-10', 100)], COMPTES, R).paires).toEqual([]);
    expect(apparierVirementsInternes([], COMPTES, R)).toEqual({ paires: [], orphelines: [] });
    for (const j of [Number.NaN, -1, 1.5, Infinity]) {
      expect(echoue(() => apparierVirementsInternes([], COMPTES, { joursOuvres: j, joursFermes: [] }))).toBe(true);
    }
    expect(echoue(() => apparierVirementsInternes([l('o', 'A', '2026-09-10', -10.5)], COMPTES, R))).toBe(true);
    expect(echoue(() => apparierVirementsInternes([l('o', 'A', '2026-13-40', -10)], COMPTES, R))).toBe(true);
  });
});

describe('carte à débit différé et soldes', () => {
  const achats = Array.from({ length: 8 }, (_, i) => ({ id: `a${i}`, montant: c(-1000 - i), date: '2026-09-05' }));
  const somme = achats.reduce((s, a) => s + a.montant, 0);
  it('t09-4-carte-huit-charges-solde-zero', () => {
    const r = soldeCarteDiffere(achats, { id: 'p', montant: c(-somme), date: '2026-10-01' });
    expect(r).toEqual({ soldeApres: 0, nbCharges: 8, prelevementInterne: true });
  });
  it('ecart-carte-rendu-non-force', () => {
    expect(soldeCarteDiffere(achats, { id: 'p', montant: c(-somme + 1), date: '2026-10-01' }).soldeApres).toBe(1);
    expect(soldeCarteDiffere([], { id: 'p', montant: c(0), date: '2026-10-01' }).soldeApres).toBe(0);
    expect(echoue(() => soldeCarteDiffere([{ id: 'x', montant: c(1.5), date: '2026-09-01' }], { id: 'p', montant: c(0), date: '2026-10-01' }))).toBe(true);
  });
  it('t09-5-somme-et-devises-separees', () => {
    const r = soldeTotalParDevise([{ solde: c(1000000), devise: 'EUR' }, { solde: c(618025), devise: 'EUR' }, { solde: c(5), devise: 'XXA' }]);
    expect(r).toEqual({ EUR: 1618025, XXA: 5 });
    expect(soldeTotalParDevise([])).toEqual({});
    expect(echoue(() => soldeTotalParDevise([{ solde: Number.NaN as Centimes, devise: 'EUR' }]))).toBe(true);
  });
});
