import { describe, expect, it } from 'vitest';
import { creerServiceBanque } from '../domaines/banque-service.js';
import { ReponseCouverture, ReponseDemandes, ReponseDoublons, ReponseTrous } from '../domaines/banque.js';

const s = creerServiceBanque();

describe('banque : suivi (lecture)', () => {
  it('couverture-septembre-manquant', () => {
    const c = ReponseCouverture.parse(s.couverture('BQ1'));
    expect(c.body.mois.filter((m) => m.etat === 'manquant').map((m) => m.mois)).toEqual(['2026-09']);
    const vide = s.couverture('BQ2')!;
    expect(vide.body.mois.length).toBeGreaterThan(0);
    expect(vide.body.mois.every((m) => m.etat === 'manquant')).toBe(true);
  });

  it('trous-filtre-ouvert', () => {
    const t = ReponseTrous.parse(s.trous('ouvert'));
    expect(t.total).toBe(1);
    expect(t.body[0]).toMatchObject({ compteId: 'BQ1', debut: '2026-09-01', ecartCentimes: 134567 });
    expect(s.trous('accepte')).toEqual({ body: [], decalage: 0, total: 0 });
    expect(s.trous().total).toBe(1);
  });

  it('demandes-triees-par-impact', () => {
    const d = ReponseDemandes.parse(s.demandes('ouverte'));
    expect(d.total).toBeGreaterThan(1);
    for (let i = 1; i < d.body.length; i++) {
      const [a, b] = [d.body[i - 1]!, d.body[i]!];
      expect(a.impactCentimes > b.impactCentimes || (a.impactCentimes === b.impactCentimes && a.id < b.id)).toBe(true);
    }
    expect(s.demandes('repondue').body).toEqual([]);
  });

  it('demandes-reponses-en-codes', () => {
    for (const d of s.demandes().body) {
      expect(d.reponsesPretes.length).toBeGreaterThan(0);
      for (const r of d.reponsesPretes) expect(r).toMatch(/^[a-z_]+$/);
      expect(d.codeQuestion).toMatch(/^[A-Z_]+$/);
    }
  });

  it('doublons-proposes', () => {
    const d = ReponseDoublons.parse(s.doublons('propose'));
    expect(d.total).toBe(1);
    expect(d.body[0]!.ligneA).not.toBe(d.body[0]!.ligneB);
    expect(s.doublons('rejete').total).toBe(0);
  });

  it('compte-inconnu-404', () => {
    expect(s.couverture('BQ9')).toBeUndefined();
  });
});
