import { describe, expect, it } from 'vitest';
import { demarrerNoeud } from '../noeud.js';

describe('faux serveur côté Node', () => {
  it('demarrer-noeud-repond', async () => {
    const noeud = demarrerNoeud({ base: 'http://localhost:3000' });
    try {
      const r = await fetch('http://localhost:3000/exercices');
      expect(r.status).toBe(200);
      const j = (await r.json()) as { body: Array<{ id: string }> };
      expect(j.body.map((e) => e.id)).toEqual(['EX2026', 'EX2025']);
    } finally {
      noeud.fermer();
    }
  });

  it('fermer rend la main : plus de réponse simulée', async () => {
    // Port 1 en local : refus immédiat, rien ne sort de la machine, aucun vrai serveur ne l'occupe.
    const noeud = demarrerNoeud({ base: 'http://127.0.0.1:1' });
    noeud.fermer();
    await expect(fetch('http://127.0.0.1:1/exercices', { signal: AbortSignal.timeout(2000) })).rejects.toThrow();
  });

  it('clé à crochets (classe[]=1, q[a]=b) : 400, écart voulu avec le vrai serveur (L01-T39)', async () => {
    const noeud = demarrerNoeud({ base: 'http://127.0.0.1:1' });
    try {
      for (const q of ['classe[]=1', 'q[a]=b', 'limite[0]=1']) {
        const r = await fetch('http://127.0.0.1:1/exercices/EX2026/plan?' + q);
        expect([q, r.status]).toEqual([q, 400]);
        expect(await r.json()).toMatchObject({ defined: false, code: 'BAD_REQUEST', status: 400 });
      }
    } finally {
      noeud.fermer();
    }
  });

  it('latence : /exercices et /exercices/:exercice/plan attendent latenceMs', async () => {
    const noeud = demarrerNoeud({ base: 'http://127.0.0.1:1', latenceMs: 80 });
    try {
      for (const chemin of ['/exercices', '/exercices/EX2026/plan']) {
        const debut = performance.now();
        const r = await fetch('http://127.0.0.1:1' + chemin);
        expect([chemin, r.status]).toEqual([chemin, 200]);
        expect(performance.now() - debut).toBeGreaterThanOrEqual(70);
      }
    } finally {
      noeud.fermer();
    }
  });
});
