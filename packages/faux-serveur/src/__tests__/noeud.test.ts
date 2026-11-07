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
    // Base fictive : le test ne dépend pas d'un éventuel vrai serveur sur le port 3000.
    const noeud = demarrerNoeud({ base: 'http://faux.exemple.fr' });
    noeud.fermer();
    await expect(fetch('http://faux.exemple.fr/exercices', { signal: AbortSignal.timeout(2000) })).rejects.toThrow();
  });

  it('latence : /exercices et /exercices/:exercice/plan attendent latenceMs', async () => {
    const noeud = demarrerNoeud({ base: 'http://faux.exemple.fr', latenceMs: 80 });
    try {
      for (const chemin of ['/exercices', '/exercices/EX2026/plan']) {
        const debut = performance.now();
        const r = await fetch('http://faux.exemple.fr' + chemin);
        expect([chemin, r.status]).toEqual([chemin, 200]);
        expect(performance.now() - debut).toBeGreaterThanOrEqual(70);
      }
    } finally {
      noeud.fermer();
    }
  });
});
