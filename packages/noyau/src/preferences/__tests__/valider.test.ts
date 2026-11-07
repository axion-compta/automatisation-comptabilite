import { describe, expect, it } from 'vitest';
import { ErreurPreference, validerPreference } from '../valider.js';

const reservees = ['k', 'j'];

function code(cle: string, valeur: unknown, appareil: string, lettres: string[] = reservees): string | undefined {
  try {
    validerPreference(cle, valeur, appareil, { lettresReservees: lettres });
    return undefined;
  } catch (e) {
    return e instanceof ErreurPreference ? e.code : 'autre';
  }
}

describe('preferences : validation', () => {
  it('cle-inconnue-refusee', () => {
    expect(code('inconnue', 'x', 'tous')).toBe('preference_invalide');
    expect(code('', 'x', 'tous')).toBe('preference_invalide');
    expect(code('constructor', 'x', 'tous')).toBe('preference_invalide');
    expect(code('__proto__', {}, 'tous')).toBe('preference_invalide');
    expect(code('toString', 'x', 'tous')).toBe('preference_invalide');
    expect(code('mode', 'simple', 'tous')).toBeUndefined();
  });

  it('format-nombre-format-fixe', () => {
    for (const v of ['point', 'virgule', '', undefined, null, 1]) {
      expect(code('format_nombre', v, 'tous')).toBe('format_fixe');
      expect(code('format_nombre', v, 'bureau')).toBe('format_fixe');
    }
  });

  it('menu-etat-par-appareil', () => {
    expect(validerPreference('menu_etat', 'reduit', 'mobile')).toEqual({ cle: 'menu_etat', valeur: 'reduit', appareil: 'mobile' });
    expect(validerPreference('menu_etat', 'ouvert', 'bureau')).toEqual({ cle: 'menu_etat', valeur: 'ouvert', appareil: 'bureau' });
    expect(code('menu_etat', 'ferme', 'bureau')).toBe('preference_invalide');
    expect(code('menu_etat', undefined, 'bureau')).toBe('preference_invalide');
    expect(code('menu_etat', 'Ouvert', 'bureau')).toBe('preference_invalide');
    for (const v of ['reduit', 'normal', 'elargi', 'plein']) expect(code('chat_etat', v, 'bureau')).toBeUndefined();
    expect(code('chat_etat', 'ouvert', 'bureau')).toBe('preference_invalide');
    expect(validerPreference('mode', 'comptable', 'tous').valeur).toBe('comptable');
    expect(code('mode', 'expert', 'tous')).toBe('preference_invalide');
    expect(code('usage_mesure', 'active', 'tous')).toBeUndefined();
    expect(code('usage_mesure', 'desactivee', 'tous')).toBeUndefined();
    expect(code('usage_mesure', 'oui', 'tous')).toBe('preference_invalide');
    expect(validerPreference('premier_lancement', { termine: true }, 'tous').valeur).toEqual({ termine: true });
    expect(code('premier_lancement', { termine: 'oui' }, 'tous')).toBe('preference_invalide');
  });

  it('appareil-incoherent-refuse', () => {
    expect(code('menu_etat', 'ouvert', 'tous')).toBe('preference_invalide');
    expect(code('chat_etat', 'normal', 'tous')).toBe('preference_invalide');
    expect(code('chat_largeur_pct', 30, 'tous')).toBe('preference_invalide');
    expect(code('mode', 'simple', 'bureau')).toBe('preference_invalide');
    expect(code('mode', 'simple', 'mobile')).toBe('preference_invalide');
    expect(code('usage_mesure', 'active', 'bureau')).toBe('preference_invalide');
    expect(code('menu_etat', 'ouvert', 'tablette')).toBe('preference_invalide');
    expect(code('menu_etat', 'ouvert', '')).toBe('preference_invalide');
  });

  it('largeur-ramenee-a-la-borne', () => {
    expect(validerPreference('chat_largeur_pct', 10, 'bureau').valeur).toBe(20);
    expect(validerPreference('chat_largeur_pct', 80, 'bureau').valeur).toBe(50);
    expect(validerPreference('chat_largeur_pct', 20, 'bureau').valeur).toBe(20);
    expect(validerPreference('chat_largeur_pct', 50, 'mobile').valeur).toBe(50);
    expect(validerPreference('chat_largeur_pct', 35, 'bureau').valeur).toBe(35);
    expect(validerPreference('chat_largeur_pct', 19, 'bureau').valeur).toBe(20);
    expect(validerPreference('chat_largeur_pct', 51, 'bureau').valeur).toBe(50);
    expect(validerPreference('chat_largeur_pct', -5, 'bureau').valeur).toBe(20);
    expect(validerPreference('chat_largeur_pct', 0, 'bureau').valeur).toBe(20);
  });

  it('largeur-non-entiere-refusee', () => {
    for (const v of [33.5, NaN, Infinity, -Infinity, '30', null, undefined, true, [30], { v: 30 }]) {
      expect(code('chat_largeur_pct', v, 'bureau')).toBe('preference_invalide');
    }
  });

  it('heure-resume-bornes', () => {
    const ok = (heure: string) => code('resume_email', { actif: true, heure }, 'tous');
    expect(ok('00:00')).toBeUndefined();
    expect(ok('23:59')).toBeUndefined();
    expect(ok('07:30')).toBeUndefined();
    for (const h of ['24:00', '7:30', '07:60', '23:60', '-1:00', '07:3', '0730', '07:30:00', ' 07:30', '07:30\n', '']) {
      expect(ok(h)).toBe('preference_invalide');
    }
    expect(code('resume_email', { actif: true, heure: 730 }, 'tous')).toBe('preference_invalide');
    expect(code('resume_email', { actif: 'oui', heure: '07:30' }, 'tous')).toBe('preference_invalide');
    expect(code('resume_email', { actif: true }, 'tous')).toBe('preference_invalide');
    expect(code('resume_email', { heure: '07:30' }, 'tous')).toBe('preference_invalide');
    expect(validerPreference('resume_email', { actif: false, heure: '18:05' }, 'tous').valeur).toEqual({ actif: false, heure: '18:05' });
  });

  it('categories-doublon-refusees', () => {
    expect(validerPreference('notif_categories', ['a_valider', 'urgent'], 'tous').valeur).toEqual(['a_valider', 'urgent']);
    expect(validerPreference('notif_categories', [], 'tous').valeur).toEqual([]);
    expect(code('notif_categories', ['a_valider', 'a_valider'], 'tous')).toBe('preference_invalide');
    expect(code('notif_categories', ['echeance', 'cabinet', 'echeance'], 'tous')).toBe('preference_invalide');
    expect(code('notif_categories', ['autre'], 'tous')).toBe('preference_invalide');
    expect(code('notif_categories', 'urgent', 'tous')).toBe('preference_invalide');
    expect(code('notif_categories', [1], 'tous')).toBe('preference_invalide');
    expect(code('notif_categories', { 0: 'urgent', length: 1 }, 'tous')).toBe('preference_invalide');
    for (const c of ['a_valider', 'echeance', 'urgent', 'cabinet']) expect(code('notif_categories', [c], 'tous')).toBeUndefined();
  });

  it('raccourci-doublon-ou-reserve-refuse', () => {
    const r = (remap: unknown, lettres = reservees) => code('raccourcis', { actifs: true, remap }, 'tous', lettres);
    expect(r({ valider: 'v', exporter: 'e' })).toBeUndefined();
    expect(r({})).toBeUndefined();
    expect(r({ valider: 'v', exporter: 'v' })).toBe('raccourci_invalide');
    expect(r({ valider: 'k' })).toBe('raccourci_invalide');
    expect(r({ valider: 'j' })).toBe('raccourci_invalide');
    expect(r({ valider: 'k' }, [])).toBeUndefined();
    expect(r({ valider: 'v' }, ['v'])).toBe('raccourci_invalide');
    expect(r([['valider', 'v']])).toBe('preference_invalide');
    expect(r('v')).toBe('preference_invalide');
    expect(r(null)).toBe('preference_invalide');
    expect(validerPreference('raccourcis', { actifs: false, remap: { a: 'x' } }, 'tous', { lettresReservees: [] }).valeur).toEqual({
      actifs: false,
      remap: { a: 'x' },
    });
  });

  it('raccourci-majuscule-ou-chiffre-refuse', () => {
    const r = (lettre: unknown) => code('raccourcis', { actifs: true, remap: { valider: lettre } }, 'tous');
    for (const l of ['V', '1', 'ab', '', ' ', 'é', 'é'.normalize('NFD'), '-', 5, null, undefined, ['v']]) {
      expect(r(l)).toBe('raccourci_invalide');
    }
    expect(r('a')).toBeUndefined();
    expect(r('z')).toBeUndefined();
    expect(code('raccourcis', { actifs: 'oui', remap: {} }, 'tous')).toBe('preference_invalide');
  });

  it('propriete-en-trop-refusee', () => {
    expect(code('raccourcis', { actifs: true, remap: {}, cache: 1 }, 'tous')).toBe('preference_invalide');
    expect(code('resume_email', { actif: true, heure: '07:30', x: 1 }, 'tous')).toBe('preference_invalide');
    expect(code('premier_lancement', { termine: true, etape: 2 }, 'tous')).toBe('preference_invalide');
    expect(code('premier_lancement', {}, 'tous')).toBe('preference_invalide');
    expect(code('premier_lancement', null, 'tous')).toBe('preference_invalide');
    expect(code('premier_lancement', [], 'tous')).toBe('preference_invalide');
    expect(code('premier_lancement', true, 'tous')).toBe('preference_invalide');
    // la valeur rendue ne contient que les champs connus
    const v = validerPreference('premier_lancement', { termine: false }, 'tous').valeur;
    expect(Object.keys(v as object)).toEqual(['termine']);
  });
});
