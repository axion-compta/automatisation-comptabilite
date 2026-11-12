import { describe, expect, it } from 'vitest';
import { etendreReglesBancaires, type CategorieConservation, type RegleConservation } from '../../conservation/regles.js';
import { proposerPurge, resumePurge } from '../purge-proposee.js';
import { ErreurRgpd } from '../types.js';

const regle = (o: Partial<RegleConservation> = {}): RegleConservation => ({
  pays: 'AA', categorie: 'conversations', dureeAnnees: 1, pointDepart: 'date_document', statut: 'valide', source: 'test', ...o,
});
const ligne = (id: string, depart: string, categorie: CategorieConservation = 'conversations') => ({
  id, categorie, pays: ['AA'], dates: { date_document: depart },
});
const ctx = { gels: [], aujourdhui: '2027-03-01' };
const regles = [regle(), regle({ categorie: 'signalements' })];

describe('purge proposée', () => {
  it('t-exp-11-deux-proposees', () => {
    const r = proposerPurge([ligne('s1', '2026-01-10', 'signalements'), ligne('c1', '2026-01-10')], regles, ctx);
    expect(r).toEqual({ proposees: ['c1', 's1'], gardees: [] });
    expect(resumePurge(r)).toEqual({ proposees: 2, gel_actif: 0, a_confirmer: 0, trop_tot: 0, conservation_comptable: 0 });
  });

  it('regle-non-verifiee-zero-proposee', () => {
    for (const statut of ['non_verifie', 'a_verifier'] as const) {
      const r = proposerPurge([ligne('c1', '2026-01-10')], [regle({ statut })], ctx);
      expect(r).toEqual({ proposees: [], gardees: [{ id: 'c1', raison: 'a_confirmer' }] });
    }
  });

  it('gel-zero-proposee', () => {
    const r = proposerPurge([ligne('c1', '2026-01-10')], regles, { ...ctx, gels: [{ pose_le: '2027-02-01' }] });
    expect(r).toEqual({ proposees: [], gardees: [{ id: 'c1', raison: 'gel_actif' }] });
    const leve = proposerPurge([ligne('c1', '2026-01-10')], regles, { ...ctx, gels: [{ pose_le: '2027-01-01', leve_le: '2027-02-01' }] });
    expect(leve.proposees).toEqual(['c1']);
  });

  it('ligne-recente-gardee-trop-tot', () => {
    const r = proposerPurge([ligne('b', '2026-03-01'), ligne('a', '2026-03-02')], regles, ctx);
    expect(r).toEqual({ proposees: [], gardees: [{ id: 'a', raison: 'trop_tot' }, { id: 'b', raison: 'trop_tot' }] });
    expect(resumePurge(r).trop_tot).toBe(2);
  });

  it('categorie-sans-regle-gardee-a-confirmer', () => {
    const r = proposerPurge([ligne('p1', '2000-01-01', 'pieces')], regles, ctx);
    expect(r.gardees).toEqual([{ id: 'p1', raison: 'a_confirmer' }]);
    expect(resumePurge(r).a_confirmer).toBe(1);
  });

  it('doublon-refuse', () => {
    try {
      proposerPurge([ligne('c1', '2026-01-10'), ligne('c1', '2026-01-11')], regles, ctx);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ErreurRgpd);
      expect((e as ErreurRgpd).code).toBe('doublon');
    }
  });

  it('liste-vide-rien', () => {
    const r = proposerPurge([], regles, ctx);
    expect(r).toEqual({ proposees: [], gardees: [] });
    expect(resumePurge(r)).toEqual({ proposees: 0, gel_actif: 0, a_confirmer: 0, trop_tot: 0, conservation_comptable: 0 });
  });

  const compta = etendreReglesBancaires([regle({ categorie: 'pieces', dureeAnnees: 7 }), regle({ categorie: 'ecritures_livres', dureeAnnees: 7 }), ...regles]);
  const console = { ...ctx, origine: 'console' as const };

  it('purge-console-sans-effet-comptable', () => {
    const lignes = [
      ligne('p', '2026-01-10', 'pieces'), ligne('e', '2026-01-10', 'ecritures_livres'), ligne('r', '2026-01-10', 'rapprochements'), ligne('c', '2026-01-10'),
    ];
    const r = proposerPurge(lignes, compta, console);
    expect(r.proposees).toEqual(['c']);
    expect(r.gardees).toEqual([
      { id: 'e', raison: 'conservation_comptable' }, { id: 'p', raison: 'conservation_comptable' }, { id: 'r', raison: 'conservation_comptable' },
    ]);
    expect(resumePurge(r).conservation_comptable).toBe(3);
    // Non comptable encore en conservation : garde son code habituel.
    expect(proposerPurge([ligne('n', '2026-12-01')], compta, console).gardees).toEqual([{ id: 'n', raison: 'trop_tot' }]);
    // Sans origine console : comportement inchangé.
    expect(proposerPurge(lignes, compta, ctx).gardees.map((g) => g.raison)).toEqual(['trop_tot', 'trop_tot', 'trop_tot']);
    // Conservation échue : la console peut proposer.
    expect(proposerPurge([ligne('p', '2018-01-10', 'pieces')], compta, console).proposees).toEqual(['p']);
    // Un gel garde son code.
    expect(proposerPurge([ligne('p', '2026-01-10', 'pieces')], compta, { ...console, gels: [{ pose_le: '2027-02-01' }] }).gardees)
      .toEqual([{ id: 'p', raison: 'gel_actif' }]);
  });

  it('releve-garde-pendant-conservation', () => {
    const r = proposerPurge([ligne('r1', '2026-01-10', 'releves_bancaires')], compta, console);
    expect(r).toEqual({ proposees: [], gardees: [{ id: 'r1', raison: 'conservation_comptable' }] });
    // Durée inconnue : gardée aussi.
    expect(proposerPurge([ligne('r1', '2026-01-10', 'releves_bancaires')], [], console).gardees).toEqual([{ id: 'r1', raison: 'conservation_comptable' }]);
    // Échue : proposée (7 ans après 2018-01-10).
    expect(proposerPurge([ligne('r1', '2018-01-10', 'releves_bancaires')], compta, console).proposees).toEqual(['r1']);
    // Veille de l'échéance : encore gardée.
    expect(proposerPurge([ligne('r1', '2020-03-02', 'releves_bancaires')], compta, console).gardees).toHaveLength(1);
    expect(proposerPurge([ligne('r1', '2020-02-29', 'releves_bancaires')], compta, console).proposees).toEqual(['r1']);
  });
});
