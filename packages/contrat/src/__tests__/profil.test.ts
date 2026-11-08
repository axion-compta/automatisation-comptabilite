import { describe, expect, it } from 'vitest';
import { genererProfils } from '../../../donnees-fictives/src/profil.js';
import { ChampProfilV1, ProfilV1, QueryProfil } from '../domaines/profil.js';
import { creerServiceProfil } from '../domaines/profil-service.js';
import { genererOpenapi, routesEcritureSansEnTete } from '../openapi.js';

const AUJOURDHUI = '2026-11-08';
const lire = (soc: string, au?: string) => creerServiceProfil(soc).lire(au, AUJOURDHUI);

describe('profil.v1 en mémoire', () => {
  it('profil-valide-contre-le-schema', () => {
    for (const s of genererProfils().societes) {
      for (const au of [undefined, '2024-06-01', '2026-12-31']) {
        const p = ProfilV1.parse(lire(s.id, au));
        expect(p.version).toBe('profil.v1');
      }
    }
    expect(ProfilV1.safeParse({ ...lire('soc-lemoine'), version: 'profil.v2' }).success).toBe(false);
  });

  it('lemoine-a-confirmer-p04', () => {
    const p = lire('soc-lemoine');
    expect(p.etat).toBe('a_confirmer');
    expect(p.aConfirmer).toEqual(['regime_tva']);
    expect(p.manquants).toEqual([]);
    expect(p.blocages).toEqual([]);
    expect(p.champs.find((c) => c.cle === 'regime_tva')).toMatchObject({ statut: 'a_confirmer', origine: 'proposition_ia' });
    // avant l'effet du régime : il manque
    expect(lire('soc-lemoine', '2026-06-30').manquants).toContain('regime_tva');
  });

  it('lecture-a-une-date-p24', () => {
    const forme = (au: string) => lire('soc-rivoire', au).champs.find((c) => c.cle === 'forme')!;
    expect(forme('2025-12-31').valeur).toBe('SARL');
    expect(forme('2026-01-01').valeur).toBe('SAS');
    expect(forme('2026-12-31').valeur).toBe('SAS');
    expect(lire('soc-rivoire', '2025-12-31').champs.filter((c) => c.cle === 'forme')).toHaveLength(1);
    expect(lire('soc-rivoire', '2020-01-01').champs).toEqual([]);
  });

  it('au-mal-formee-400', () => {
    for (const mauvais of ['2026-02-30', '31/12/2026', '', '2026-1-1', 'NaN']) {
      expect(QueryProfil.safeParse({ au: mauvais }).success).toBe(false);
    }
    expect(QueryProfil.safeParse({ au: '2026-12-31' }).success).toBe(true);
    expect(QueryProfil.safeParse({}).success).toBe(true);
  });

  it('cinq-attributs-par-champ', () => {
    const champs = lire('soc-lemoine').champs;
    expect(champs.length).toBeGreaterThan(0);
    for (const c of champs) {
      for (const k of ['valeur', 'origine', 'confiance', 'source', 'statut']) expect(c).toHaveProperty(k);
      expect(ChampProfilV1.parse(c)).toEqual(c);
    }
    expect(champs.find((c) => c.cle === 'tenue')!.source).toBeNull();
    expect(champs.find((c) => c.cle === 'denomination')!.source).toMatchObject({ ref: expect.any(String), date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) });
  });

  it('blocage-commissaire-aux-comptes', () => {
    const base = { societeId: 'soc-lemoine', cle: 'a_commissaire_aux_comptes', valeur: 'oui', origine: 'saisie_personne', confiance: 'sur', source_ref: null, date_source: null, statut: 'confirme', effet_debut: '2026-07-01', confirme_par: null, confirme_le: null, rang: 99 };
    // cas témoin : régime TVA confirmé (même effet, rang supérieur), le profil serait complet sans blocage
    const tva = { ...base, cle: 'regime_tva', valeur: 'reel_simplifie', rang: 98 };
    const avec = (extra: Array<typeof base>) => creerServiceProfil('soc-lemoine', { champsSupplementaires: [tva, ...extra] }).lire(undefined, AUJOURDHUI);
    expect(avec([]).etat).toBe('complet');
    expect(avec([]).blocages).toEqual([]);
    for (const [extra, cle] of [[{}, 'commissaire_aux_comptes'], [{ cle: 'code_postal_siege', valeur: '99123' }, 'siege_exclu']] as const) {
      const p = avec([{ ...base, ...extra }]);
      expect(p.etat).toBe('incomplet');
      expect(p.blocages).toEqual([cle]);
    }
    expect(lire('soc-lemoine').blocages).toEqual([]);
  });

  it('openapi-contient-lire-profil', () => {
    const doc = genererOpenapi() as { paths: Record<string, Record<string, { operationId?: string; parameters?: Array<{ name: string }> }>> };
    expect(doc.paths['/profil']?.get?.operationId).toBe('lireProfil');
    expect(doc.paths['/profil']?.get?.parameters?.map((p) => p.name)).toContain('au');
    expect(routesEcritureSansEnTete()).toEqual([]);
  });
});
