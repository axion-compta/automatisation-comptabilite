import { describe, expect, it } from 'vitest';
import { genererOpenapi, routesEcritureSansEnTete } from '../openapi.js';
import { CLES_PROFIL, CorpsConfirmation, CorpsValeurChamp } from '../domaines/profil-champs.js';
import { creerServiceProfilChamps, ErreurChamp } from '../domaines/profil-champs-service.js';

const JOUR = '2026-06-15';
const AJOUT = { valeur: 'SAS', origine: 'saisie_personne' as const, effetDebut: '2026-01-01' };
const code = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurChamp ? e.code : 'autre';
  }
  return null;
};

describe('profil : écriture des champs (service)', () => {
  it('ajout-seul-et-confirmation', () => {
    const s = creerServiceProfilChamps('soc-lemoine');
    const avant = s.lire(undefined, JOUR).champs.length;
    expect(s.ajouter('forme', 'cle-test-000001', AJOUT, JOUR).statut).toBe('a_confirmer');
    expect(s.confirmer('forme', 'cle-test-000002', { effetDebut: '2026-02-01' }, JOUR).statut).toBe('confirme');
    expect(s.lire(undefined, JOUR).champs.length).toBe(avant);
    expect(s.lire('2026-01-15', JOUR).champs.find((c) => c.cle === 'forme')?.statut).toBe('a_confirmer');
  });

  it('erreurs-et-idempotence', () => {
    const s = creerServiceProfilChamps('soc-lemoine');
    expect(code(() => s.ajouter('inconnue', 'cle-test-000003', AJOUT, JOUR))).toBe('CLE_INCONNUE');
    expect(code(() => s.confirmer('forme', 'cle-test-000004', { effetDebut: JOUR }, JOUR))).toBe('RIEN_A_CONFIRMER');
    const a = s.ajouter('forme', 'cle-test-000005', AJOUT, JOUR);
    expect(s.ajouter('forme', 'cle-test-000005', AJOUT, JOUR)).toEqual(a);
    expect(code(() => s.ajouter('forme', 'cle-test-000005', { ...AJOUT, valeur: 'SA' }, JOUR))).toBe('CLE_REUTILISEE');
  });

  it('corps-stricts', () => {
    expect(CorpsValeurChamp.safeParse({ valeur: 'x', origine: 'proposition_ia' }).success).toBe(false);
    expect(CorpsValeurChamp.safeParse({ valeur: 'x', origine: 'sirene' }).success).toBe(false);
    expect(CorpsValeurChamp.safeParse({ valeur: 'x', origine: 'document', effetDebut: '2026-02-30' }).success).toBe(false);
    expect(CorpsConfirmation.safeParse({}).success).toBe(false);
    expect(CLES_PROFIL).toContain('forme');
  });

  it('openapi-contient-les-ecritures', () => {
    const doc = genererOpenapi() as { paths: Record<string, Record<string, { operationId?: string }>> };
    expect(doc.paths['/profil/champs/{cle}']?.post?.operationId).toBe('ajouterValeurChamp');
    expect(doc.paths['/profil/champs/{cle}/confirmer']?.post?.operationId).toBe('confirmerChamp');
    expect(routesEcritureSansEnTete()).toEqual([]);
  });
});
