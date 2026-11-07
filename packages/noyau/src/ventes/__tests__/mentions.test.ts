import { describe, expect, it } from 'vitest';
import { controlerMentions } from '../mentions.js';
import type { MentionRequise } from '../mentions.js';
import type { Centimes } from '../../argent/index.js';

const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
};
const C = (n: number): Centimes => n as Centimes;
const SEUIL = 15000;
const REQ: MentionRequise[] = [
  { code: 'fictif.mention_a', condition: 'toujours' },
  { code: 'fictif.indemnite', condition: 'client_professionnel' },
  { code: 'fictif.franchise', condition: 'franchise' },
  { code: 'fictif.gros', condition: 'ht_au_dessus', seuilHt: C(SEUIL) },
];
const ctx = { natureClient: 'professionnel' as const, franchise: true, htCentimes: C(SEUIL + 1) };
const tout = { 'fictif.mention_a': 'presente', 'fictif.indemnite': 'presente', 'fictif.franchise': 'presente', 'fictif.gros': 'presente' } as const;
const etats = (r: ReturnType<typeof controlerMentions>): string[] => r.resultats.map((x) => x.etat);

describe('mentions', () => {
  it('toutes-presentes', () => {
    const r = controlerMentions({ requises: REQ, lues: tout, contexte: ctx });
    expect(etats(r)).toEqual(['presente', 'presente', 'presente', 'presente']);
    expect(r.resultats.map((x) => x.code)).toEqual(REQ.map((x) => x.code));
    expect(r).toMatchObject({ cartes: [], bloque: false, parametreAbsent: false });
  });

  it('mention-absente-carte', () => {
    const r = controlerMentions({ requises: REQ, lues: { ...tout, 'fictif.mention_a': 'absente' }, contexte: ctx });
    expect(r.cartes).toEqual([{ code: 'fictif.mention_a' }]);
    expect(r.resultats[0]?.etat).toBe('absente');
    const sans: Record<string, 'presente'> = { ...tout };
    delete (sans as Record<string, unknown>)['fictif.mention_a'];
    expect(controlerMentions({ requises: REQ, lues: sans, contexte: ctx }).resultats[0]?.etat).toBe('absente');
  });

  it('mention-illisible-carte', () => {
    const r = controlerMentions({ requises: REQ, lues: { ...tout, 'fictif.indemnite': 'illisible' }, contexte: ctx });
    expect(r.cartes).toEqual([{ code: 'fictif.indemnite' }]);
    expect(r.resultats[1]?.etat).toBe('illisible');
  });

  it('v10-franchise-a7', () => {
    const r = controlerMentions({ requises: REQ, lues: { ...tout, 'fictif.franchise': 'absente' }, contexte: ctx });
    expect(r.cartes).toEqual([{ code: 'fictif.franchise', anomalie: 'A7' }]);
    const hors = controlerMentions({ requises: REQ, lues: { ...tout, 'fictif.franchise': 'absente' }, contexte: { ...ctx, franchise: false } });
    expect(hors.cartes).toEqual([]);
    expect(hors.resultats[2]?.etat).toBe('non_exigee');
  });

  it('particulier-indemnite-non-exigee', () => {
    for (const natureClient of ['particulier', 'a_confirmer'] as const) {
      const r = controlerMentions({ requises: REQ, lues: { ...tout, 'fictif.indemnite': 'absente' }, contexte: { ...ctx, natureClient } });
      expect(r.resultats[1]?.etat).toBe('non_exigee');
      expect(r.cartes).toEqual([]);
    }
  });

  it('seuil-ht-au-dessus-egal-en-dessous', () => {
    const lues = { ...tout, 'fictif.gros': 'absente' } as const;
    const etat = (htCentimes: number): string | undefined => controlerMentions({ requises: REQ, lues, contexte: { ...ctx, htCentimes: C(htCentimes) } }).resultats[3]?.etat;
    expect(etat(SEUIL + 1)).toBe('absente');
    expect(etat(SEUIL)).toBe('non_exigee');
    expect(etat(SEUIL - 1)).toBe('non_exigee');
    expect(etat(-SEUIL - 1)).toBe('non_exigee');
  });

  it('parametre-absent', () => {
    const r = controlerMentions({ requises: undefined, lues: tout, contexte: ctx });
    expect(r).toEqual({ resultats: [], cartes: [], bloque: false, parametreAbsent: true });
    const vide = controlerMentions({ requises: [], lues: {}, contexte: ctx });
    expect(vide).toEqual({ resultats: [], cartes: [], bloque: false, parametreAbsent: false });
  });

  it('code-lu-inconnu-ignore', () => {
    const r = controlerMentions({ requises: REQ, lues: { ...tout, 'fictif.inconnue': 'absente' as const, toString: 'absente' as const }, contexte: ctx });
    expect(r.resultats).toHaveLength(REQ.length);
    expect(r.cartes).toEqual([]);
    const proto = controlerMentions({ requises: [{ code: 'toString', condition: 'toujours' }], lues: {}, contexte: ctx });
    expect(proto.resultats[0]?.etat).toBe('absente');
  });

  it('jamais-bloquant', () => {
    const r = controlerMentions({ requises: REQ, lues: {}, contexte: ctx });
    expect(etats(r)).toEqual(['absente', 'absente', 'absente', 'absente']);
    expect(r.cartes).toHaveLength(REQ.length);
    expect(r.cartes[2]?.anomalie).toBe('A7');
    expect(r.bloque).toBe(false);
  });

  it('entrees-invalides', () => {
    const ht = (htCentimes: number): string | undefined => code(() => controlerMentions({ requises: REQ, lues: {}, contexte: { ...ctx, htCentimes: C(htCentimes) } }));
    for (const n of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 1.5]) expect(ht(n)).toBe('entree_invalide');
    expect(ht(0)).toBeUndefined();
    const seuil = (seuilHt: number | undefined): string | undefined => code(() => controlerMentions({ requises: [{ code: 'x', condition: 'ht_au_dessus', seuilHt: seuilHt === undefined ? undefined : C(seuilHt) }], lues: {}, contexte: ctx }));
    for (const n of [Number.NaN, Number.POSITIVE_INFINITY, 1.5, undefined]) expect(seuil(n)).toBe('entree_invalide');
    expect(seuil(0)).toBeUndefined();
    expect(code(() => controlerMentions({ requises: [{ code: 'x', condition: 'inconnue' as never }], lues: {}, contexte: ctx }))).toBe('entree_invalide');
  });
});
