import { describe, expect, it } from 'vitest';
import { AntivirusService, type ServiceAnalyse } from '../antivirus.js';

const DELAI_MS = 'xxxxx'.length;
const PIECE = new TextEncoder().encode('piece-fictive');
const fixe = (reponse: unknown): ServiceAnalyse => ({ analyser: async () => reponse });
const enPanne: ServiceAnalyse = { analyser: async () => { throw new Error('panne injectée'); } };
const muet: ServiceAnalyse = { analyser: () => new Promise<unknown>(() => undefined) };

describe('AntivirusService', () => {
  it('antivirus-indetermine-si-service-absent', async () => {
    expect(await new AntivirusService(undefined, DELAI_MS).analyser(PIECE)).toBe('indetermine');
    expect(await new AntivirusService(null, DELAI_MS).analyser(PIECE)).toBe('indetermine');
    expect(await new AntivirusService(enPanne, DELAI_MS).analyser(PIECE)).toBe('indetermine');
    for (const delai of [Number.NaN, Number.POSITIVE_INFINITY, 0, -DELAI_MS]) {
      expect(await new AntivirusService(fixe('sain'), delai).analyser(PIECE)).toBe('indetermine');
    }
  });

  it('verdicts-repris', async () => {
    expect(await new AntivirusService(fixe('sain'), DELAI_MS).analyser(PIECE)).toBe('sain');
    expect(await new AntivirusService(fixe('infecte'), DELAI_MS).analyser(PIECE)).toBe('infecte');
    expect(await new AntivirusService(fixe('indetermine'), DELAI_MS).analyser(PIECE)).toBe('indetermine');
  });

  it('delai-depasse-indetermine', async () => {
    let signal: AbortSignal | undefined;
    const service: ServiceAnalyse = { analyser: (_o, s) => { signal = s; return muet.analyser(_o, s); } };
    expect(await new AntivirusService(service, DELAI_MS).analyser(PIECE)).toBe('indetermine');
    expect(signal?.aborted).toBe(true);
  });

  it('reponse-inconnue-indetermine', async () => {
    for (const r of [undefined, null, '', 'SAIN', 'propre', 'sain ', 0, true, ['sain'], { verdict: 'sain' }]) {
      expect(await new AntivirusService(fixe(r), DELAI_MS).analyser(PIECE)).toBe('indetermine');
    }
  });

  it('octets-non-modifies', async () => {
    const entree = PIECE.slice();
    const service: ServiceAnalyse = { analyser: async (o) => { o.fill(0); return 'sain'; } };
    await new AntivirusService(service, DELAI_MS).analyser(entree);
    expect(entree).toEqual(PIECE);
  });
});
