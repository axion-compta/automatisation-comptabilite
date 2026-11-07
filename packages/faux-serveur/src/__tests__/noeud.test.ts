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
    const noeud = demarrerNoeud({ base: 'http://localhost:3000' });
    noeud.fermer();
    await expect(fetch('http://localhost:3000/exercices', { signal: AbortSignal.timeout(2000) })).rejects.toThrow();
  });
});
