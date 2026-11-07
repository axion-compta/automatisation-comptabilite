import { describe, expect, it } from 'vitest';
import { evenementsJournal, recalculerContexte } from '../contexte.js';
import type { Puce } from '../contexte.js';

const SOC_A = 'societe-a';
const SOC_B = 'societe-b';
const TABLE: Record<string, string> = { e1: SOC_A, e2: SOC_A, eb: SOC_B };
const appartenance = (ref: string): string | undefined => TABLE[ref];
const calcul = (puces: Puce[], session = SOC_A, conversation = SOC_A) =>
  recalculerContexte({ puces, societeSession: session, societeConversation: conversation, appartenance });

describe('recalculerContexte', () => {
  it('puces-de-la-societe-gardees', () => {
    const r = calcul([{ ref: 'e1' }, { ref: 'e2' }]);
    expect(r.gardees).toEqual(['e1', 'e2']);
    expect(r.rejets).toEqual([]);
  });

  it('autre-societe-rejetee', () => {
    const r = calcul([{ ref: 'e1' }, { ref: 'eb' }]);
    expect(r.gardees).toEqual(['e1']);
    expect(r.gardees).not.toContain('eb');
    expect(r.rejets).toEqual([{ ref: 'eb', motif: 'autre_societe' }]);
  });

  it('inconnue-rejetee', () => {
    const r = calcul([{ ref: 'zz' }]);
    expect(r.gardees).toEqual([]);
    expect(r.rejets).toEqual([{ ref: 'zz', motif: 'inconnue' }]);
  });

  it('retiree-jamais-envoyee', () => {
    const r = calcul([{ ref: 'e1', retiree: true }, { ref: 'e2', retiree: false }]);
    expect(r.gardees).toEqual(['e2']);
    expect(r.rejets).toEqual([{ ref: 'e1', motif: 'retiree' }]);
    const m = calcul([{ ref: 'e1' }, { ref: 'e1', retiree: true }]);
    expect(m.gardees).toEqual([]);
    expect(m.rejets).toEqual([{ ref: 'e1', motif: 'retiree' }]);
  });

  it('conversation-d-une-autre-societe-refusee', () => {
    expect(() => calcul([{ ref: 'e1' }], SOC_A, SOC_B)).toThrowError(
      expect.objectContaining({ name: 'ErreurChat', code: 'droit_insuffisant' }),
    );
    expect(() => calcul([{ ref: 'eb' }], SOC_B, SOC_A)).toThrow();
  });

  it('doublons-fusionnes', () => {
    const r = calcul([{ ref: 'e1' }, { ref: 'e2' }, { ref: 'e1' }, { ref: 'eb' }, { ref: 'eb' }]);
    expect(r.gardees).toEqual(['e1', 'e2']);
    expect(r.rejets).toEqual([{ ref: 'eb', motif: 'autre_societe' }]);
  });

  it('entrees-vides', () => {
    expect(calcul([])).toEqual({ gardees: [], rejets: [] });
    expect(calcul([{ ref: '' }])).toEqual({ gardees: [], rejets: [{ ref: '', motif: 'inconnue' }] });
    expect(() => calcul([], '', '')).toThrowError(expect.objectContaining({ code: 'droit_insuffisant' }));
    const toutAppartient = recalculerContexte({
      puces: [{ ref: '' }],
      societeSession: SOC_A,
      societeConversation: SOC_A,
      appartenance: () => SOC_A,
    });
    expect(toutAppartient.gardees).toEqual([]);
  });

  it('journal-une-ligne-par-rejet', () => {
    const r = calcul([{ ref: 'eb' }, { ref: 'zz' }, { ref: 'e1', retiree: true }, { ref: 'e2' }]);
    const journal = evenementsJournal(r.rejets);
    expect(journal).toEqual([
      { code: 'chat.contexte_rejete', ref: 'eb', motif: 'autre_societe' },
      { code: 'chat.contexte_rejete', ref: 'zz', motif: 'inconnue' },
      { code: 'chat.contexte_rejete', ref: 'e1', motif: 'retiree' },
    ]);
    expect(Object.keys(journal[0] ?? {}).sort()).toEqual(['code', 'motif', 'ref']);
    expect(evenementsJournal([])).toEqual([]);
  });
});
