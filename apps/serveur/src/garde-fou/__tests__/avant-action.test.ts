import Fastify from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import type { ObjetRef } from '../../../../../packages/noyau/src/controles/declencheurs.js';
import type { Blocage, RegleControle } from '../../../../../packages/noyau/src/controles/moteur.js';
import { creerAvantAction, type ActionReelle, type SourceControle } from '../avant-action.js';

interface Piece { ouverte: boolean; date: string; casse?: boolean }

const TOUTES: Blocage[] = ['validation', 'tva', 'export', 'cloture'];
const ACTIONS: ActionReelle[] = ['valider_mois', 'preparer_tva', 'exporter', 'cloturer'];
const PERIODE = { debut: '2026-01-01', fin: '2026-01-31' };
const HORO = '2026-02-01T10:00:00Z';

function regle(id: string, gravite: 'B' | 'M', bloque: Blocage[], extra: Partial<RegleControle<Piece>> = {}, appels?: { n: number }) {
  const r: RegleControle<Piece> = {
    id, version: 1, gravite, bloque, declencheurs: ['arrivee'], actif: true,
    evaluer: (p) => {
      if (appels) appels.n += 1;
      if (p.casse) throw new Error('boom');
      return { resultat: p.ouverte ? 'ALERTE' : 'OK' };
    },
    ...extra,
  };
  return r;
}

function faux(pieces: Record<string, Piece>, regles: RegleControle<Piece>[]): SourceControle<Piece> {
  return {
    regles: () => regles,
    tousLesObjets: (): ObjetRef[] => Object.entries(pieces).map(([id, p]) => ({ type: 'piece', id, date: p.date })),
    charger: (ref) => ({ type: ref.type, id: ref.id, donnee: pieces[ref.id]! }),
  };
}

const apps: Array<ReturnType<typeof Fastify>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

/** Quatre routes d'essai qui appellent l'intercepteur ; `faites` compte les actions réellement exécutées. */
function serveur(source: SourceControle<Piece>) {
  const avant = creerAvantAction(source);
  const faites: ActionReelle[] = [];
  const app = Fastify();
  apps.push(app);
  for (const action of ACTIONS) {
    app.post('/' + action, async (_req, rep) => {
      const refus = avant({ action, horodatage: HORO, periode: PERIODE });
      if (refus !== null) return rep.code(refus.statut).send(refus.corps);
      faites.push(action);
      return { ok: true };
    });
  }
  return { app, faites };
}

describe('garde-fou avant action', () => {
  it('CT-02 http : export refuse 409 tant qu un B est ouvert', async () => {
    const pieces = { p1: { ouverte: true, date: '2026-01-10' } };
    const { app, faites } = serveur(faux(pieces, [regle('CC-B01', 'B', TOUTES)]));
    const r = await app.inject({ method: 'POST', url: '/exporter' });
    expect(r.statusCode).toBe(409);
    expect(r.json()).toEqual({
      code: 'controle_bloquant_ouvert',
      bloquants: [{ regleId: 'CC-B01', objetId: 'p1', messageCode: 'controle.CC-B01' }],
    });
    expect(faites).toEqual([]);
    pieces.p1.ouverte = false;
    expect((await app.inject({ method: 'POST', url: '/exporter' })).statusCode).toBe(200);
    expect(faites).toEqual(['exporter']);
  });

  it('CT-43 http : catalogue rejoue avant l export, aucun resultat reutilise', async () => {
    const appels = { n: 0 };
    const pieces = { p1: { ouverte: false, date: '2026-01-10' }, p2: { ouverte: false, date: '2026-01-11' } };
    const { app } = serveur(faux(pieces, [regle('CC-B01', 'B', TOUTES, {}, appels)]));
    expect((await app.inject({ method: 'POST', url: '/exporter' })).statusCode).toBe(200);
    expect(appels.n).toBe(2);
    pieces.p2.ouverte = true;
    const r = await app.inject({ method: 'POST', url: '/exporter' });
    expect(appels.n).toBe(4);
    expect(r.statusCode).toBe(409);
    expect(r.json().bloquants).toEqual([{ regleId: 'CC-B01', objetId: 'p2', messageCode: 'controle.CC-B01' }]);
  });

  it('aucun-b-action-faite : chaque action est refusee et non executee', async () => {
    const { app, faites } = serveur(faux({ p1: { ouverte: true, date: '2026-01-10' } }, [regle('CC-B01', 'B', TOUTES)]));
    for (const a of ACTIONS) expect([a, (await app.inject({ method: 'POST', url: '/' + a })).statusCode]).toEqual([a, 409]);
    expect(faites).toEqual([]);
  });

  it('une regle qui ne bloque pas l action, ou de gravite M, laisse passer', async () => {
    const pieces = { p1: { ouverte: true, date: '2026-01-10' } };
    const { app } = serveur(faux(pieces, [regle('CC-B02', 'B', ['export']), regle('CC-M01', 'M', TOUTES)]));
    expect((await app.inject({ method: 'POST', url: '/preparer_tva' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/valider_mois' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/cloturer' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/exporter' })).statusCode).toBe(409);
  });

  it('regle inactive ignoree, regle qui plante = IMPOSSIBLE donc refus, catalogue vide autorise', async () => {
    const ouverte = { p1: { ouverte: true, date: '2026-01-10' } };
    const inactive = serveur(faux(ouverte, [regle('CC-B01', 'B', TOUTES, { actif: false })]));
    expect((await inactive.app.inject({ method: 'POST', url: '/exporter' })).statusCode).toBe(200);
    const casse = serveur(faux({ p1: { ouverte: false, casse: true, date: '2026-01-10' } }, [regle('CC-B01', 'B', TOUTES)]));
    expect((await casse.app.inject({ method: 'POST', url: '/cloturer' })).statusCode).toBe(409);
    const vide = serveur(faux({}, []));
    for (const a of ACTIONS) expect((await vide.app.inject({ method: 'POST', url: '/' + a })).statusCode).toBe(200);
  });

  it('la TVA et la validation ne controlent que la periode (bornes incluses), l export tout', async () => {
    const pieces = {
      avant: { ouverte: true, date: '2025-12-31' },
      apres: { ouverte: true, date: '2026-02-01' },
      debut: { ouverte: false, date: '2026-01-01' },
    };
    const { app } = serveur(faux(pieces, [regle('CC-B01', 'B', TOUTES)]));
    expect((await app.inject({ method: 'POST', url: '/preparer_tva' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/valider_mois' })).statusCode).toBe(200);
    pieces.debut.ouverte = true;
    const r = await app.inject({ method: 'POST', url: '/preparer_tva' });
    expect(r.json().bloquants.map((b: { objetId: string }) => b.objetId)).toEqual(['debut']);
    const ex = await app.inject({ method: 'POST', url: '/exporter' });
    expect(ex.json().bloquants.map((b: { objetId: string }) => b.objetId)).toEqual(['apres', 'avant', 'debut']);
  });

  it('periode absente ou inversee pour la TVA : exception, jamais un feu vert', () => {
    const avant = creerAvantAction(faux({ p1: { ouverte: false, date: '2026-01-10' } }, [regle('CC-B01', 'B', TOUTES)]));
    expect(() => avant({ action: 'preparer_tva', horodatage: HORO })).toThrow();
    expect(() => avant({ action: 'preparer_tva', horodatage: HORO, periode: { debut: '2026-01-31', fin: '2026-01-01' } })).toThrow();
  });
});
