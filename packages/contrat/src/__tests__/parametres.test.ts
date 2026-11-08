import { describe, expect, it } from 'vitest';
import type { ParametreFictif } from '../../../donnees-fictives/src/profil.js';
import { ParametreLu, QueryParametre, ReponseParametre } from '../domaines/parametres.js';
import { creerServiceParametres } from '../domaines/parametres-service.js';
import { genererOpenapi, routesEcritureSansEnTete } from '../openapi.js';

const base: ParametreFictif = { cle: 'fictif.test_e', pays: 'FR', valeur: 'valeur-inventee-e', effet_debut: '2026-01-01', effet_fin: '2026-06-30', statut: 'valide', source: 'Source inventée', source_url: 'https://www.legifrance.gouv.fr/fictif/chemin-002', source_titre: 'Titre inventé', source_maj: null, date_releve: '2026-05-01' };

describe('lecture d’un paramètre daté', () => {
  it('parametre-en-vigueur', () => {
    const p = creerServiceParametres().lire('fictif.seuil_c', '2026-03-15')!;
    expect(ParametreLu.parse(p)).toEqual(p);
    expect(ReponseParametre.parse({ body: p }).body.valeur).toBe('valeur-inventee-c');
    expect(p).toMatchObject({ statut: 'valide', effetDebut: '2026-01-01', effetFin: null, dateReleve: '2026-05-01', aVerifier: false });
    expect(p.source).toEqual({ url: 'https://www.legifrance.gouv.fr/fictif/chemin-001', titre: 'Titre inventé', maj: '2026-04-01' });
  });

  it('absent-404-jamais-de-defaut', () => {
    const s = creerServiceParametres();
    expect(s.lire('fictif.inconnu', '2026-03-15')).toBeNull();
    expect(s.lire('fictif.seuil_c', '2025-12-31')).toBeNull();
    expect(s.lire('fictif.seuil_c', '2999-01-01')!.valeur).toBe('valeur-inventee-c');
  });

  it('fin-exclue', () => {
    const s = creerServiceParametres({ supplementaires: [base] });
    expect(s.lire('fictif.test_e', '2026-06-29')?.valeur).toBe('valeur-inventee-e');
    expect(s.lire('fictif.test_e', '2026-06-30')).toBeNull();
    expect(s.lire('fictif.test_e', '2025-12-31')).toBeNull();
    expect(s.lire('fictif.test_e', '2026-01-01')?.effetFin).toBe('2026-06-30');
  });

  it('retire-ignore', () => {
    const s = creerServiceParametres();
    expect(s.lire('fictif.taux_d', '2026-03-15')).toBeNull();
    const avecRetire = creerServiceParametres({ supplementaires: [{ ...base, effet_fin: null, valeur: 'ancienne' }, { ...base, effet_debut: '2026-03-01', effet_fin: null, valeur: 'retiree', statut: 'retire' }] });
    expect(avecRetire.lire('fictif.test_e', '2026-04-01')?.valeur).toBe('ancienne');
  });

  it('a-verifier-si-non-valide-p20', () => {
    const s = creerServiceParametres();
    for (const [cle, attendu] of [['fictif.seuil_a', true], ['fictif.taux_b', true], ['fictif.seuil_c', false]] as const) {
      const p = s.lire(cle, '2026-03-15')!;
      expect(p.aVerifier).toBe(attendu);
      expect(p.aVerifier).toBe(p.statut !== 'valide');
      expect(p.source.url).not.toBe('');
      expect(p.dateReleve).toBe('2026-05-01');
    }
  });

  it('query-invalide-400', () => {
    for (const q of [{ cle: '', date: '2026-03-15' }, { cle: 'a b', date: '2026-03-15' }, { cle: 'A', date: '2026-03-15' }, { cle: 'a'.repeat(101), date: '2026-03-15' }, { cle: 'fictif.seuil_c', date: '2026-13-01' }, { cle: 'fictif.seuil_c' }, { date: '2026-03-15' }, { cle: 'fictif.seuil_c', date: '' }]) {
      expect(QueryParametre.safeParse(q).success).toBe(false);
    }
    expect(QueryParametre.safeParse({ cle: 'a'.repeat(100), date: '2026-03-15' }).success).toBe(true);
    expect(QueryParametre.safeParse({ cle: 'fictif.seuil_c', date: '2026-03-15' }).success).toBe(true);
  });

  it('openapi-contient-lire-parametre', () => {
    const doc = genererOpenapi() as { paths: Record<string, Record<string, { operationId?: string }>> };
    expect(doc.paths['/parametres']?.get?.operationId).toBe('lireParametre');
    expect(routesEcritureSansEnTete()).toEqual([]);
  });
});
