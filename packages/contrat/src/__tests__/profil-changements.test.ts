import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { genererOpenapi, routesEcritureSansEnTete } from '../openapi.js';
import { Apercu, DemandeChangement } from '../domaines/profil-changements.js';
import { creerServiceProfilChamps } from '../domaines/profil-champs-service.js';
import { creerServiceProfilChangements, ErreurChangement } from '../domaines/profil-changements-service.js';
import { PREFIXE_ROUTES_SOCIETE } from '../prefixe-routes.js';
const SOC = PREFIXE_ROUTES_SOCIETE;

const JOUR = '2026-06-15';
const DEMANDE = { cle: 'regime_tva', valeur: 'reel_normal', effetDebut: '2026-07-01', motif: 'Changement de régime' };
const code = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurChangement ? e.code : 'autre';
  }
  return null;
};
const neuf = () => {
  const champs = creerServiceProfilChamps('soc-lemoine');
  return { champs, s: creerServiceProfilChangements(champs) };
};

describe('profil : changements (service)', () => {
  it('apercu-chiffre-sans-effet', () => {
    const { champs, s } = neuf();
    const avant = JSON.stringify(champs.lire(undefined, JOUR));
    const a = Apercu.parse(s.apercu(DEMANDE, JOUR));
    expect([a.brouillonsRecalcules, a.declarationsRecalculees.length, a.echeancesDeplacees.length, a.ecrituresValideesTouchees]).toEqual([1, 1, 2, 0]);
    expect(JSON.stringify(champs.lire(undefined, JOUR))).toBe(avant);
    expect(s.lignes()).toEqual([]);
  });

  it('cle-sans-impact-ne-touche-rien', () => {
    const a = neuf().s.apercu({ ...DEMANDE, cle: 'denomination' }, JOUR);
    expect([a.brouillonsRecalcules, a.declarationsRecalculees, a.echeancesDeplacees]).toEqual([0, [], []]);
  });

  it('periode-deposee-et-cle-inconnue', () => {
    const { s } = neuf();
    expect(code(() => s.apercu({ ...DEMANDE, effetDebut: '2026-03-31' }, JOUR))).toBe('PERIODE_DEPOSEE');
    expect(code(() => s.apercu({ ...DEMANDE, effetDebut: '2026-04-01' }, JOUR))).toBeNull();
    expect(code(() => s.apercu({ ...DEMANDE, cle: 'inconnue' }, JOUR))).toBe('CLE_INCONNUE');
  });

  it('confirmation-ajout-seul-idempotente-et-consommee', () => {
    const { s } = neuf();
    const { apercuId } = s.apercu(DEMANDE, JOUR);
    const l = s.confirmer(apercuId, 'cle-test-000001', JOUR);
    expect(s.confirmer(apercuId, 'cle-test-000001', JOUR)).toEqual(l);
    expect(s.lignes()).toEqual([{ ...DEMANDE, confirmeLe: JOUR }]);
    expect(code(() => s.confirmer(apercuId, 'cle-test-000002', JOUR))).toBe('APERCU_INCONNU');
    expect(code(() => s.confirmer('apercu-absent', 'cle-test-000003', JOUR))).toBe('APERCU_INCONNU');
  });

  it('apercu-perime-si-profil-change', () => {
    const { champs, s } = neuf();
    const { apercuId } = s.apercu(DEMANDE, JOUR);
    champs.ajouter('code_postal_siege', 'cle-test-000004', { valeur: '75001', origine: 'document' }, JOUR);
    expect(code(() => s.confirmer(apercuId, 'cle-test-000005', JOUR))).toBe('APERCU_PERIME');
    expect(s.lignes()).toEqual([]);
  });

  it('corps-stricts-et-openapi', () => {
    expect(DemandeChangement.safeParse({ ...DEMANDE, extra: 1 }).success).toBe(false);
    expect(DemandeChangement.safeParse({ ...DEMANDE, motif: '' }).success).toBe(false);
    expect(DemandeChangement.safeParse({ ...DEMANDE, effetDebut: '2026-02-30' }).success).toBe(false);
    expect(Apercu.safeParse({ apercuId: 'a', brouillonsRecalcules: 0, declarationsRecalculees: [], echeancesDeplacees: [], ecrituresValideesTouchees: 1 }).success).toBe(false);
    const doc = genererOpenapi() as { paths: Record<string, Record<string, { operationId?: string }>> };
    expect(doc.paths[SOC + '/profil/changements/apercu']?.post?.operationId).toBe('apercuChangement');
    expect(doc.paths[SOC + '/profil/changements']?.post?.operationId).toBe('confirmerChangement');
    expect(JSON.stringify(z.toJSONSchema(Apercu))).toMatch(/"ecrituresValideesTouchees":\{[^}]*"const":0/);
    expect(routesEcritureSansEnTete()).toEqual([]);
  });
});
