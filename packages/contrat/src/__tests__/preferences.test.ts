import { describe, expect, it } from 'vitest';
import { genererOpenapi, routesEcritureSansEnTete } from '../openapi.js';
import { creerServicePreferences, ErreurPreference, ErreurUsage } from '../domaines/preferences-service.js';

const T = 1_700_000_000_000;
const ev = [{ type: 'ecran_ouvert', ecran_code: 'tdb' }];

describe('contrat préférences : service en mémoire', () => {
  it('defauts-premier-lancement-elargi', () => {
    const l = creerServicePreferences({ maintenant: () => T }).lire().body;
    expect(l['chat_etat']).toEqual({ valeur: 'elargi', origine: 'defaut' });
  });

  it('derniere-ecriture-gagne-sans-409', () => {
    let t = T;
    const s = creerServicePreferences({ maintenant: () => t });
    s.ecrire('mode', { valeur: 'comptable', appareil: 'tous' }, 'k1');
    t += 10;
    s.ecrire('mode', { valeur: 'simple', appareil: 'tous' }, 'k2');
    expect(s.lire().body['mode']).toEqual({ valeur: 'simple', origine: 'personne' });
  });

  it('idempotency-key-rejouee', () => {
    const s = creerServicePreferences({ maintenant: () => T });
    const un = s.ecrire('mode', { valeur: 'comptable', appareil: 'tous' }, 'k1');
    s.ecrire('mode', { valeur: 'simple', appareil: 'tous' }, 'k2');
    expect(s.ecrire('mode', { valeur: 'comptable', appareil: 'tous' }, 'k1')).toEqual(un);
    expect(s.lire().body['mode']?.valeur).toBe('simple');
  });

  it('cle-inconnue-400', () => {
    const s = creerServicePreferences();
    expect(() => s.ecrire('inconnue', { valeur: 1, appareil: 'tous' }, 'k')).toThrow(ErreurPreference);
    expect(() => s.ecrire('format_nombre', { valeur: 1, appareil: 'tous' }, 'k')).toThrow(expect.objectContaining({ code: 'format_fixe' }));
  });

  it('usage-desactive-rien-ecrit', () => {
    const s = creerServicePreferences({ maintenant: () => T });
    s.enregistrerUsage(ev, 'u1');
    expect(s.mesures()).toEqual([]);
    s.ecrire('usage_mesure', { valeur: 'active', appareil: 'tous' }, 'k');
    s.enregistrerUsage(ev, 'u2');
    s.enregistrerUsage(ev, 'u2');
    expect(s.mesures()).toHaveLength(1);
    expect(s.mesures()[0]).toMatchObject({ type: 'ecran_ouvert', ecran_code: 'tdb' });
    expect(Object.keys(s.mesures()[0] ?? {}).sort()).toEqual(['ecran_code', 'pseudonyme', 'type']);
  });

  it('usage-champ-inconnu-400', () => {
    const s = creerServicePreferences();
    expect(() => s.enregistrerUsage([{ type: 'ecran_ouvert', texte: 'x' }], 'u')).toThrow(ErreurUsage);
  });
});

describe('contrat préférences : routes', () => {
  it('routes-ecriture-avec-en-tete', () => {
    expect(routesEcritureSansEnTete()).toEqual([]);
    const paths = (genererOpenapi() as { paths: Record<string, Record<string, unknown>> }).paths;
    expect(Object.keys(paths['/preferences'] ?? {})).toEqual(['get']);
    expect(Object.keys(paths['/preferences/{cle}'] ?? {})).toEqual(['put']);
    expect(Object.keys(paths['/usage'] ?? {})).toEqual(['post']);
    expect(JSON.stringify(paths['/preferences/{cle}'])).toContain('Idempotency-Key');
    const put = paths['/preferences/{cle}']?.['put'] as { responses: Record<string, unknown> };
    expect(Object.keys(put.responses)).not.toContain('409');
    expect(Object.keys((paths['/usage']?.['post'] as { responses: object }).responses)).toContain('204');
  });
});
