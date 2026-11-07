import { describe, expect, it } from 'vitest';
import {
  ErreurConnecteur,
  bandeau,
  enregistrerEssai,
  santeInitiale,
  type SanteConnecteur,
  type SeuilsEchecs,
} from '../connecteurs.js';

// Seuils de test inventés : ce sont des arguments, pas des valeurs de la spec.
const seuils: SeuilsEchecs = { echecsAvantDegrade: 2, echecsAvantPanne: null };

function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurConnecteur) return e.code;
    throw e;
  }
  return undefined;
}

describe('connecteurs', () => {
  it('deux-echecs-degrade', () => {
    let s = santeInitiale('sirene');
    s = enregistrerEssai(s, { jour: '2026-05-01', ok: false }, seuils);
    expect(s.etat).toBe('ok');
    s = enregistrerEssai(s, { jour: '2026-05-02', ok: false }, seuils);
    expect(s).toEqual({ connecteur: 'sirene', dernierOk: null, dernierEssai: '2026-05-02', echecsConsecutifs: 2, etat: 'degrade' });
    expect(bandeau(s)).toBe('connecteur_degrade');
    // Un troisième échec reste dégradé sans seuil de panne.
    s = enregistrerEssai(s, { jour: '2026-05-03', ok: false }, seuils);
    expect(s.etat).toBe('degrade');
    expect(s.echecsConsecutifs).toBe(3);
  });

  it('succes-le-troisieme-jour-bandeau-retire', () => {
    let s = santeInitiale('sirene');
    s = enregistrerEssai(s, { jour: '2026-05-01', ok: false }, seuils);
    s = enregistrerEssai(s, { jour: '2026-05-02', ok: false }, seuils);
    expect(bandeau(s)).toBe('connecteur_degrade');
    s = enregistrerEssai(s, { jour: '2026-05-03', ok: true }, seuils);
    expect(s).toEqual({ connecteur: 'sirene', dernierOk: '2026-05-03', dernierEssai: '2026-05-03', echecsConsecutifs: 0, etat: 'ok' });
    expect(bandeau(s)).toBeNull();
  });

  it('un-echec-reste-ok', () => {
    const s = enregistrerEssai(santeInitiale('sirene'), { jour: '2026-05-01', ok: false }, seuils);
    expect(s.etat).toBe('ok');
    expect(s.echecsConsecutifs).toBe(1);
    expect(bandeau(s)).toBeNull();
    // Un succès entre deux échecs remet le compteur à zéro : pas de dégradation.
    let t = enregistrerEssai(santeInitiale('sirene'), { jour: '2026-05-01', ok: false }, seuils);
    t = enregistrerEssai(t, { jour: '2026-05-02', ok: true }, seuils);
    t = enregistrerEssai(t, { jour: '2026-05-03', ok: false }, seuils);
    expect(t.etat).toBe('ok');
    expect(t.echecsConsecutifs).toBe(1);
    expect(t.dernierOk).toBe('2026-05-02');
  });

  it('seuil-de-panne-optionnel', () => {
    const deux = { echecsAvantDegrade: 2, echecsAvantPanne: 4 };
    let s = santeInitiale('sirene');
    const etats: string[] = [];
    for (let k = 1; k <= 5; k++) {
      s = enregistrerEssai(s, { jour: '2026-05-0' + String(k), ok: false }, deux);
      etats.push(s.etat);
    }
    expect(etats).toEqual(['ok', 'degrade', 'degrade', 'panne', 'panne']);
    expect(bandeau(s)).toBe('connecteur_en_panne');
    // Un succès sort de la panne.
    expect(enregistrerEssai(s, { jour: '2026-05-06', ok: true }, deux).etat).toBe('ok');
    // Seuil de panne absent : jamais de panne.
    let t = santeInitiale('sirene');
    for (let k = 1; k <= 5; k++) t = enregistrerEssai(t, { jour: '2026-05-0' + String(k), ok: false }, seuils);
    expect(t.etat).toBe('degrade');
  });

  it('meme-jour-deux-fois-refuse', () => {
    const s = enregistrerEssai(santeInitiale('sirene'), { jour: '2026-05-01', ok: false }, seuils);
    expect(code(() => enregistrerEssai(s, { jour: '2026-05-01', ok: false }, seuils))).toBe('meme_jour');
    expect(code(() => enregistrerEssai(s, { jour: '2026-05-01', ok: true }, seuils))).toBe('meme_jour');
    expect(code(() => enregistrerEssai(s, { jour: '2026-05-02', ok: true }, seuils))).toBeUndefined();
  });

  it('jour-anterieur-refuse', () => {
    const s = enregistrerEssai(santeInitiale('sirene'), { jour: '2026-05-10', ok: true }, seuils);
    expect(code(() => enregistrerEssai(s, { jour: '2026-05-09', ok: true }, seuils))).toBe('jour_anterieur');
    expect(code(() => enregistrerEssai(s, { jour: '2026-04-30', ok: false }, seuils))).toBe('jour_anterieur');
  });

  it('seuils-invalides-refuses', () => {
    const s = santeInitiale('sirene');
    const essai = { jour: '2026-05-01', ok: false };
    for (const v of [Number.NaN, 0, -1, 1.5, Number.POSITIVE_INFINITY]) {
      expect(code(() => enregistrerEssai(s, essai, { echecsAvantDegrade: v, echecsAvantPanne: null }))).toBe('seuil_invalide');
      expect(code(() => enregistrerEssai(s, essai, { echecsAvantDegrade: 2, echecsAvantPanne: v }))).toBe('seuil_invalide');
    }
    expect(code(() => enregistrerEssai(s, essai, { echecsAvantDegrade: 3, echecsAvantPanne: 3 }))).toBe('seuils_incoherents');
    expect(code(() => enregistrerEssai(s, essai, { echecsAvantDegrade: 3, echecsAvantPanne: 2 }))).toBe('seuils_incoherents');
    expect(code(() => enregistrerEssai(s, essai, { echecsAvantDegrade: 3, echecsAvantPanne: 4 }))).toBeUndefined();
  });

  it('jour-mal-forme-et-connecteur-vide-refuses', () => {
    const s = santeInitiale('sirene');
    for (const j of ['', '2026-5-1', '01/05/2026', '2026-02-30', '2026-13-01', '2026-05-01T00:00:00Z', 'demain']) {
      expect(code(() => enregistrerEssai(s, { jour: j, ok: true }, seuils))).toBe('jour_invalide');
    }
    expect(code(() => santeInitiale(''))).toBe('connecteur_vide');
    expect(code(() => santeInitiale('   '))).toBe('connecteur_vide');
    const vide: SanteConnecteur = { ...s, connecteur: '' };
    expect(code(() => enregistrerEssai(vide, { jour: '2026-05-01', ok: true }, seuils))).toBe('connecteur_vide');
  });

  it('entree-jamais-modifiee', () => {
    const s = Object.freeze(santeInitiale('sirene'));
    const t = enregistrerEssai(s, { jour: '2026-05-01', ok: false }, seuils);
    expect(s).toEqual({ connecteur: 'sirene', dernierOk: null, dernierEssai: null, echecsConsecutifs: 0, etat: 'ok' });
    expect(t).not.toBe(s);
  });
});
