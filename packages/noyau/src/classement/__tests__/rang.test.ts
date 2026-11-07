import { describe, expect, it, vi } from 'vitest';
import { ErreurClassement, proposerCompte, type PieceHistorique } from '../rang.js';

const exercices = { courant: 2026, precedent: 2025 };
function piece(compte: string, date: string, over: Partial<PieceHistorique> = {}): PieceHistorique {
  return { compte, statut: 'valide', exercice: 2026, date, ...over };
}
const hist = (...h: PieceHistorique[]) => proposerCompte({ historique: h, exercices });
const apprise = (compte: string, statut: 'proposee' | 'eteinte') => ({ compte, statut });

describe('proposerCompte', () => {
  it('historique-propose-sans-appel-ia', () => {
    const ia = vi.fn(() => '600001');
    const r = proposerCompte({ historique: [piece('600100', '2026-01-02')], exercices, ia });
    expect(r.compte).toBe('600100');
    expect(r.source).toBe('historique');
    expect(ia).toHaveBeenCalledTimes(0);
  });

  it('regle-societe-gagne', () => {
    const ia = vi.fn(() => '600001');
    const historique = [piece('600100', '2026-01-02')];
    const r = proposerCompte({ regleSociete: '600200', historique, exercices, ia });
    expect(r).toMatchObject({ compte: '600200', source: 'regle_societe', confianceMax: 'sur' });
    expect(ia).toHaveBeenCalledTimes(0);
  });

  it('brouillon-ignore', () => {
    const r = hist(piece('600100', '2026-01-02', { statut: 'brouillon' }));
    expect(r.source).toBe('aucune');
    expect(r.compte).toBeUndefined();
  });

  it('contre-passee-ignoree', () => {
    const r = hist(piece('600100', '2026-01-02', { statut: 'contre_passee' }), piece('600300', '2026-01-03'));
    expect(r.compte).toBe('600300');
    expect(r.detail).toEqual({ nbRetenu: 1, nbTotal: 1 });
  });

  it('majorite-trois-sur-quatre', () => {
    const r = hist(
      piece('600300', '2026-01-01'),
      piece('600300', '2026-01-02'),
      piece('600100', '2026-01-09'),
      piece('600300', '2025-12-30', { exercice: 2025 }),
    );
    expect(r.compte).toBe('600300');
    expect(r.detail).toEqual({ nbRetenu: 3, nbTotal: 4 });
    expect(r.confianceMax).toBe('sur');
  });

  it('egalite-departagee-par-la-date', () => {
    expect(hist(piece('600100', '2026-03-01'), piece('600900', '2026-04-01')).compte).toBe('600900');
    // même date : plus petit numéro de compte, quel que soit l'ordre reçu
    expect(hist(piece('600900', '2026-04-01'), piece('600100', '2026-04-01')).compte).toBe('600100');
    expect(hist(piece('600100', '2026-04-01'), piece('600900', '2026-04-01')).compte).toBe('600100');
  });

  it('exercice-ancien-ignore', () => {
    const r = hist(piece('600100', '2024-05-01', { exercice: 2024 }), piece('600200', '2025-05-01', { exercice: 2025 }));
    expect(r.compte).toBe('600200');
    expect(r.detail).toEqual({ nbRetenu: 1, nbTotal: 1 });
    const historique = [piece('600200', '2025-05-01', { exercice: 2025 })];
    expect(proposerCompte({ historique, exercices: { courant: 2026 } }).source).toBe('aucune');
  });

  it('ia-en-dernier-a-verifier', () => {
    const ia = vi.fn(() => '600777');
    const r = proposerCompte({ historique: [], exercices, ia });
    expect(r).toMatchObject({ compte: '600777', source: 'ia', confianceMax: 'a_verifier' });
    expect(ia).toHaveBeenCalledTimes(1);
  });

  it('apprise-contredite-signalee', () => {
    const base = { regleSociete: '600200', historique: [], exercices };
    const r = proposerCompte({ ...base, regleApprise: apprise('600300', 'proposee') });
    expect(r.compte).toBe('600200');
    expect(r.signalements).toContain('regle_apprise_contredite');
    expect(proposerCompte({ ...base, regleApprise: apprise('600200', 'proposee') }).signalements).toEqual([]);
    expect(proposerCompte({ ...base, regleApprise: apprise('600300', 'eteinte') }).signalements).toEqual([]);
  });

  it('aucune-source', () => {
    const r = proposerCompte({ historique: [], exercices });
    expect(r).toEqual({ source: 'aucune', confianceMax: 'a_verifier', signalements: [] });
    const iaVide = proposerCompte({ historique: [], exercices, ia: () => '' });
    expect(iaVide.source).toBe('aucune');
    expect(iaVide.compte).toBeUndefined();
  });

  it('regle-apprise-rang-2 et eteinte ignoree', () => {
    const historique = [piece('600100', '2026-01-02')];
    const r = proposerCompte({ regleApprise: apprise('600300', 'proposee'), historique, exercices });
    expect(r).toMatchObject({ compte: '600300', source: 'regle_apprise', confianceMax: 'sur' });
    const e = proposerCompte({ regleApprise: apprise('600300', 'eteinte'), historique, exercices });
    expect(e.source).toBe('historique');
  });

  it('date-invalide-refusee', () => {
    for (const date of ['', 'nimporte', '2026-13-01', '2026-02-30']) {
      expect(() => hist(piece('600100', date))).toThrow(ErreurClassement);
    }
    try {
      hist(piece('600100', ''));
    } catch (e) {
      expect((e as ErreurClassement).code).toBe('date_invalide');
    }
  });
});
