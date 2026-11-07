import { describe, expect, it } from 'vitest';
import { croiserCompteCourant, ErreurCompteCourant, type LigneCompteCourant } from '../compte-courant.js';

const lien = (type: 'ecriture' | 'piece' | 'ligne_bancaire', id: string) => ({ type, id });
const ligne = (id: string, montant: number, l?: ReturnType<typeof lien>): LigneCompteCourant =>
  l === undefined ? { id, montant } : { id, montant, lien: l };

function code(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    expect(e).toBeInstanceOf(ErreurCompteCourant);
    return (e as ErreurCompteCourant).code;
  }
  return 'aucune_erreur';
}

// Convention : crédit moins débit ; positif = dû à l'associé, négatif = l'associé doit à la société.
describe('compte courant d associé', () => {
  it('tout-explique', () => {
    // MOT63-1 : 1 250,00 expliqués sur 1 250,00.
    const r = croiserCompteCourant([
      ligne('l1', 100000, lien('ecriture', 'e1')),
      ligne('l2', 25000, lien('piece', 'p1')),
    ]);
    expect(r).toEqual({ solde: 125000, explique: 125000, nonExplique: 0, lignesNonExpliquees: [], debiteur: false });
    expect(r.gesteRequis).toBeUndefined();
  });

  it('retrait-sans-ecriture-non-explique', () => {
    // MOT63-2 : retrait de 300,00 sans écriture : écart 300,00.
    const r = croiserCompteCourant([
      ligne('b', 125000, lien('ligne_bancaire', 'lb1')),
      ligne('c', 5000),
      ligne('a', -30000),
    ]);
    expect(r.solde).toBe(100000);
    expect(r.explique).toBe(125000);
    expect(r.nonExplique).toBe(-25000);
    expect(r.lignesNonExpliquees).toEqual(['a', 'c']);
    // Le solde se décompose toujours en expliqué plus non expliqué.
    expect(r.explique + r.nonExplique).toBe(r.solde);
    const retrait = croiserCompteCourant([ligne('r1', -30000)]);
    expect(Math.abs(retrait.nonExplique)).toBe(30000);
    expect(retrait.lignesNonExpliquees).toEqual(['r1']);
  });

  it('solde-debiteur-g07', () => {
    // MOT63-3 : débiteur de 200,00 : alerte et geste G07.
    const r = croiserCompteCourant([ligne('l1', -20000, lien('ecriture', 'e1'))]);
    expect(r.solde).toBe(-20000);
    expect(r.debiteur).toBe(true);
    expect(r.gesteRequis).toBe('G07');
    // Solde nul ou créditeur : pas débiteur, pas de geste.
    for (const montant of [0, 1]) {
      const ok = croiserCompteCourant([ligne('l1', montant, lien('piece', 'p'))]);
      expect(ok.debiteur).toBe(false);
      expect('gesteRequis' in ok).toBe(false);
    }
  });

  it('lien-a-id-vide-non-explique', () => {
    for (const id of ['', '   ']) {
      const r = croiserCompteCourant([ligne('l1', 500, lien('piece', id))]);
      expect(r.lignesNonExpliquees).toEqual(['l1']);
      expect(r.explique).toBe(0);
      expect(r.nonExplique).toBe(500);
    }
  });

  it('ligne-en-double-refusee', () => {
    expect(code(() => croiserCompteCourant([ligne('x', 1, lien('piece', 'p')), ligne('x', 2)]))).toBe('ligne_en_double');
    expect(croiserCompteCourant([ligne('x', 1), ligne('y', 2)]).solde).toBe(3);
  });

  it('entrees-invalides', () => {
    for (const montant of [Number.NaN, 1.5, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(code(() => croiserCompteCourant([ligne('l1', montant, lien('piece', 'p'))]))).toBe('montant_invalide');
    }
    // Deux montants non entiers qui se compensent restent refusés.
    expect(code(() => croiserCompteCourant([ligne('a', 1.5), ligne('b', -1.5)]))).toBe('montant_invalide');
    expect(croiserCompteCourant([])).toEqual({
      solde: 0,
      explique: 0,
      nonExplique: 0,
      lignesNonExpliquees: [],
      debiteur: false,
    });
  });
});
