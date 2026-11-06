import { afterEach, describe, expect, it, vi } from 'vitest';
import { compterEcritures, envoyerEcriture, message, modifierEcriture } from '../api.js';

afterEach(() => vi.unstubAllGlobals());

describe('gestion d\'erreur de l\'écran de test', () => {
  it('réseau coupé : statut 0 et « Erreur réseau. »', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('coupé')));
    const r = await envoyerEcriture('cle-fictive-1', 'Achat fictif', 1250, '');
    expect(r.statut).toBe(0);
    expect(message(r.statut)).toBe('Erreur réseau.');
    expect((await modifierEcriture('cle-fictive-2', 'E1', 1, '')).statut).toBe(0);
    expect(await compterEcritures()).toBeNull();
  });

  it('502 non JSON : corps nul et « Erreur réseau. »', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('<html>erreur</html>', { status: 502 })));
    const r = await envoyerEcriture('cle-fictive-3', 'Achat fictif', 1250, '');
    expect(r).toEqual({ statut: 502, corps: null });
    expect(message(502)).toBe('Erreur réseau.');
    expect(await compterEcritures()).toBeNull();
  });

  it('messages des pannes connues, y compris 409 sur la modification', async () => {
    expect(message(409)).toBe('Conflit de version.');
    expect(message(403)).toBe('Accès refusé.');
    const appels: Array<[string, string | undefined]> = [];
    vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
      appels.push([init.method ?? '', url]);
      return Promise.resolve(Response.json({}, { status: 409 }));
    });
    expect((await modifierEcriture('cle-fictive-4', 'E1', 1, '409')).statut).toBe(409);
    expect(appels).toEqual([['PUT', '/ecritures/E1']]);
  });
});
