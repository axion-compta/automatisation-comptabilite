import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Calendrier } from '../../../../../packages/noyau/src/sources/veille-etat.js';
import type { FicheChangement } from '../../../../../packages/noyau/src/sources/veille-circuit.js';
import {
  balayageDu, balayer, empreinteCiblee, surveillerVeille,
  type AlerteVeille, type PortLecture, type PortVeille, type SourceVeille,
} from '../veille-balayage.js';

const JOUR_MS = 86_400_000;
const cal: Calendrier = {
  ajouterJours: (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * JOUR_MS).toISOString().slice(0, 10),
};
const PERIODE = { debutMoisJour: '03-01', finMoisJour: '04-30' };
const HEBDO = 7;
const QUOTIDIEN = 1;
const DELAI = 50;
const JOUR = '2026-06-10';
const LE = '2026-06-10T08:00:00Z';
const srcA: SourceVeille = { id: 'source-fictive-a', adresse: 'https://exemple.fr/a', debutMarqueur: '<!--debut-->', finMarqueur: '<!--fin-->' };
const srcB: SourceVeille = { ...srcA, id: 'source-fictive-b', adresse: 'https://exemple.fr/b' };
const page = (milieu: string, hors = ''): string => `${hors}<!--debut-->${milieu}<!--fin-->${hors}`;

function monde(sources: SourceVeille[], pages: Record<string, string | Error | 'bloque'>) {
  const empreintes = new Map<string, string>();
  const fiches: FicheChangement[] = [];
  const alertes: AlerteVeille[] = [];
  const etat = { dernier: null as string | null };
  const veille: PortVeille = {
    sources: async () => sources,
    empreinte: async (id) => empreintes.get(id) ?? null,
    noterEmpreinte: async (id, e) => void empreintes.set(id, e),
    dernierBalayage: async () => etat.dernier,
    noterBalayage: async (j) => void (etat.dernier = j),
    ficheExiste: async (id) => fiches.some((f) => f.id === id),
    ajouterFiche: async (f) => void fiches.push(f),
  };
  const lecture: PortLecture = {
    lire: (adresse, signal) => {
      const v = pages[adresse];
      if (v instanceof Error) return Promise.reject(v);
      if (v === 'bloque') return new Promise((_, rej) => signal.addEventListener('abort', () => rej(new Error('abandon'))));
      return Promise.resolve(v ?? '');
    },
  };
  const alerte = { alerter: async (a: AlerteVeille) => void alertes.push(a) };
  const lancer = () => balayer({ jour: JOUR, le: LE, delaiMs: DELAI, lecture, veille, alerte });
  return { empreintes, fiches, alertes, etat, lancer, veille };
}

afterEach(() => vi.useRealTimers());

describe('empreinteCiblee', () => {
  it('ignore les blancs en trop et ce qui est hors des marqueurs', () => {
    expect(empreinteCiblee(page('a   b\n c', 'X'), srcA)).toBe(empreinteCiblee(page('a b c', 'Y'), srcA));
    expect(empreinteCiblee(page('a b c'), srcA)).not.toBe(empreinteCiblee(page('a b d'), srcA));
  });
  it('rend null si un marqueur manque ou si ils sont inversés', () => {
    for (const c of ['rien', '<!--debut-->seul', '<!--fin-->x<!--debut-->']) expect(empreinteCiblee(c, srcA)).toBeNull();
  });
});

describe('balayer', () => {
  it('premiere-empreinte-sans-fiche', async () => {
    const m = monde([srcA], { [srcA.adresse]: page('un') });
    await m.lancer();
    expect(m.empreintes.get(srcA.id)).toBe(empreinteCiblee(page('un'), srcA));
    expect([m.fiches, m.alertes]).toEqual([[], []]);
    expect(m.etat.dernier).toBe(JOUR);
  });

  it('ve1-changement-cree-une-fiche-detectee', async () => {
    const m = monde([srcA], { [srcA.adresse]: page('deux') });
    const avant = empreinteCiblee(page('un'), srcA) as string;
    m.empreintes.set(srcA.id, avant);
    await m.lancer();
    const apres = empreinteCiblee(page('deux'), srcA);
    expect(m.fiches).toHaveLength(1);
    expect(m.fiches[0]).toMatchObject({ statut: 'detectee', sourceId: srcA.id, empreinteAvant: avant, empreinteApres: apres, detecteeLe: LE });
    expect(m.alertes).toEqual([{ code: 'changement_detecte', sourceId: srcA.id, ficheId: m.fiches[0]?.id }]);
    expect(m.empreintes.get(srcA.id)).toBe(apres);
  });

  it('meme-empreinte-aucune-fiche-aucune-alerte', async () => {
    const m = monde([srcA], { [srcA.adresse]: page('un') });
    m.empreintes.set(srcA.id, empreinteCiblee(page('un'), srcA) as string);
    await m.lancer();
    expect([m.fiches, m.alertes]).toEqual([[], []]);
  });

  it('hors-marqueurs-ignore', async () => {
    const m = monde([srcA], { [srcA.adresse]: page('un', 'nouveau bandeau') });
    m.empreintes.set(srcA.id, empreinteCiblee(page('un', 'ancien'), srcA) as string);
    await m.lancer();
    expect([m.fiches, m.alertes]).toEqual([[], []]);
  });

  it('marqueur-absent-source-illisible', async () => {
    const m = monde([srcA], { [srcA.adresse]: 'page sans marqueurs' });
    await m.lancer();
    expect(m.alertes).toEqual([{ code: 'source_illisible', sourceId: srcA.id }]);
    expect(m.empreintes.size).toBe(0);
    expect(m.etat.dernier).toBeNull();
  });

  it('source-qui-leve-n-arrete-pas-les-autres', async () => {
    const m = monde([srcA, srcB], { [srcA.adresse]: new Error('panne'), [srcB.adresse]: page('un') });
    await m.lancer();
    expect(m.alertes).toEqual([{ code: 'source_illisible', sourceId: srcA.id }]);
    expect(m.empreintes.has(srcB.id)).toBe(true);
    expect(m.etat.dernier).toBeNull();
  });

  it('delai-depasse-source-illisible', async () => {
    vi.useFakeTimers();
    const m = monde([srcA], { [srcA.adresse]: 'bloque' });
    const p = m.lancer();
    await vi.advanceTimersByTimeAsync(DELAI + QUOTIDIEN);
    await p;
    expect(m.alertes).toEqual([{ code: 'source_illisible', sourceId: srcA.id }]);
    expect(m.etat.dernier).toBeNull();
  });

  it('relance-idempotente', async () => {
    const m = monde([srcA], { [srcA.adresse]: page('deux') });
    m.empreintes.set(srcA.id, empreinteCiblee(page('un'), srcA) as string);
    await m.lancer();
    await m.lancer();
    expect(m.fiches).toHaveLength(1);
    expect(m.alertes).toHaveLength(1);
  });

  it('une erreur de creerFiche est propagée', async () => {
    const m = monde([srcA], { [srcA.adresse]: page('deux') });
    m.empreintes.set(srcA.id, empreinteCiblee(page('un'), srcA) as string);
    await expect(balayer({ jour: JOUR, le: 'pas-une-date', delaiMs: DELAI, lecture: { lire: async () => page('deux') }, veille: m.veille, alerte: { alerter: async () => {} } })).rejects.toMatchObject({ code: 'date_invalide' });
  });
});

describe('balayageDu', () => {
  const p = (dernierBalayage: string | null, o: object = {}) => ({ jour: JOUR, dernierBalayage, intervalleJours: HEBDO, periode: PERIODE, ...o });
  it('balayage-du-hebdomadaire-et-quotidien-en-periode-rapprochee', () => {
    expect(balayageDu(p(null), cal)).toBe(true);
    expect(balayageDu(p('2026-06-04'), cal)).toBe(false);
    expect(balayageDu(p('2026-06-03'), cal)).toBe(true);
    expect(balayageDu(p('2026-06-09'), cal)).toBe(false);
    expect(balayageDu(p('2026-03-09', { jour: '2026-03-10' }), cal)).toBe(true);
    expect(balayageDu(p('2026-03-10', { jour: '2026-03-10' }), cal)).toBe(false);
  });
  it('refuse un ordre inversé', () => {
    expect(() => balayageDu(p('2026-06-11'), cal)).toThrowError(expect.objectContaining({ code: 'ordre_inverse' }));
  });
  it.each([Number.NaN, -QUOTIDIEN, HEBDO + 0.5, Number.POSITIVE_INFINITY])('refuse l’intervalle %s', (n) => {
    expect(() => balayageDu(p('2026-06-01', { intervalleJours: n }), cal)).toThrowError(expect.objectContaining({ code: 'nombre_invalide' }));
  });
});

describe('surveillerVeille', () => {
  const base = { maintenant: JOUR, maxJoursNormal: HEBDO, maxJoursRapproche: QUOTIDIEN, periode: PERIODE };
  it('veille-arretee-alerte-will', async () => {
    const alertes: AlerteVeille[] = [];
    const alerte = { alerter: async (a: AlerteVeille) => void alertes.push(a) };
    await surveillerVeille({ ...base, dernierBalayage: '2026-05-01', alerte }, cal);
    expect(alertes).toEqual([{ code: 'veille_arretee', dernierBalayage: '2026-05-01' }]);
    await surveillerVeille({ ...base, dernierBalayage: null, alerte }, cal);
    expect(alertes.at(-1)).toEqual({ code: 'veille_arretee', dernierBalayage: null });
  });
  it('rien tant que la veille est à jour', async () => {
    const alertes: AlerteVeille[] = [];
    await surveillerVeille({ ...base, dernierBalayage: '2026-06-08', alerte: { alerter: async (a) => void alertes.push(a) } }, cal);
    expect(alertes).toEqual([]);
  });
});
