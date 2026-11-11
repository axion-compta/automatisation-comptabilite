import { describe, expect, it } from 'vitest';
import type { ContexteAutorisation } from '../../../../packages/noyau/src/securite/autoriser.js';
import { ACTIONS_ECRITURE } from '../../../../packages/noyau/src/securite/types.js';
import type { BrouillonEvenement } from '../../../../packages/noyau/src/securite/evenements.js';
import { bailCourt, creerBailSupport, creerBailsMemoire, type Bail } from '../securite/bail-support.js';

const UNE_HEURE = 60 * 60 * 1000;
const T0 = Date.parse('2026-11-11T10:00:00Z');
const bail: Bail = { personneId: 'pers-axion-1', societeId: 'soc-A', accordEcrit: 'accord-fictif-001', debutLe: '2026-11-11T10:00:00Z', expireLe: '2026-11-11T10:45:00Z' };
const contexte: ContexteAutorisation = {
  role: 'personnel_axion', permissions: ['compta-lire', 'compta-saisir', 'compta-valider', 'compta-deposer', 'compta-cloturer', 'compta-exporter'],
  demande5: false, separationTaches: false, personneId: 'pers-axion-1',
};

function monter(baux: Bail[], maintenant: { t: number }) {
  const journal: BrouillonEvenement[] = [];
  const support = creerBailSupport({ bails: creerBailsMemoire(baux), journaliser: (e) => void journal.push(e), maintenant: () => maintenant.t, maxMs: UNE_HEURE });
  return { support, journal };
}

describe('bail de support', () => {
  it('C09-cinq-ecritures-cinq-refus-cinq-entrees', async () => {
    const { support, journal } = monter([bail], { t: T0 + 60_000 });
    const cinq = ACTIONS_ECRITURE.slice(0, 5);
    expect(cinq).toHaveLength(5);
    for (const a of cinq) expect(await support.decider(contexte, 'soc-A', a)).toEqual({ statut: 403, raison: 'personnel_axion_lecture_seule' });
    expect(journal).toHaveLength(5);
    expect(journal.every((e) => e.evenement === 'securite.ecriture_axion_refusee' && e.auteur === 'pers-axion-1')).toBe(true);
    expect(journal.map((e) => e.donnees.action)).toEqual([...cinq]);
  });

  it('lecture-permise-pendant-le-bail-sans-entree', async () => {
    const { support, journal } = monter([bail], { t: T0 + 60_000 });
    expect(await support.decider(contexte, 'soc-A', 'lire')).toEqual({ statut: 200 });
    expect(journal).toHaveLength(0);
  });

  it('bail-expire-plus-d-acces', async () => {
    const h = { t: T0 + 60_000 };
    const { support } = monter([bail], h);
    expect(await support.actif('pers-axion-1', 'soc-A')).toBe(true);
    h.t = Date.parse(bail.expireLe);
    expect(await support.actif('pers-axion-1', 'soc-A')).toBe(false);
    expect(await support.decider(contexte, 'soc-A', 'lire')).toEqual({ statut: 403, raison: 'acces_expire' });
  });

  it('sans-bail-ou-sans-accord-ou-trop-long-aucun-acces', () => {
    expect(bailCourt(null, T0, UNE_HEURE)).toBe(false);
    expect(bailCourt({ ...bail, accordEcrit: ' ' }, T0, UNE_HEURE)).toBe(false);
    expect(bailCourt({ ...bail, expireLe: new Date(T0 + UNE_HEURE + 1).toISOString() }, T0, UNE_HEURE)).toBe(false);
    expect(bailCourt({ ...bail, expireLe: 'pas une date' }, T0, UNE_HEURE)).toBe(false);
    expect(bailCourt({ ...bail, expireLe: new Date(T0 + UNE_HEURE).toISOString() }, T0, UNE_HEURE)).toBe(true);
    expect(bailCourt(bail, T0, 0)).toBe(false);
  });

  it('bail-sur-la-societe-A-aucun-acces-a-la-societe-B', async () => {
    const { support, journal } = monter([bail], { t: T0 + 60_000 });
    expect(await support.actif('pers-axion-1', 'soc-B')).toBe(false);
    expect(await support.decider(contexte, 'soc-B', 'lire')).toEqual({ statut: 403, raison: 'acces_expire' });
    expect(await support.decider(contexte, 'soc-B', 'saisir')).toEqual({ statut: 403, raison: 'acces_expire' });
    expect(journal).toHaveLength(0);
    expect(await support.decider(contexte, 'soc-A', 'lire')).toEqual({ statut: 200 });
  });

  it('duree-maximale-invalide-aucun-acces', () => {
    for (const m of [Number.NaN, Number.POSITIVE_INFINITY, -1]) expect(bailCourt(bail, T0 + 60_000, m)).toBe(false);
  });

  it('avant-le-debut-ou-ordre-inverse-aucun-acces', () => {
    expect(bailCourt(bail, T0 - 1, UNE_HEURE)).toBe(false);
    expect(bailCourt(bail, T0, UNE_HEURE)).toBe(true);
    const inverse = { ...bail, debutLe: bail.expireLe, expireLe: bail.debutLe };
    expect(bailCourt(inverse, T0 + 60_000, UNE_HEURE)).toBe(false);
  });

  it('decider-extrait-de-l-objet-fonctionne', async () => {
    const { support } = monter([bail], { t: T0 + 60_000 });
    const { decider } = support;
    expect(await decider(contexte, 'soc-A', 'lire')).toEqual({ statut: 200 });
  });

  it('panne-de-la-console-refus-par-defaut', async () => {
    const support = creerBailSupport({ bails: { lire: async () => { throw new Error('panne'); } }, journaliser: () => undefined, maintenant: () => T0, maxMs: UNE_HEURE });
    expect(await support.decider(contexte, 'soc-A', 'lire')).toEqual({ statut: 403, raison: 'acces_expire' });
  });
});
