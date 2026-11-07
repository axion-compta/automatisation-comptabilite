import { describe, expect, it } from 'vitest';
import type { ObjetControle, RegleControle, TraceControle } from '../../../../../packages/noyau/src/controles/moteur.js';
import { passerNocturne, type AlerteExploitation, type PortJournal, type SourceSociete } from '../controles-nocturnes.js';

const regle: RegleControle<number> = {
  id: 'R-demo', version: 1, gravite: 'M', bloque: [], declencheurs: ['nocturne'], actif: true,
  evaluer: (n) => ({ resultat: n >= 0 ? 'OK' : 'ALERTE' }),
};
const objet = (id: string, donnee: number): ObjetControle<number> => ({ type: 'piece', id, donnee });
const DUREE_MAX = 60;
const T0 = '2026-01-10T01:00:00Z';
const MINUTE = 60_000;
const apres = (min: number): string => new Date(Date.parse(T0) + min * MINUTE).toISOString().replace('.000Z', 'Z');

function monde(donnees: Record<string, ObjetControle<number>[]>, minutes: number[] = [0, 1]) {
  const appels: string[] = [];
  let enCours = 0;
  let maxSimultane = 0;
  const stock = new Map<string, TraceControle[]>();
  const alertes: AlerteExploitation[] = [];
  const source: SourceSociete<number> = {
    async charger(societeId) {
      enCours += 1;
      maxSimultane = Math.max(maxSimultane, enCours);
      appels.push(societeId);
      await Promise.resolve();
      enCours -= 1;
      return { regles: [regle], objets: donnees[societeId] ?? [] };
    },
  };
  const journal: PortJournal = {
    async dejaPasse(societeId, passageId) { return stock.has(societeId + '|' + passageId); },
    async ajouter(societeId, passageId, traces) { stock.set(societeId + '|' + passageId, [...traces]); },
  };
  let i = 0;
  const maintenant = (): string => apres(minutes[Math.min(i++, minutes.length - 1)] ?? 0);
  const lancer = () => passerNocturne({
    societes: Object.keys(donnees), passageId: 'nuit-1', dureeMaxMinutes: DUREE_MAX,
    source, journal, maintenant, alerter: (a) => { alertes.push(a); },
  });
  return { lancer, stock, alertes, appels, maxSimultane: () => maxSimultane };
}

describe('contrôles nocturnes', () => {
  it('idempotente', async () => {
    const m = monde({ 'soc-a': [objet('p2', 5), objet('p1', -1)] });
    const un = await m.lancer();
    const avant = JSON.stringify([...m.stock]);
    const deux = await m.lancer();
    expect(JSON.stringify([...m.stock])).toBe(avant);
    expect(m.stock.size).toBe(1);
    expect(un.societes[0]).toMatchObject({ societeId: 'soc-a', etat: 'fait', traces: 2 });
    expect(deux.societes[0]).toMatchObject({ societeId: 'soc-a', etat: 'deja_fait', traces: 0 });
    expect(m.stock.get('soc-a|nuit-1')?.map((t) => t.objetId)).toEqual(['p1', 'p2']);
    expect(m.stock.get('soc-a|nuit-1')?.every((t) => t.declencheur === 'nocturne')).toBe(true);
  });

  it('retard-alerte', async () => {
    const enRetard = monde({ 'soc-a': [objet('p1', 1)] }, [0, DUREE_MAX + 1]);
    const r = await enRetard.lancer();
    expect(r.enRetard).toBe(true);
    expect(enRetard.alertes).toEqual([{ code: 'nocturne_en_retard', passageId: 'nuit-1' }]);
    const limite = monde({ 'soc-a': [objet('p1', 1)] }, [0, DUREE_MAX]);
    expect((await limite.lancer()).enRetard).toBe(false);
    expect(limite.alertes).toEqual([]);
  });

  it('une-societe-n-en-voit-pas-une-autre', async () => {
    const m = monde({ 'soc-a': [objet('a1', 1)], 'soc-b': [objet('b1', -1), objet('b2', 2)] });
    await m.lancer();
    expect(m.appels).toEqual(['soc-a', 'soc-b']);
    expect(m.maxSimultane()).toBe(1);
    expect(m.stock.get('soc-a|nuit-1')?.map((t) => t.objetId)).toEqual(['a1']);
    expect(m.stock.get('soc-b|nuit-1')?.map((t) => t.objetId)).toEqual(['b1', 'b2']);
  });

  it('echec-d-une-societe-signale-et-les-autres-passent', async () => {
    const alertes: AlerteExploitation[] = [];
    const stock = new Map<string, TraceControle[]>();
    const r = await passerNocturne({
      societes: ['soc-a', 'soc-b'], passageId: 'nuit-2', dureeMaxMinutes: DUREE_MAX,
      source: { charger: async (id) => { if (id === 'soc-a') throw new Error('base indisponible'); return { regles: [regle], objets: [objet('b1', 1)] }; } },
      journal: { dejaPasse: async () => false, ajouter: async (s, p, t) => { stock.set(s + p, [...t]); } },
      maintenant: () => T0, alerter: (a) => { alertes.push(a); },
    });
    expect(r.societes.map((s) => s.etat)).toEqual(['echec', 'fait']);
    expect(alertes).toEqual([{ code: 'nocturne_societe_en_echec', passageId: 'nuit-2', societeId: 'soc-a' }]);
    expect(stock.size).toBe(1);
  });

  it('liste-vide', async () => {
    const m = monde({});
    expect(await m.lancer()).toEqual({ passageId: 'nuit-1', enRetard: false, societes: [] });
  });
});
