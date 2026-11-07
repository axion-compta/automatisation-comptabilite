import { describe, expect, it } from 'vitest';
import {
  ErreurCache,
  aDemander,
  alerteIdentifiants,
  carteEtablissement,
  lireCache,
  mettreEnCache,
  repliPanne,
  type Calendrier,
  type EntreeCache,
} from '../sirene-cache.js';

// Calendrier de test : jours civils en UTC, dates inventées.
const cal: Calendrier = {
  ajouterJours(date, n) {
    const d = new Date(date + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  },
};

function entree(numero: string, luLe = '2026-03-01T10:00:00Z', expireLe = '2026-03-02T10:00:00Z'): EntreeCache {
  return { numero, reponse: { nom: 'Société Exemple ' + numero }, etat: 'actif', luLe, expireLe };
}

function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurCache) return e.code;
    throw e;
  }
  return undefined;
}

describe('sirene-cache', () => {
  it('second-import-zero-requete', () => {
    const numeros = ['123456782', '987654321', '123456782'];
    const premier = aDemander(numeros, [], '2026-03-01T10:00:00Z');
    expect(premier).toEqual(['123456782', '987654321']);
    let cache: readonly EntreeCache[] = [];
    for (const n of premier) cache = mettreEnCache(cache, entree(n));
    expect(aDemander(numeros, cache, '2026-03-01T12:00:00Z')).toEqual([]);
    expect(lireCache(cache, '987654321', '2026-03-01T12:00:00Z')).toEqual({ etat: 'frais', entree: entree('987654321') });
    expect(aDemander([], cache, '2026-03-01T12:00:00Z')).toEqual([]);
  });

  it('entree-expiree-redemandee', () => {
    const cache = [entree('111111118'), entree('222222226', '2026-03-01T10:00:00Z', '2026-03-05T10:00:00Z')];
    expect(aDemander(['222222226', '111111118', '333333334', '111111118'], cache, '2026-03-03T00:00:00Z')).toEqual([
      '111111118',
      '333333334',
    ]);
    expect(lireCache(cache, '111111118', '2026-03-03T00:00:00Z')).toEqual({ etat: 'expire' });
    expect(lireCache(cache, '333333334', '2026-03-03T00:00:00Z')).toEqual({ etat: 'absent' });
    expect(lireCache([], '333333334', '2026-03-03T00:00:00Z')).toEqual({ etat: 'absent' });
  });

  it('expiration-a-l-instant-exact', () => {
    const cache = [entree('111111118')];
    expect(lireCache(cache, '111111118', '2026-03-02T09:59:59Z').etat).toBe('frais');
    expect(lireCache(cache, '111111118', '2026-03-02T10:00:00Z').etat).toBe('expire');
    expect(aDemander(['111111118'], cache, '2026-03-02T10:00:00Z')).toEqual(['111111118']);
    expect(aDemander(['111111118'], cache, '2026-03-02T09:59:59Z')).toEqual([]);
  });

  it('etablissement-ferme-carte', () => {
    expect(carteEtablissement({ ...entree('111111118'), etat: 'ferme' })).toBe('etablissement_ferme');
    expect(carteEtablissement(entree('111111118'))).toBeNull();
    expect(code(() => carteEtablissement({ ...entree('111111118'), etat: 'inconnu' as 'actif' }))).toBe('entree_invalide');
  });

  it('identifiants-a-29-jours-alerte', () => {
    const e = '2026-06-30';
    expect(alerteIdentifiants({ echeance: e, maintenant: cal.ajouterJours(e, -29), joursAvant: 30 }, cal)).toBe(true);
    // À la limite exacte (30 jours) l'alerte part.
    expect(alerteIdentifiants({ echeance: e, maintenant: cal.ajouterJours(e, -30), joursAvant: 30 }, cal)).toBe(true);
  });

  it('identifiants-a-31-jours-pas-d-alerte', () => {
    const e = '2026-06-30';
    expect(alerteIdentifiants({ echeance: e, maintenant: cal.ajouterJours(e, -31), joursAvant: 30 }, cal)).toBe(false);
    // Échéance dépassée : alerte.
    expect(alerteIdentifiants({ echeance: e, maintenant: cal.ajouterJours(e, 2), joursAvant: 30 }, cal)).toBe(true);
    expect(alerteIdentifiants({ echeance: e, maintenant: cal.ajouterJours(e, -5), joursAvant: 0 }, cal)).toBe(false);
    expect(alerteIdentifiants({ echeance: e, maintenant: e, joursAvant: 0 }, cal)).toBe(true);
  });

  it('panne-saisie-manuelle-rien-de-bloque', () => {
    expect(repliPanne()).toEqual({ saisieManuelle: true, bloque: false });
  });

  it('jours-avant-invalide-refuse', () => {
    for (const v of [Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY]) {
      expect(code(() => alerteIdentifiants({ echeance: '2026-06-30', maintenant: '2026-06-01', joursAvant: v }, cal))).toBe(
        'jours_invalides',
      );
    }
  });

  it('format-mal-forme-refuse', () => {
    const cache = [entree('111111118')];
    for (const mauvais of ['', '2026-3-2', '02/03/2026', '2026-13-01', '2026-02-30', '2026-03-02 10:00:00', 'hier', '2026-03-02T10:00Z', '2026-03-02T25:00:00Z']) {
      expect(code(() => lireCache(cache, '111111118', mauvais))).toBe('date_invalide');
      expect(code(() => aDemander(['111111118'], cache, mauvais))).toBe('date_invalide');
      expect(code(() => alerteIdentifiants({ echeance: '2026-06-30', maintenant: mauvais, joursAvant: 30 }, cal))).toBe('date_invalide');
      expect(code(() => alerteIdentifiants({ echeance: mauvais, maintenant: '2026-06-01', joursAvant: 30 }, cal))).toBe('date_invalide');
      expect(code(() => mettreEnCache([], entree('111111118', mauvais)))).toBe('date_invalide');
      expect(code(() => mettreEnCache([], entree('111111118', '2026-03-01T10:00:00Z', mauvais)))).toBe('date_invalide');
    }
    expect(code(() => lireCache(cache, '111111118', '2026-03-02'))).toBeUndefined();
  });

  it('expire-avant-lu-refuse-et-numero-vide-refuse', () => {
    expect(code(() => mettreEnCache([], entree('111111118', '2026-03-02T10:00:00Z', '2026-03-01T10:00:00Z')))).toBe('ordre_inverse');
    expect(code(() => mettreEnCache([], entree('111111118', '2026-03-02T10:00:00Z', '2026-03-02T10:00:00Z')))).toBeUndefined();
    expect(code(() => mettreEnCache([], entree('')))).toBe('numero_invalide');
    expect(code(() => lireCache([], '', '2026-03-02'))).toBe('numero_invalide');
    expect(code(() => aDemander([''], [], '2026-03-02'))).toBe('numero_invalide');
    expect(code(() => lireCache([entree('111111118', '2026-03-02T10:00:00Z', '2026-03-01T10:00:00Z')], '111111118', '2026-03-02'))).toBe(
      'ordre_inverse',
    );
  });

  it('mettre-en-cache-remplace-sans-modifier-l-entree', () => {
    const ancien = Object.freeze([Object.freeze(entree('111111118')), Object.freeze(entree('222222226'))]);
    const neuf = Object.freeze({ ...entree('111111118', '2026-03-05T10:00:00Z', '2026-03-06T10:00:00Z'), etat: 'ferme' as const });
    const apres = mettreEnCache(ancien, neuf);
    expect(apres).toHaveLength(2);
    expect(apres[0]).toEqual(neuf);
    expect(apres[0]).not.toBe(neuf);
    expect(apres[1]).toEqual(entree('222222226'));
    expect(ancien[0]).toEqual(entree('111111118'));
    expect(neuf.etat).toBe('ferme');
    expect(mettreEnCache([], entree('333333334'))).toEqual([entree('333333334')]);
  });
});
