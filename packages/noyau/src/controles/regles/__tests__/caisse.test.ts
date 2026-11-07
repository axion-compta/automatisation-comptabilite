import { describe, expect, it } from 'vitest';
import { executerControles } from '../../moteur.js';
import { ErreurCaisse, premiereCaisseNegative, regleCaisse, soldesCaisseParJour } from '../caisse.js';

const mv = (date: string, montant: number) => ({ date, montant });

describe('CC-PM02 caisse négative à une date', () => {
  it('CT-PM02', () => {
    // MOT56-1 : caisse 100,00 ; dépense 130,00 le 12/10 : -30,00.
    const entree = { soldeInitial: 10000, mouvements: [mv('2026-10-12', -13000)] };
    expect(regleCaisse.evaluer(entree)).toEqual({ resultat: 'ALERTE', ecartCentimes: 3000, valeur: '2026-10-12' });
    expect(premiereCaisseNegative(10000, entree.mouvements)).toEqual({ date: '2026-10-12', solde: -3000 });
    expect(regleCaisse.id).toBe('CC-PM02');
    expect(regleCaisse.version).toBe(1);
    expect(regleCaisse.gravite).toBe('B');
    expect(regleCaisse.bloque).toEqual(['validation', 'cloture']);
    expect(regleCaisse.declencheurs).toEqual(['continu', 'avant_cloture']);
    expect(regleCaisse.actif).toBe(true);
  });

  it('negative-signalee-meme-si-final-positif', () => {
    const mouvements = [mv('2026-10-12', -13000), mv('2026-10-20', 50000)];
    expect(soldesCaisseParJour(10000, mouvements)).toEqual([
      { date: '2026-10-12', solde: -3000 },
      { date: '2026-10-20', solde: 47000 },
    ]);
    expect(regleCaisse.evaluer({ soldeInitial: 10000, mouvements })).toEqual({ resultat: 'ALERTE', ecartCentimes: 3000, valeur: '2026-10-12' });
    // Première date négative, pas la plus basse.
    const deux = [mv('2026-10-01', -10100), mv('2026-10-02', -5000)];
    expect(premiereCaisseNegative(10000, deux)).toEqual({ date: '2026-10-01', solde: -100 });
  });

  it('entree-et-sortie-le-meme-jour-compensees', () => {
    const mouvements = [mv('2026-10-12', -13000), mv('2026-10-12', 13000)];
    expect(soldesCaisseParJour(10000, mouvements)).toEqual([{ date: '2026-10-12', solde: 10000 }]);
    expect(regleCaisse.evaluer({ soldeInitial: 10000, mouvements })).toEqual({ resultat: 'OK' });
  });

  it('ordre-des-mouvements-sans-effet', () => {
    const a = [mv('2026-10-20', 50000), mv('2026-10-12', -13000), mv('2026-10-05', -1000)];
    const b = [...a].reverse();
    expect(soldesCaisseParJour(10000, a)).toEqual(soldesCaisseParJour(10000, b));
    expect(soldesCaisseParJour(10000, a).map((s) => s.date)).toEqual(['2026-10-05', '2026-10-12', '2026-10-20']);
    expect(premiereCaisseNegative(10000, a)).toEqual(premiereCaisseNegative(10000, b));
  });

  it('jamais-negative-ok', () => {
    expect(regleCaisse.evaluer({ soldeInitial: 10000, mouvements: [mv('2026-10-12', -10000)] })).toEqual({ resultat: 'OK' });
    expect(regleCaisse.evaluer({ soldeInitial: 0, mouvements: [] })).toEqual({ resultat: 'OK' });
    expect(premiereCaisseNegative(0, [])).toBeUndefined();
    expect(soldesCaisseParJour(5, [])).toEqual([]);
  });

  it('entrees-invalides', () => {
    const refus = (f: () => unknown) => {
      try {
        f();
      } catch (e) {
        expect(e).toBeInstanceOf(ErreurCaisse);
        return;
      }
      throw new Error('aucune erreur levée');
    };
    refus(() => soldesCaisseParJour(0, [mv('2026-10-12', Number.NaN)]));
    refus(() => soldesCaisseParJour(0, [mv('2026-10-12', 1.5)]));
    refus(() => soldesCaisseParJour(0, [mv('2026-10-12', Number.POSITIVE_INFINITY)]));
    refus(() => soldesCaisseParJour(1.5, []));
    refus(() => soldesCaisseParJour(Number.NaN, []));
    refus(() => soldesCaisseParJour(0, [mv('2026-02-30', 100)]));
    refus(() => soldesCaisseParJour(0, [mv('2026-13-01', 100)]));
    refus(() => soldesCaisseParJour(0, [mv('12/10/2026', 100)]));
    refus(() => soldesCaisseParJour(0, [mv('', 100)]));
    expect(soldesCaisseParJour(0, [mv('2024-02-29', 100)])).toEqual([{ date: '2024-02-29', solde: 100 }]);
    refus(() => soldesCaisseParJour(0, [mv('2026-02-29', 100)]));
    // Dans le moteur, une entrée invalide n'est jamais comptée OK.
    const traces = executerControles(
      [regleCaisse],
      [{ type: 'caisse', id: 'c1', donnee: { soldeInitial: 0, mouvements: [mv('2026-10-12', Number.NaN)] } }],
      'continu',
      '2026-10-12T10:00:00Z',
    );
    expect(traces[0]?.resultat).toBe('IMPOSSIBLE');
  });
});
