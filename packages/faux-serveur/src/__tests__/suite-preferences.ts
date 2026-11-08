import { describe, expect, it } from 'vitest';
import type { Appeler, Cible } from './suite-contrat.js';

const cle = (n: string) => ({ 'idempotency-key': 'cle-fictive-pref-' + n });
type Lecture = Record<string, { valeur: unknown; origine: string }>;

/** Suite commune « préférences » : jouée sur le vrai serveur et sur le faux (la panne réseau n'en fait pas partie). */
export function suitePreferences(nom: string, cible: Cible): void {
  describe('suite preferences commune : ' + nom, () => {
    const avec = async (f: (a: Appeler) => Promise<void>) => {
      const c = await cible();
      try {
        await f(c.appeler);
      } finally {
        await c.fermer();
      }
    };
    const lire = async (a: Appeler, appareil = 'bureau') => ((await a('GET', '/preferences?appareil=' + appareil)).json as { body: Lecture }).body;

    it('défauts : origine « defaut », lecture sans appareil = bureau', () =>
      avec(async (a) => {
        const bureau = await lire(a);
        expect(bureau['mode']).toEqual({ valeur: 'simple', origine: 'defaut' });
        expect(bureau['menu_etat']).toEqual({ valeur: 'ouvert', origine: 'defaut' });
        expect((await a('GET', '/preferences')).json).toEqual({ body: bureau });
      }));

    it('écrit puis relit : valeur et origine « personne »', () =>
      avec(async (a) => {
        const r = await a('PUT', '/preferences/mode', cle('1'), { valeur: 'comptable', appareil: 'tous' });
        expect(r.status).toBe(200);
        expect(r.json).toEqual({ body: { cle: 'mode', appareil: 'tous', valeur: 'comptable', origine: 'personne' } });
        expect((await lire(a))['mode']).toEqual({ valeur: 'comptable', origine: 'personne' });
      }));

    it('clé par appareil : l’écriture mobile ne touche pas le bureau', () =>
      avec(async (a) => {
        await a('PUT', '/preferences/menu_etat', cle('m'), { valeur: 'reduit', appareil: 'mobile' });
        expect((await lire(a, 'mobile'))['menu_etat']).toEqual({ valeur: 'reduit', origine: 'personne' });
        expect((await lire(a))['menu_etat']).toEqual({ valeur: 'ouvert', origine: 'defaut' });
      }));

    it('la dernière écriture gagne', () =>
      avec(async (a) => {
        await a('PUT', '/preferences/mode', cle('a'), { valeur: 'comptable', appareil: 'tous' });
        await a('PUT', '/preferences/mode', cle('b'), { valeur: 'simple', appareil: 'tous' });
        expect((await lire(a))['mode']?.valeur).toBe('simple');
      }));

    it('rejoue la même clé : même réponse, aucune seconde écriture', () =>
      avec(async (a) => {
        const x = await a('PUT', '/preferences/mode', cle('r'), { valeur: 'comptable', appareil: 'tous' });
        const y = await a('PUT', '/preferences/mode', cle('r'), { valeur: 'simple', appareil: 'tous' });
        expect(y.json).toEqual(x.json);
        expect((await lire(a))['mode']?.valeur).toBe('comptable');
      }));

    it('400 : clé d’idempotence absente', () =>
      avec(async (a) => {
        expect((await a('PUT', '/preferences/mode', {}, { valeur: 'comptable', appareil: 'tous' })).status).toBe(400);
        expect((await lire(a))['mode']?.origine).toBe('defaut');
      }));

    it.each([
      ['valeur hors liste', '/preferences/mode', { valeur: 'inconnue', appareil: 'tous' }],
      ['clé inconnue', '/preferences/cle_inconnue', { valeur: 'x', appareil: 'tous' }],
      ['format fixe : clé par appareil sur « tous »', '/preferences/menu_etat', { valeur: 'reduit', appareil: 'tous' }],
      ['appareil inconnu', '/preferences/mode', { valeur: 'simple', appareil: 'tablette' }],
      ['champ en trop', '/preferences/mode', { valeur: 'simple', appareil: 'tous', extra: 1 }],
    ])('400 : %s', (_nom, chemin, corps) =>
      avec(async (a) => {
        expect((await a('PUT', chemin, cle('x'), corps)).status).toBe(400);
      }));

    it('400 : appareil de lecture inconnu', () =>
      avec(async (a) => {
        expect((await a('GET', '/preferences?appareil=tablette')).status).toBe(400);
      }));
  });
}
