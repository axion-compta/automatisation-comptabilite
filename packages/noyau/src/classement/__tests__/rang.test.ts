import { describe, expect, it, vi } from 'vitest';
import { ErreurClassement, proposerCompte, type PieceHistorique } from '../rang.js';

const exercices = { courant: 2026, precedent: 2025 };
function piece(compte: string, date: string, over: Partial<PieceHistorique> = {}): PieceHistorique {
  return { compte, statut: 'valide', exercice: 2026, date, ...over };
}

describe('proposerCompte', () => {
  it('historique-propose-sans-appel-ia', () => {
    const ia = vi.fn(() => '600001');
    const r = proposerCompte({
      historique: [piece('600100', '2026-01-02')],
      exercices,
      ia,
    });
    expect(r.compte).toBe('600100');
    expect(r.source).toBe('historique');
    expect(ia).toHaveBeenCalledTimes(0);
  });

  it('regle-societe-gagne', () => {
    const ia = vi.fn(() => '600001');
    const r = proposerCompte({
      regleSociete: '600200',
      historique: [piece('600100', '2026-01-02')],
      exercices,
      ia,
    });
    expect(r).toMatchObject({
      compte: '600200',
      source: 'regle_societe',
      confianceMax: 'sur',
    });
    expect(ia).toHaveBeenCalledTimes(0);
  });

  it('brouillon-ignore', () => {
    const r = proposerCompte({
      historique: [piece('600100', '2026-01-02', { statut: 'brouillon' })],
      exercices,
    });
    expect(r.source).toBe('aucune');
    expect(r.compte).toBeUndefined();
  });

  it('contre-passee-ignoree', () => {
    const r = proposerCompte({
      historique: [piece('600100', '2026-01-02', { statut: 'contre_passee' }), piece('600300', '2026-01-03')],
      exercices,
    });
    expect(r.compte).toBe('600300');
    expect(r.detail).toEqual({ nbRetenu: 1, nbTotal: 1 });
  });

  it('majorite-trois-sur-quatre', () => {
    const r = proposerCompte({
      historique: [
        piece('600300', '2026-01-01'),
        piece('600300', '2026-01-02'),
        piece('600100', '2026-01-09'),
        piece('600300', '2025-12-30', { exercice: 2025 }),
      ],
      exercices,
    });
    expect(r.compte).toBe('600300');
    expect(r.detail).toEqual({ nbRetenu: 3, nbTotal: 4 });
    expect(r.confianceMax).toBe('sur');
  });

  it('egalite-departagee-par-la-date', () => {
    const r = proposerCompte({
      historique: [piece('600100', '2026-03-01'), piece('600900', '2026-04-01')],
      exercices,
    });
    expect(r.compte).toBe('600900');
    // même date : plus petit numéro de compte, quel que soit l'ordre reçu
    const egal = proposerCompte({
      historique: [piece('600900', '2026-04-01'), piece('600100', '2026-04-01')],
      exercices,
    });
    expect(egal.compte).toBe('600100');
    const egalInverse = proposerCompte({
      historique: [piece('600100', '2026-04-01'), piece('600900', '2026-04-01')],
      exercices,
    });
    expect(egalInverse.compte).toBe('600100');
  });

  it('exercice-ancien-ignore', () => {
    const r = proposerCompte({
      historique: [
        piece('600100', '2024-05-01', { exercice: 2024 }),
        piece('600200', '2025-05-01', { exercice: 2025 }),
      ],
      exercices,
    });
    expect(r.compte).toBe('600200');
    expect(r.detail).toEqual({ nbRetenu: 1, nbTotal: 1 });
    const sansPrecedent = proposerCompte({
      historique: [piece('600200', '2025-05-01', { exercice: 2025 })],
      exercices: { courant: 2026 },
    });
    expect(sansPrecedent.source).toBe('aucune');
  });

  it('ia-en-dernier-a-verifier', () => {
    const ia = vi.fn(() => '600777');
    const r = proposerCompte({ historique: [], exercices, ia });
    expect(r).toMatchObject({
      compte: '600777',
      source: 'ia',
      confianceMax: 'a_verifier',
    });
    expect(ia).toHaveBeenCalledTimes(1);
  });

  it('apprise-contredite-signalee', () => {
    const r = proposerCompte({
      regleSociete: '600200',
      regleApprise: { compte: '600300', statut: 'proposee' },
      historique: [],
      exercices,
    });
    expect(r.compte).toBe('600200');
    expect(r.signalements).toContain('regle_apprise_contredite');
    const accord = proposerCompte({
      regleSociete: '600200',
      regleApprise: { compte: '600200', statut: 'proposee' },
      historique: [],
      exercices,
    });
    expect(accord.signalements).toEqual([]);
    const eteinte = proposerCompte({
      regleSociete: '600200',
      regleApprise: { compte: '600300', statut: 'eteinte' },
      historique: [],
      exercices,
    });
    expect(eteinte.signalements).toEqual([]);
  });

  it('aucune-source', () => {
    const r = proposerCompte({ historique: [], exercices });
    expect(r).toEqual({
      source: 'aucune',
      confianceMax: 'a_verifier',
      signalements: [],
    });
    const iaVide = proposerCompte({ historique: [], exercices, ia: () => '' });
    expect(iaVide.source).toBe('aucune');
    expect(iaVide.compte).toBeUndefined();
  });

  it('regle-apprise-rang-2 et eteinte ignoree', () => {
    const r = proposerCompte({
      regleApprise: { compte: '600300', statut: 'proposee' },
      historique: [piece('600100', '2026-01-02')],
      exercices,
    });
    expect(r).toMatchObject({
      compte: '600300',
      source: 'regle_apprise',
      confianceMax: 'sur',
    });
    const e = proposerCompte({
      regleApprise: { compte: '600300', statut: 'eteinte' },
      historique: [piece('600100', '2026-01-02')],
      exercices,
    });
    expect(e.source).toBe('historique');
  });

  it('date-invalide-refusee', () => {
    for (const date of ['', 'nimporte', '2026-13-01', '2026-02-30']) {
      expect(() => proposerCompte({ historique: [piece('600100', date)], exercices })).toThrow(
        ErreurClassement,
      );
    }
    try {
      proposerCompte({ historique: [piece('600100', '')], exercices });
    } catch (e) {
      expect((e as ErreurClassement).code).toBe('date_invalide');
    }
  });
});
