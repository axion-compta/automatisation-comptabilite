import { describe, expect, it } from 'vitest';
import { ErreurProfil } from '../types.js';
import type { ChampProfil } from '../types.js';
import { ajouterValeur, confirmer, marquerJeNeSaisPas, valeurEnVigueur } from '../champs.js';
import type { NouvelleValeur } from '../champs.js';

const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurProfil ? e.code : 'autre';
  }
  return undefined;
};
const S = 'societe-test';
const base = (valeur: unknown, plus: Partial<NouvelleValeur> = {}): NouvelleValeur => ({ societeId: S, cle: 'nom', valeur, origine: 'document', confiance: 'sur', ...plus });
const gele = (h: readonly ChampProfil[]): readonly ChampProfil[] => Object.freeze(h.map((c) => Object.freeze({ ...c })));
const pers = { type: 'personne', id: 'personne-1' } as const;

describe('champs du profil', () => {
  it('ajout-sans-modifier', () => {
    const h0 = gele([]);
    const h1 = gele(ajouterValeur(h0, base('A'), '2026-01-10'));
    const h2 = ajouterValeur(h1, base('B'), '2026-01-11');
    expect(h0).toHaveLength(0);
    expect(h1).toHaveLength(1);
    expect(h2).toHaveLength(2);
    expect(h2[0]).toEqual(h1[0]);
    expect(h2[0]).toMatchObject({ valeur: 'A', statut: 'a_confirmer', sourceRef: null, dateSource: null, confirmePar: null, confirmeLe: null });
  });
  it('rang-croissant', () => {
    let h: readonly ChampProfil[] = [];
    h = ajouterValeur(h, base('A'), '2026-01-10');
    h = ajouterValeur(h, base('B'), '2026-01-10');
    h = ajouterValeur(h, base('Z', { cle: 'autre' }), '2026-01-10');
    h = ajouterValeur(h, base('C', { sourceRef: 'ref', dateSource: '2026-01-02' }), '2026-01-10');
    expect(h.map((c) => c.rang)).toEqual([1, 2, 1, 3]);
    expect(h[3]).toMatchObject({ sourceRef: 'ref', dateSource: '2026-01-02' });
  });
  it('effet-par-defaut-date-de-saisie', () => {
    const h = ajouterValeur([], base('A'), '2026-03-05');
    expect(h[0]?.effetDebut).toBe('2026-03-05');
    expect(ajouterValeur([], base('A', { effetDebut: '2025-12-31' }), '2026-03-05')[0]?.effetDebut).toBe('2025-12-31');
  });
  it('valeur-en-vigueur-a-une-date', () => {
    let h: readonly ChampProfil[] = [];
    h = ajouterValeur(h, base('A', { effetDebut: '2025-01-01' }), '2026-01-01');
    h = ajouterValeur(h, base('B', { effetDebut: '2026-01-01' }), '2026-01-02');
    h = ajouterValeur(h, base('X', { societeId: 'autre' }), '2026-01-02');
    const v = (d: string): unknown => valeurEnVigueur(h, S, 'nom', d)?.valeur;
    expect(v('2025-12-31')).toBe('A');
    expect(v('2026-01-01')).toBe('B');
    expect(v('2026-01-02')).toBe('B');
    expect(valeurEnVigueur(h, S, 'inconnue', '2026-01-02')).toBeNull();
  });
  it('meme-effet-departage-par-rang', () => {
    let h: readonly ChampProfil[] = [];
    h = ajouterValeur(h, base('A', { effetDebut: '2026-01-01' }), '2026-01-01');
    h = ajouterValeur(h, base('B', { effetDebut: '2026-01-01' }), '2026-01-01');
    expect(valeurEnVigueur(h, S, 'nom', '2026-06-01')?.valeur).toBe('B');
    expect(valeurEnVigueur([...h].reverse(), S, 'nom', '2026-06-01')?.valeur).toBe('B');
  });
  it('aucune-valeur-avant-effet', () => {
    const h = ajouterValeur([], base('A', { effetDebut: '2026-01-01' }), '2026-01-01');
    expect(valeurEnVigueur(h, S, 'nom', '2025-12-31')).toBeNull();
    expect(valeurEnVigueur([], S, 'nom', '2026-01-01')).toBeNull();
  });
  it('confirmation-par-agent-refusee', () => {
    const h = ajouterValeur([], base('A'), '2026-01-10');
    const ref = { societeId: S, cle: 'nom', effetDebut: '2026-01-10' };
    expect(code(() => confirmer(h, ref, { type: 'agent', id: 'agent-1' }, '2026-01-11T10:00:00Z'))).toBe('confirmation_par_agent');
    expect(code(() => confirmer(h, ref, { type: 'ia' as 'agent', id: 'x' }, '2026-01-11T10:00:00Z'))).toBe('confirmation_par_agent');
    expect(code(() => confirmer(h, ref, { type: 'personne', id: ' ' }, '2026-01-11T10:00:00Z'))).toBe('confirmant_vide');
    expect(code(() => confirmer(h, ref, pers, ''))).toBe('horodatage_vide');
  });
  it('confirmation-trace-personne-et-heure', () => {
    let h: readonly ChampProfil[] = ajouterValeur([], base('A'), '2026-01-10');
    h = ajouterValeur(h, base('B', { effetDebut: '2026-02-01' }), '2026-01-10');
    const apres = confirmer(gele(h), { societeId: S, cle: 'nom', effetDebut: '2026-01-10' }, pers, '2026-01-11T10:00:00Z');
    expect(apres).toHaveLength(3);
    expect(apres[2]).toMatchObject({ valeur: 'A', statut: 'confirme', confirmePar: 'personne-1', confirmeLe: '2026-01-11T10:00:00Z', rang: 3, effetDebut: '2026-01-10' });
    expect(apres[0]?.statut).toBe('a_confirmer');
    expect(valeurEnVigueur(apres, S, 'nom', '2026-01-20')?.statut).toBe('confirme');
  });
  it('marquer-je-ne-sais-pas', () => {
    const h = marquerJeNeSaisPas(ajouterValeur([], base('A'), '2026-01-10'), { societeId: S, cle: 'nom' }, '2026-01-12');
    expect(h[1]).toMatchObject({ valeur: null, statut: 'je_ne_sais_pas', effetDebut: '2026-01-12', rang: 2 });
    expect(marquerJeNeSaisPas([], { societeId: S, cle: 'nom', effetDebut: '2026-01-01' }, '2026-01-12')[0]?.effetDebut).toBe('2026-01-01');
    expect(code(() => confirmer(h, { societeId: S, cle: 'nom', effetDebut: '2026-01-12' }, pers, 'h'))).toBe('rien_a_confirmer');
  });
  it('refus-entrees-invalides', () => {
    const ajout = (n: Partial<NouvelleValeur>, d = '2026-01-10'): unknown => code(() => ajouterValeur([], base('A', n), d));
    expect(ajout({ cle: '' })).toBe('cle_vide');
    expect(ajout({ cle: '  ' })).toBe('cle_vide');
    expect(ajout({ effetDebut: '2026-02-30' })).toBe('date_invalide');
    expect(ajout({ dateSource: 'hier' })).toBe('date_invalide');
    expect(ajout({}, '2026-02-30')).toBe('date_invalide');
    expect(ajout({ origine: 'ia' as 'document' })).toBe('origine_inconnue');
    expect(ajout({ confiance: 'haute' as 'sur' })).toBe('confiance_inconnue');
    expect(ajout({ statut: 'ok' as 'confirme' })).toBe('statut_inconnu');
    expect(ajout({ statut: 'confirme' })).toBe('confirmation_par_agent');
    const ref = { societeId: S, cle: 'nom', effetDebut: '2026-01-10' };
    expect(code(() => confirmer([], ref, pers, 'h'))).toBe('rien_a_confirmer');
    expect(code(() => confirmer(ajouterValeur([], base('A'), '2026-01-09'), ref, pers, 'h'))).toBe('rien_a_confirmer');
    expect(code(() => confirmer([], { ...ref, effetDebut: '2026-13-01' }, pers, 'h'))).toBe('date_invalide');
    expect(code(() => valeurEnVigueur([], S, 'nom', 'x'))).toBe('date_invalide');
    const h = ajouterValeur(ajouterValeur([], base('A', { effetDebut: '2026-03-01' }), '2026-01-01'), base('B', { effetDebut: '2026-01-01' }), '2026-01-01');
    expect(valeurEnVigueur([...h].reverse(), S, 'nom', '2026-04-01')?.valeur).toBe('A');
    expect(valeurEnVigueur(h, S, 'nom', '2026-04-01')?.valeur).toBe('A');
  });
});
