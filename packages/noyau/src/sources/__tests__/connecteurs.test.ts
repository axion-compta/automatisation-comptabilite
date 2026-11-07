import { describe, expect, it } from 'vitest';
import { ErreurConnecteur, bandeau, enregistrerEssai, santeInitiale, type SanteConnecteur, type SeuilsEchecs } from '../connecteurs.js';

// Seuils de test inventés : ce sont des arguments, pas des valeurs de la spec.
const seuils: SeuilsEchecs = { echecsAvantDegrade: 2, echecsAvantPanne: null };
const j = (n: number): string => '2026-05-' + String(n).padStart(2, '0');

function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurConnecteur) return e.code;
    throw e;
  }
  return undefined;
}

/** Enchaîne des essais (un par jour à partir de `debut`) et renvoie les santés successives. */
function suite(oks: boolean[], sx: SeuilsEchecs = seuils, debut = 1): SanteConnecteur[] {
  const out: SanteConnecteur[] = [];
  let s = santeInitiale('sirene');
  oks.forEach((ok, k) => {
    s = enregistrerEssai(s, { jour: j(debut + k), ok }, sx);
    out.push(s);
  });
  return out;
}

describe('connecteurs', () => {
  it('deux-echecs-degrade', () => {
    const [a, b, c] = suite([false, false, false]) as [SanteConnecteur, SanteConnecteur, SanteConnecteur];
    expect(a.etat).toBe('ok');
    expect(b).toEqual({ connecteur: 'sirene', dernierOk: null, dernierEssai: j(2), echecsConsecutifs: 2, etat: 'degrade' });
    expect(bandeau(b)).toBe('connecteur_degrade');
    expect([c.etat, c.echecsConsecutifs]).toEqual(['degrade', 3]);
  });

  it('succes-le-troisieme-jour-bandeau-retire', () => {
    const [, b, c] = suite([false, false, true]) as [SanteConnecteur, SanteConnecteur, SanteConnecteur];
    expect(bandeau(b)).toBe('connecteur_degrade');
    expect(c).toEqual({ connecteur: 'sirene', dernierOk: j(3), dernierEssai: j(3), echecsConsecutifs: 0, etat: 'ok' });
    expect(bandeau(c)).toBeNull();
  });

  it('un-echec-reste-ok', () => {
    const [a] = suite([false]) as [SanteConnecteur];
    expect([a.etat, a.echecsConsecutifs, bandeau(a)]).toEqual(['ok', 1, null]);
    const t = suite([false, true, false])[2] as SanteConnecteur;
    expect([t.etat, t.echecsConsecutifs, t.dernierOk]).toEqual(['ok', 1, j(2)]);
  });

  it('seuil-de-panne-optionnel', () => {
    const deux = { echecsAvantDegrade: 2, echecsAvantPanne: 4 };
    const vus = suite([false, false, false, false, false], deux);
    const dernier = vus[4] as SanteConnecteur;
    expect(vus.map((s) => s.etat)).toEqual(['ok', 'degrade', 'degrade', 'panne', 'panne']);
    expect(bandeau(dernier)).toBe('connecteur_en_panne');
    expect(enregistrerEssai(dernier, { jour: j(6), ok: true }, deux).etat).toBe('ok');
    expect(suite([false, false, false, false, false])[4]?.etat).toBe('degrade');
  });

  it('meme-jour-deux-fois-refuse', () => {
    const s = suite([false])[0] as SanteConnecteur;
    expect(code(() => enregistrerEssai(s, { jour: j(1), ok: false }, seuils))).toBe('meme_jour');
    expect(code(() => enregistrerEssai(s, { jour: j(1), ok: true }, seuils))).toBe('meme_jour');
    expect(code(() => enregistrerEssai(s, { jour: j(2), ok: true }, seuils))).toBeUndefined();
  });

  it('jour-anterieur-refuse', () => {
    const s = suite([true], seuils, 10)[0] as SanteConnecteur;
    expect(code(() => enregistrerEssai(s, { jour: j(9), ok: true }, seuils))).toBe('jour_anterieur');
    expect(code(() => enregistrerEssai(s, { jour: '2026-04-30', ok: false }, seuils))).toBe('jour_anterieur');
  });

  it('seuils-invalides-refuses', () => {
    const s = santeInitiale('sirene');
    const avec = (d: number, p: number | null): string | undefined =>
      code(() => enregistrerEssai(s, { jour: j(1), ok: false }, { echecsAvantDegrade: d, echecsAvantPanne: p }));
    for (const v of [Number.NaN, 0, -1, 1.5, Number.POSITIVE_INFINITY]) {
      expect([avec(v, null), avec(2, v)]).toEqual(['seuil_invalide', 'seuil_invalide']);
    }
    expect([avec(3, 3), avec(3, 2), avec(3, 4)]).toEqual(['seuils_incoherents', 'seuils_incoherents', undefined]);
  });

  it('jour-mal-forme-et-connecteur-vide-refuses', () => {
    const s = santeInitiale('sirene');
    for (const x of ['', '2026-5-1', '01/05/2026', '2026-02-30', '2026-13-01', '2026-05-01T00:00:00Z', 'demain']) {
      expect(code(() => enregistrerEssai(s, { jour: x, ok: true }, seuils))).toBe('jour_invalide');
    }
    expect([code(() => santeInitiale('')), code(() => santeInitiale('   '))]).toEqual(['connecteur_vide', 'connecteur_vide']);
    expect(code(() => enregistrerEssai({ ...s, connecteur: '' }, { jour: j(1), ok: true }, seuils))).toBe('connecteur_vide');
  });

  it('entree-jamais-modifiee', () => {
    const s = Object.freeze(santeInitiale('sirene'));
    const t = enregistrerEssai(s, { jour: j(1), ok: false }, seuils);
    expect(s).toEqual({ connecteur: 'sirene', dernierOk: null, dernierEssai: null, echecsConsecutifs: 0, etat: 'ok' });
    expect(t).not.toBe(s);
  });
});
