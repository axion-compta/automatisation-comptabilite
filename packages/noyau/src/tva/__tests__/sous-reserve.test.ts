import { describe, expect, it } from 'vitest';
import {
  type LigneTvaAchat,
  ErreurSousReserve,
  deductionPreparee,
  demanderInclureSousReserve,
  passerEnSousReserve,
  troisMontants,
} from '../sous-reserve.js';

const ligne = (id: string, pieceId: string, tvaCentimes: number, certitude: LigneTvaAchat['certitude']): LigneTvaAchat => ({
  id,
  pieceId,
  tvaCentimes,
  certitude,
});

// Jeu inventé : 180 000 solide, 3 000 sous réserve, 2 200 perdue, total lu 185 200.
const jeu: LigneTvaAchat[] = [
  ligne('l1', 'p1', 100000, 'solide'),
  ligne('l2', 'p2', 80000, 'solide'),
  ligne('l3', 'p3', 3000, 'sous_reserve'),
  ligne('l4', 'p4', 2200, 'perdue'),
];

describe('troisMontants et deductionPreparee', () => {
  it('t1-deduction-180-000', () => {
    expect(deductionPreparee(jeu)).toEqual({ etat: 'preparee', centimes: 180000 });
  });

  it('t3-somme-des-trois-egale-total-lu-185-200', () => {
    const m = troisMontants(jeu);
    expect(m).toEqual({ solide: 180000, sousReserve: 3000, perdue: 2200, enDoute: 0, totalLu: 185200 });
    expect(m.solide + m.sousReserve + m.perdue + m.enDoute).toBe(m.totalLu);
  });

  it('liste vide : quatre montants à 0 et préparée à 0', () => {
    expect(troisMontants([])).toEqual({ solide: 0, sousReserve: 0, perdue: 0, enDoute: 0, totalLu: 0 });
    expect(deductionPreparee([])).toEqual({ etat: 'preparee', centimes: 0 });
  });

  it('avoir négatif accepté', () => {
    const l = [ligne('a', 'p1', 1000, 'solide'), ligne('b', 'p2', -300, 'solide')];
    expect(deductionPreparee(l)).toEqual({ etat: 'preparee', centimes: 700 });
    expect(troisMontants(l).totalLu).toBe(700);
  });

  it('montant non entier, NaN ou infini : refus', () => {
    for (const v of [1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const l = [ligne('x', 'p', v, 'solide')];
      expect(() => troisMontants(l)).toThrow(ErreurSousReserve);
      expect(() => deductionPreparee(l)).toThrow(ErreurSousReserve);
    }
  });

  it('t2-justificatif-douteux-bloque-sans-montant', () => {
    const l = [...jeu, ligne('l5', 'p5', 500, 'en_doute')];
    const r = deductionPreparee(l);
    expect(r).toEqual({ etat: 'bloquee', piecesEnDoute: 1 });
    expect('centimes' in r).toBe(false);
    expect(troisMontants(l).enDoute).toBe(500);
  });

  it('deux lignes en doute sur la même pièce : 1 pièce comptée', () => {
    const l = [ligne('a', 'p9', 100, 'en_doute'), ligne('b', 'p9', 200, 'en_doute'), ligne('c', 'p8', 300, 'en_doute')];
    expect(deductionPreparee(l)).toEqual({ etat: 'bloquee', piecesEnDoute: 2 });
  });
});

describe('interrupteur verrouillé', () => {
  it('t1-tentative-oui-refusee-deduction-inchangee', () => {
    const avant = deductionPreparee(jeu);
    for (const role of ['dirigeant', 'expert', 'administrateur']) {
      const r = demanderInclureSousReserve({ id: 'u1', role });
      expect(r.accepte).toBe(false);
      expect(r.code).toBe('interrupteur_verrouille');
    }
    expect(deductionPreparee(jeu)).toEqual(avant);
  });

  it('t1-une-ligne-de-refus-aucune-bascule', () => {
    const r = demanderInclureSousReserve({ id: 'u2', role: 'administrateur' });
    expect(r).toEqual({
      accepte: false,
      code: 'interrupteur_verrouille',
      journal: { type: 'refus_reglage', par: 'u2', reglage: 'tva.inclure_sous_reserve' },
    });
  });
});

describe('passerEnSousReserve', () => {
  const le = '2026-01-15T10:00:00Z';

  it('t2-personne-passe-en-sous-reserve-avec-trace', () => {
    const l = ligne('l5', 'p5', 500, 'en_doute');
    const r = passerEnSousReserve(l, { acteur: { type: 'personne', id: 'u1' }, motif: 'Ticket illisible', pieceId: 'p5', le });
    expect(r.ligne).toEqual({ ...l, certitude: 'sous_reserve' });
    expect(r.trace).toEqual({ acteurId: 'u1', le, motif: 'Ticket illisible', pieceId: 'p5' });
    expect(l.certitude).toBe('en_doute');
  });

  it('t2-sous-reserve-toujours-non-deductible', () => {
    const l = [...jeu, ligne('l5', 'p5', 500, 'en_doute')];
    const r = passerEnSousReserve(l[4]!, { acteur: { type: 'personne', id: 'u1' }, motif: 'ok', pieceId: 'p5', le });
    const apres = [...jeu, r.ligne];
    expect(deductionPreparee(apres)).toEqual({ etat: 'preparee', centimes: 180000 });
    expect(troisMontants(apres).sousReserve).toBe(3500);
  });

  it('ia-ne-passe-pas-en-sous-reserve', () => {
    const l = ligne('l5', 'p5', 500, 'en_doute');
    expect(() => passerEnSousReserve(l, { acteur: { type: 'ia', id: 'm1' }, motif: 'ok', pieceId: 'p5', le })).toThrow(
      expect.objectContaining({ code: 'ia_non_autorisee' }),
    );
  });

  it('transition interdite hors en_doute', () => {
    for (const c of ['solide', 'sous_reserve', 'perdue'] as const) {
      expect(() =>
        passerEnSousReserve(ligne('l', 'p', 1, c), { acteur: { type: 'personne', id: 'u' }, motif: 'm', pieceId: 'p', le }),
      ).toThrow(expect.objectContaining({ code: 'transition_interdite' }));
    }
  });

  it('motif vide ou blanc : refus', () => {
    for (const motif of ['', '   ']) {
      expect(() =>
        passerEnSousReserve(ligne('l', 'p', 1, 'en_doute'), { acteur: { type: 'personne', id: 'u' }, motif, pieceId: 'p', le }),
      ).toThrow(expect.objectContaining({ code: 'motif_vide' }));
    }
  });
});
