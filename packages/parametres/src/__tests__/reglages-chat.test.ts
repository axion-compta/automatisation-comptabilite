// Fiche L05-T54 : réglages du chat en paramètres datés.
import { describe, expect, it } from 'vitest';
import { ErreurParametre, ParametreLegal } from '../au-jour.js';
import { PARAMETRES_A_MESURER, REGLAGES_CHAT, reglageEntier } from '../reglages-chat.js';

const JOUR = '2026-12-01';
const n = (cle: string) => reglageEntier(cle, JOUR);
const absent = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    expect(e).toBeInstanceOf(ErreurParametre);
    expect((e as ErreurParametre).code).toBe('parametre_absent');
    return;
  }
  throw new Error('parametre_absent attendu');
};

describe('réglages du chat', () => {
  it('chaque-reglage-a-une-source', () => {
    expect(REGLAGES_CHAT).toHaveLength(15);
    for (const p of REGLAGES_CHAT) {
      expect(ParametreLegal.safeParse(p).success).toBe(true);
      expect(p.source).toMatch(/^spec 05/);
      expect(p.effet_fin).toBeNull();
    }
    expect(new Set(REGLAGES_CHAT.map((p) => p.cle)).size).toBe(REGLAGES_CHAT.length);
  });

  it('statut-a-verifier', () => {
    expect(REGLAGES_CHAT.every((p) => p.statut === 'a_verifier')).toBe(true);
  });

  it('valeurs-entieres-positives', () => {
    for (const p of REGLAGES_CHAT) expect(Number.isSafeInteger(n(p.cle)) && n(p.cle) > 0).toBe(true);
    const mauvaises = ['0', '-1', '1.5', 'NaN', 'Infinity', '', '1e3'];
    for (const valeur of mauvaises) absent(() => reglageEntier('chat.x', JOUR, [{ ...REGLAGES_CHAT[0]!, cle: 'chat.x', valeur }]));
  });

  it('ordre-des-seuils-de-volume', () => {
    const [a, r, m, e] = ['annonce', 'recapitulatif', 'max_proposition', 'renvoi_ecran'].map((s) => n(`chat.volume_${s}`));
    expect(a).toBeLessThan(r!);
    expect(r).toBeLessThan(m!);
    expect(m).toBeLessThan(e!);
  });

  it('toast-plus-court-que-l-historique', () => {
    expect(n('chat.annulation_toast_ms')).toBeLessThan(n('chat.annulation_historique_ms'));
  });

  it('plafonds-sans-valeur', () => {
    for (const cle of ['ia.plafond_tour', 'ia.plafond_piece', 'ia.plafond_minute_voix']) expect(PARAMETRES_A_MESURER).toContain(cle);
    expect(PARAMETRES_A_MESURER.some((c) => c.startsWith('ia.tarif_'))).toBe(true);
    for (const cle of PARAMETRES_A_MESURER) {
      expect(REGLAGES_CHAT.some((p) => p.cle === cle)).toBe(false);
      absent(() => n(cle));
      absent(() => reglageEntier(cle, JOUR, [{ ...REGLAGES_CHAT[0]!, cle }]));
    }
  });

  it('cle-inconnue-absente', () => {
    expect(REGLAGES_CHAT.some((p) => p.cle === 'chat.inconnu')).toBe(false);
    absent(() => n('chat.inconnu'));
    absent(() => n(''));
  });

  it('date-avant-effet-absente', () => {
    const debut = REGLAGES_CHAT[0]!.effet_debut;
    expect(reglageEntier(REGLAGES_CHAT[0]!.cle, debut)).toBeGreaterThan(0);
    expect(REGLAGES_CHAT[0]!.effet_debut).toBe('2026-11-05');
    absent(() => reglageEntier(REGLAGES_CHAT[0]!.cle, '2026-11-04'));
  });
});
