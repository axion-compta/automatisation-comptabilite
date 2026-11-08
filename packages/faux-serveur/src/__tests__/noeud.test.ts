import { describe, expect, it } from 'vitest';
import { demarrerNoeud } from '../noeud.js';
import { DecodeurFlux } from '../../../contrat/src/chat/flux.js';

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

describe('faux serveur du chat côté Node', () => {
  const B = 'http://127.0.0.1:1';
  const poster = (chemin: string, corps?: unknown, entetes: Record<string, string> = {}) =>
    fetch(B + chemin, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': 'msg-0001', ...entetes }, ...(corps ? { body: JSON.stringify(corps) } : {}) });
  const demande = { message_id: 'msg-0001', conversation_id: 'conv-0001', texte: 'Bonjour', puces: [], canal: 'clavier' };

  it('arret-pendant-le-tour : le flux est coupé avant le texte', async () => {
    let ouvrir: () => void = () => undefined;
    const porte = new Promise<void>((res) => (ouvrir = res));
    const noeud = demarrerNoeud({ base: B, chat: { attendre: (rang) => (rang === 3 ? porte : undefined) } });
    try {
      const envoi = poster('/chat/messages', demande);
      await new Promise((r) => setTimeout(r, 20));
      expect((await poster('/chat/tours/msg-0001/arreter')).status).toBe(200);
      ouvrir();
      const evts = new DecodeurFlux().pousser(await (await envoi).text());
      expect(evts.map((e) => e.type)).toEqual(['tour.debut', 'etape', 'tour.fin']);
    } finally {
      noeud.fermer();
    }
  });

  it('coupure par la configuration, reprise avec Last-Event-ID', async () => {
    const noeud = demarrerNoeud({ base: B, chat: { coupureApres: 1 } });
    try {
      const d = new DecodeurFlux();
      expect(d.pousser(await (await poster('/chat/messages', demande)).text()).map((e) => e.id)).toEqual([1]);
      const suite = await poster('/chat/messages', demande, { 'last-event-id': '1' });
      expect(d.pousser(await suite.text()).map((e) => e.id)).toEqual([2]);
    } finally {
      noeud.fermer();
    }
  });
});
