import { describe, expect, it } from 'vitest';
import type { AccesExpert } from '../../../../packages/noyau/src/securite/expert.js';
import { creerAccesExpert, creerInvitations, type PortAccesExpert } from '../securite/acces-expert.js';

const T0 = Date.parse('2026-11-11T10:00:00Z');
const iso = (ms: number): string => new Date(ms).toISOString();
const base: AccesExpert = {
  societeId: 'soc-A',
  personneId: 'pers-expert-1',
  perimetre: { exercices: ['2026'], journaux: ['ACH'], comptesBancaires: ['CB1'] },
  mode: 'lecture_commentaire',
  expireLe: iso(T0 + 10 * 60 * 1000),
};

function monter(acces: AccesExpert | null, cacheMs = 30_000) {
  const etat = { acces, lectures: 0, t: T0 };
  const port: PortAccesExpert = {
    lire: async () => {
      etat.lectures += 1;
      return etat.acces === null ? null : { ...etat.acces };
    },
  };
  const evenements: string[] = [];
  const avis: string[] = [];
  const service = creerAccesExpert({
    port,
    maintenant: () => etat.t,
    reglages: { cacheMs, preavisMs: 5 * 60 * 1000 },
    publier: (e) => evenements.push(e.type),
    avertir: (a) => avis.push(a.expireLe),
  });
  return { etat, service, evenements, avis };
}
const demande = { action: 'lire' as const };

describe('acces expert invité', () => {
  it('revocation-prise-en-compte-avant-une-minute', async () => {
    const { etat, service } = monter(base);
    expect(await service.verifier('soc-A', 'pers-expert-1', demande)).toEqual({ permis: true });
    etat.acces = { ...base, revoqueLe: iso(T0) };
    etat.t = T0 + 45_000;
    expect(await service.verifier('soc-A', 'pers-expert-1', demande)).toEqual({ permis: false, raison: 'acces_revoque' });
  });

  it('cache-court-evite-une-lecture-par-requete', async () => {
    const { etat, service } = monter(base);
    await service.verifier('soc-A', 'pers-expert-1', demande);
    etat.t = T0 + 10_000;
    await service.verifier('soc-A', 'pers-expert-1', demande);
    expect(etat.lectures).toBe(1);
    etat.t = T0 + 30_000;
    await service.verifier('soc-A', 'pers-expert-1', demande);
    expect(etat.lectures).toBe(2);
  });

  it('cache-trop-long-refuse-et-acces-inconnu-refuse', async () => {
    expect(() => monter(base, 60_000)).toThrow();
    expect(() => monter(base, -1)).toThrow();
    const { service } = monter(null);
    expect(await service.verifier('soc-A', 'pers-inconnu', demande)).toEqual({ permis: false, raison: 'acces_inconnu' });
  });

  it('autre-societe-refusee', async () => {
    const { service } = monter({ ...base, societeId: 'soc-B' });
    expect(await service.verifier('soc-A', 'pers-expert-1', demande)).toEqual({ permis: false, raison: 'acces_inconnu' });
  });

  it('echeance-evenement-une-fois', async () => {
    const { etat, service, evenements } = monter(base);
    etat.t = T0 + 10 * 60 * 1000;
    const v1 = await service.verifier('soc-A', 'pers-expert-1', demande);
    const v2 = await service.verifier('soc-A', 'pers-expert-1', demande);
    expect(v1).toEqual({ permis: false, raison: 'acces_expire', evenement: 'securite.acces_expert_expire' });
    expect(v2).toMatchObject({ permis: false, raison: 'acces_expire' });
    expect(evenements).toEqual(['securite.acces_expert_expire']);
  });

  it('avis-avant-echeance-une-fois', async () => {
    const { etat, service, avis } = monter(base);
    expect(await service.controlerEcheance('soc-A', 'pers-expert-1')).toBe(false);
    etat.t = T0 + 6 * 60 * 1000;
    expect(await service.controlerEcheance('soc-A', 'pers-expert-1')).toBe(true);
    expect(await service.controlerEcheance('soc-A', 'pers-expert-1')).toBe(false);
    expect(avis).toEqual([base.expireLe]);
  });

  it('lien-d-invitation-deux-fois-refuse', () => {
    const inv = creerInvitations(() => T0);
    inv.emettre('inv-001', 'soc-A', 'pers-expert-1', iso(T0 + 60_000));
    expect(inv.consommer('inv-001')).toEqual({ statut: 'ok', societeId: 'soc-A', personneId: 'pers-expert-1' });
    expect(inv.consommer('inv-001')).toEqual({ statut: 'refuse', raison: 'deja_utilise' });
    expect(inv.consommer('inv-zzz')).toEqual({ statut: 'refuse', raison: 'inconnue' });
  });

  it('invitation-expiree-refusee-et-reemission-refusee', () => {
    const t = { v: T0 };
    const inv = creerInvitations(() => t.v);
    inv.emettre('inv-002', 'soc-A', 'pers-expert-1', iso(T0 + 60_000));
    expect(() => inv.emettre('inv-002', 'soc-A', 'pers-expert-2', iso(T0 + 60_000))).toThrow();
    t.v = T0 + 60_000;
    expect(inv.consommer('inv-002')).toEqual({ statut: 'refuse', raison: 'expiree' });
  });
});
