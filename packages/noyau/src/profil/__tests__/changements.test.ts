import { describe, expect, it } from 'vitest';
import { apercuChangement, changerDateCloture, type Objets } from '../changements.js';
import { ErreurProfil } from '../types.js';

const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurProfil ? e.code : 'autre';
  }
  return undefined;
};
const objets = (o: Partial<Objets> = {}): Objets => ({
  brouillons: [
    { id: 'b1', date: '2026-02-10' },
    { id: 'b2', date: '2026-04-02' },
    { id: 'b3', date: '2026-05-20' },
  ],
  declarations: [
    { periode: { debut: '2026-01-01', fin: '2026-01-31' }, deposee: false },
    { periode: { debut: '2026-04-01', fin: '2026-04-30' }, deposee: false },
    { periode: { debut: '2026-05-01', fin: '2026-05-31' }, deposee: false },
  ],
  echeances: [
    { id: 'e1', date: '2026-05-25', dependDe: ['regime_tva'] },
    { id: 'e2', date: '2026-05-26', dependDe: ['autre'] },
    { id: 'e3', date: '2026-03-25', dependDe: ['regime_tva'] },
  ],
  ecrituresValidees: [
    { id: 'v1', date: '2026-04-10' },
    { id: 'v2', date: '2026-06-10' },
  ],
  ...o,
});
const effet = { cle: 'regime_tva', effetDebut: '2026-04-01' };
const bornes = { dureeMinMois: 6, dureeMaxMois: 18 };
const cloture = (o: Record<string, unknown> = {}): Parameters<typeof changerDateCloture>[0] => ({
  exerciceEnCours: { debut: '2026-01-01', fin: '2026-12-31', datesFigees: true },
  nouvelleFinJourMois: '06-30',
  ...bornes,
  ...o,
}) as never;

describe('aperçu d’un changement', () => {
  it('bascule-zero-ecriture-validee-p13', () => {
    const r = apercuChangement({ cle: 'regime_tva', effetDebut: '2026-04-01' }, objets());
    expect(r.ecrituresValideesTouchees).toBe(0);
    expect(JSON.stringify(r)).not.toContain('v1');
    expect(JSON.stringify(r)).not.toContain('v2');
    expect(apercuChangement(effet, objets({ ecrituresValidees: [] })).ecrituresValideesTouchees).toBe(0);
  });
  it('brouillons-apres-effet-seulement', () => {
    expect(apercuChangement(effet, objets()).brouillonsRecalcules).toBe(2);
    expect(apercuChangement({ ...effet, effetDebut: '2026-04-02' }, objets()).brouillonsRecalcules).toBe(2);
    expect(apercuChangement({ ...effet, effetDebut: '2026-04-03' }, objets()).brouillonsRecalcules).toBe(1);
  });
  it('declarations-non-deposees-listees', () => {
    const r = apercuChangement(effet, objets());
    expect(r.declarationsRecalculees).toEqual([
      { debut: '2026-04-01', fin: '2026-04-30' },
      { debut: '2026-05-01', fin: '2026-05-31' },
    ]);
    expect(r.refus).toBeUndefined();
  });
  it('effet-avant-periode-deposee-refuse', () => {
    const o = objets({ declarations: [{ periode: { debut: '2026-03-01', fin: '2026-03-31' }, deposee: true }] });
    const r = apercuChangement({ ...effet, effetDebut: '2026-03-15' }, o);
    expect(r.refus).toBe('periode_deposee');
    expect(r.regularisationProposee).toBe(true);
    expect(r.brouillonsRecalcules).toBe(0);
    expect(apercuChangement({ ...effet, effetDebut: '2026-03-31' }, o).refus).toBe('periode_deposee');
    expect(apercuChangement({ ...effet, effetDebut: '2026-04-01' }, o).refus).toBeUndefined();
  });
  it('echeances-deplacees', () => {
    expect(apercuChangement(effet, objets()).echeancesDeplacees).toEqual(['e1']);
    expect(apercuChangement({ ...effet, cle: 'inconnue' }, objets()).echeancesDeplacees).toEqual([]);
  });
});

describe('date de clôture', () => {
  it('cloture-changee-exercice-suivant-p23', () => {
    const r = changerDateCloture(cloture());
    expect(r.exerciceEnCours).toEqual({ debut: '2026-01-01', fin: '2026-12-31' });
    expect(r.exerciceSuivant).toEqual({ debut: '2027-01-01', fin: '2027-06-30' });
  });
  it('cloture-exercice-non-fige-autorise', () => {
    const r = changerDateCloture(cloture({ exerciceEnCours: { debut: '2026-01-01', fin: '2026-12-31', datesFigees: false } }));
    expect(r.exerciceEnCours).toEqual({ debut: '2026-01-01', fin: '2026-06-30' });
    expect(r.exerciceSuivant).toBeNull();
  });
  it('duree-hors-bornes-refusee', () => {
    expect(code(() => changerDateCloture(cloture({ dureeMinMois: 7 })))).toBe('duree_exercice_hors_bornes');
    expect(code(() => changerDateCloture(cloture({ dureeMaxMois: 5, dureeMinMois: 1 })))).toBe('duree_exercice_hors_bornes');
    expect(changerDateCloture(cloture({ dureeMinMois: 6, dureeMaxMois: 6 })).exerciceSuivant?.fin).toBe('2027-06-30');
    expect(code(() => changerDateCloture(cloture({ nouvelleFinJourMois: '12-31', dureeMaxMois: 11 })))).toBe('duree_exercice_hors_bornes');
  });
  it('entrees-invalides', () => {
    const e = (f: () => unknown): string | undefined => code(f);
    expect(e(() => apercuChangement({ ...effet, effetDebut: '2026-13-01' }, objets()))).toBe('date_invalide');
    expect(e(() => apercuChangement({ ...effet, effetDebut: '' }, objets()))).toBe('date_invalide');
    expect(e(() => apercuChangement({ ...effet, cle: '' }, objets()))).toBe('cle_invalide');
    expect(e(() => apercuChangement(effet, null as never))).toBe('objets_invalides');
    expect(e(() => apercuChangement(effet, { ...objets(), brouillons: undefined } as never))).toBe('objets_invalides');
    expect(e(() => apercuChangement(effet, objets({ brouillons: [{ id: 'x', date: '2026-02-30' }] })))).toBe('date_invalide');
    const inverse = objets({ declarations: [{ periode: { debut: '2026-05-01', fin: '2026-04-01' }, deposee: false }] });
    expect(e(() => apercuChangement(effet, inverse))).toBe('ordre_inverse');
    expect(apercuChangement(effet, { brouillons: [], declarations: [], echeances: [], ecrituresValidees: [] }).brouillonsRecalcules).toBe(0);
    expect(e(() => changerDateCloture(cloture({ nouvelleFinJourMois: '02-30' })))).toBe('date_invalide');
    expect(e(() => changerDateCloture(cloture({ nouvelleFinJourMois: 'x' })))).toBe('date_invalide');
    expect(e(() => changerDateCloture(cloture({ exerciceEnCours: { debut: '2026-12-31', fin: '2026-01-01', datesFigees: true } })))).toBe('ordre_inverse');
    expect(e(() => changerDateCloture(cloture({ dureeMinMois: Number.NaN })))).toBe('bornes_invalides');
    expect(e(() => changerDateCloture(cloture({ dureeMaxMois: Infinity })))).toBe('bornes_invalides');
    expect(e(() => changerDateCloture(cloture({ dureeMinMois: 2.5 })))).toBe('bornes_invalides');
    expect(e(() => changerDateCloture(cloture({ dureeMinMois: 9, dureeMaxMois: 3 })))).toBe('bornes_invalides');
  });
});
