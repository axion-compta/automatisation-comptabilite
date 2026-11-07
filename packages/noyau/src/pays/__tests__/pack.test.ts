import { describe, expect, it } from 'vitest';
import { activable, ErreurPays, packPour, paysDisponibles, type PackPays } from '../pack.js';

// Packs fictifs : aucune règle fiscale réelle.
function pack(pays: string, surcharge: Partial<PackPays> = {}): PackPays {
  return {
    pays,
    fichierAudit: 'fec',
    declarations: ['declaration-test'],
    regles: [{ cle: 'regle-1', validateur: 'Camille Fictif' }],
    bancVert: true,
    ...surcharge,
  };
}

function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    expect(e).toBeInstanceOf(ErreurPays);
    return (e as ErreurPays).code;
  }
  return undefined;
}

describe('pack pays', () => {
  it('france-disponible', () => {
    const fr = pack('FR');
    expect(packPour('FR', [fr])).toEqual({ ok: true, pack: fr });
    expect(paysDisponibles([fr])).toEqual(['FR']);
    // Ordre des packs inversé : même résultat.
    const de = pack('DE');
    expect(packPour('FR', [de, fr])).toEqual({ ok: true, pack: fr });
    expect(packPour('FR', [fr, de])).toEqual({ ok: true, pack: fr });
    expect(paysDisponibles([fr, de])).toEqual(['DE', 'FR']);
    expect(paysDisponibles([de, fr])).toEqual(['DE', 'FR']);
  });

  it('belgique-refusee', () => {
    expect(packPour('BE', [pack('FR')])).toEqual({ ok: false, code: 'pays_non_disponible' });
    expect(packPour('FR', [])).toEqual({ ok: false, code: 'pays_non_disponible' });
    expect(paysDisponibles([])).toEqual([]);
  });

  it('code-invalide-refuse', () => {
    for (const c of ['fr', 'FRA', '', 'F', 'F1', '1R', ' FR', 'FR ', 'Fr', 'é', 'FR\n']) {
      expect(packPour(c, [pack('FR')])).toEqual({ ok: false, code: 'pays_invalide' });
    }
    // Un pack au code invalide ne rend pas le code demandé valable.
    expect(packPour('', [pack('')])).toEqual({ ok: false, code: 'pays_invalide' });
    expect(packPour('AA', [pack('AA')]).ok).toBe(true);
    expect(packPour('ZZ', [pack('ZZ')]).ok).toBe(true);
  });

  it('activation-refusee-sans-validateur', () => {
    const p = pack('FR', {
      regles: [
        { cle: 'a', validateur: 'Camille Fictif' },
        { cle: 'b' },
        { cle: 'c', validateur: '  ' },
        { cle: 'd', validateur: '' },
      ],
    });
    expect(activable(p)).toEqual({
      ok: false,
      reglesSansValidateur: ['b', 'c', 'd'],
      bancVert: true,
    });
    expect(activable(pack('FR'))).toEqual({ ok: true });
    expect(activable(pack('FR', { regles: [] }))).toEqual({ ok: true });
  });

  it('activation-refusee-banc-rouge', () => {
    expect(activable(pack('FR', { bancVert: false }))).toEqual({
      ok: false,
      reglesSansValidateur: [],
      bancVert: false,
    });
    expect(activable(pack('FR', { bancVert: false, regles: [{ cle: 'x' }] }))).toEqual({
      ok: false,
      reglesSansValidateur: ['x'],
      bancVert: false,
    });
  });

  it('aucune-deduction-entre-pays', () => {
    const r = packPour('BE', [pack('FR')]);
    expect(r.ok).toBe(false);
    expect('pack' in r).toBe(false);
    expect(paysDisponibles([pack('FR')])).not.toContain('BE');
  });

  it('pays-en-double-refuse', () => {
    const doublon = [pack('FR'), pack('FR', { bancVert: false })];
    expect(code(() => packPour('FR', doublon))).toBe('pays_en_double');
    expect(code(() => packPour('BE', doublon))).toBe('pays_en_double');
    expect(code(() => paysDisponibles(doublon))).toBe('pays_en_double');
    expect(code(() => paysDisponibles([pack('FR'), pack('DE')]))).toBeUndefined();
  });
});
