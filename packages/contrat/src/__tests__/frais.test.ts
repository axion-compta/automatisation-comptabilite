import { describe, expect, it } from 'vitest';
import { genererFrais } from '../../../donnees-fictives/src/frais.js';
import { BornesInvalides, creerServiceFrais } from '../domaines/frais-service.js';
import { ReponseFrais, ReponseFraisDetail } from '../domaines/frais.js';
import { genererOpenapi, routesEcritureSansEnTete } from '../openapi.js';
import { PREFIXE_ROUTES_SOCIETE } from '../prefixe-routes.js';

const jeu = genererFrais();
const s = creerServiceFrais();

describe('frais en mémoire', () => {
  it('liste-enveloppe-tri-et-totaux', () => {
    const r = s.lister();
    expect(ReponseFrais.parse(r)).toEqual(r);
    expect(r.total).toBe(jeu.frais.length);
    expect(r.decalage).toBe(0);
    const cles = r.body.map((f) => f.date + '|' + f.id);
    const attendu = [...r.body].sort((a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : a.id < b.id ? -1 : 1)).map((f) => f.date + '|' + f.id);
    expect(cles).toEqual(attendu);
    expect(Object.keys(r.totaux).sort()).toEqual(['aRembourserCentimes', 'enAttenteCentimes', 'exclusCentimes', 'kmSansMontantDixiemes']);
    expect(r.totaux.exclusCentimes).toBeGreaterThanOrEqual(6400);
    expect(s.lister({ decalage: 100 })).toMatchObject({ body: [], total: jeu.frais.length });
  });

  it('totaux-sur-la-selection-pas-sur-la-page', () => {
    const tout = s.lister();
    const page = s.lister({ limite: 1 });
    expect(page.body).toHaveLength(1);
    expect(page.total).toBe(tout.total);
    expect(page.totaux).toEqual(tout.totaux);
    expect(s.lister({ limite: 2, decalage: 3 }).totaux).toEqual(tout.totaux);
  });

  it('exemple-de-la-demo-12-60-45-64', () => {
    const demo = creerServiceFrais({ ...jeu, frais: jeu.frais.filter((f) => ['FRA-001', 'FRA-002', 'FRA-003'].includes(f.id)), trajets: [] });
    expect(demo.lister().totaux).toEqual({ aRembourserCentimes: 1260, enAttenteCentimes: 4500, exclusCentimes: 6400, kmSansMontantDixiemes: 0 });
  });

  it('filtre-par-statut', () => {
    const r = s.lister({ statut: 'valide' });
    expect(r.total).toBe(jeu.frais.filter((f) => f.statut === 'valide').length);
    expect(r.body.every((f) => f.statut === 'valide')).toBe(true);
    expect(r.totaux.exclusCentimes).toBe(0);
    expect(s.lister({ statut: 'inconnu' }).total).toBe(0);
    expect(s.lister({ personne: 'PER-02' }).total).toBe(0);
    const trajet = s.lister({ statut: 'valide' }).body.find((f) => f.nature === 'trajet');
    expect(trajet?.montantTrajetCentimes).toBeNull();
    expect(s.lister({ statut: 'valide' }).totaux.kmSansMontantDixiemes).toBe(trajet?.kmDixiemes);
  });

  it('filtre-par-periode', () => {
    expect(s.lister({ du: '2025-04-01', au: '2025-04-30' }).body.map((f) => f.id)).toEqual(['FRA-013']);
    expect(s.lister({ du: '2026-01-01' }).body.map((f) => f.id)).toEqual(['FRA-014']);
    expect(s.lister({ au: '2025-03-12' }).total).toBe(12);
    expect(s.lister({ du: '2025-03-12', au: '2025-03-12' }).total).toBe(12);
    expect(s.lister({ du: '2030-01-01' }).total).toBe(0);
  });

  it('bornes-invalides-400', () => {
    expect(() => s.lister({ du: '2025-05-01', au: '2025-04-01' })).toThrow(BornesInvalides);
  });

  it('frais-inconnu-404', () => {
    expect(s.lire('FRA-999')).toBeUndefined();
    expect(s.lire('')).toBeUndefined();
    const d = s.lire('FRA-012');
    expect(ReponseFraisDetail.parse({ body: d }).body).toMatchObject({ id: 'FRA-012', partPersoTtcCentimes: 1500, version: 1, pieceId: 'PIE-012' });
    expect(s.lire('FRA-013')).toMatchObject({ vehiculeId: 'VEH-01', trajet: { allerRetour: true } });
  });

  it('openapi-contient-les-routes-des-frais', () => {
    const doc = genererOpenapi() as { paths: Record<string, Record<string, { operationId?: string }>> };
    expect(doc.paths[PREFIXE_ROUTES_SOCIETE + '/frais']?.get?.operationId).toBe('listerFrais');
    expect(doc.paths[PREFIXE_ROUTES_SOCIETE + '/frais/{id}']?.get?.operationId).toBe('lireFrais');
    expect(routesEcritureSansEnTete()).toEqual([]);
  });
});
