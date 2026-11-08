import { describe, expect, it } from 'vitest';
import { genererFrais } from '../../../donnees-fictives/src/frais.js';
import { creerServiceVehiculesBareme, ErreurBareme } from '../domaines/vehicules-bareme-service.js';
import { LigneBareme, ReponseBareme, ReponseVehicules, Vehicule } from '../domaines/vehicules-bareme.js';
import { genererOpenapi, routesEcritureSansEnTete } from '../openapi.js';

const jeu = genererFrais();
const s = creerServiceVehiculesBareme();
const code = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurBareme ? e.code : 'autre';
  }
  return 'aucune';
};

describe('véhicules et barème en mémoire', () => {
  it('vehicules-de-la-personne', () => {
    const v = s.lister('PER-01');
    expect(ReponseVehicules.parse({ body: v }).body).toHaveLength(jeu.vehicules.length);
    expect(v.map((x) => x.id)).toEqual(['VEH-01', 'VEH-02', 'VEH-03', 'VEH-04']);
    expect(v.every((x) => x.personneId === 'PER-01' && x.carteGrise)).toBe(true);
    expect(s.lister('PER-02')).toEqual([]);
    expect(s.lister('')).toEqual([]);
  });

  it('immatriculation-jamais-exposee', () => {
    expect(Object.keys(Vehicule.shape)).not.toContain('immatriculation');
    const texte = JSON.stringify(s.lister('PER-01'));
    for (const v of jeu.vehicules) expect(texte).not.toContain(v.immatriculation);
    expect(s.lister('PER-01').every((x) => !('immatriculation' in x))).toBe(true);
  });

  it('bareme-valide-au-jour', () => {
    const l = s.lire('2025-06-15');
    expect(ReponseBareme.parse({ body: l }).body).toEqual(l);
    expect(l).toMatchObject({ cle: 'bareme_ik_voiture', statut: 'valide', effetDebut: '2025-01-01', effetFin: '2026-01-01', majorationPourcent: 10 });
    expect(l.puissances.map((p) => p.cleCv)).toEqual([4, 6]);
    expect(l.puissances[0]?.tranches.at(-1)?.jusquaKmDixiemes).toBeNull();
    expect(l.source).toBe(jeu.parametres[0]?.source);
  });

  it('bareme-a-verifier-statut-rendu', () => {
    const l = s.lire('2026-03-01');
    expect(l.statut).toBe('a_verifier');
    expect(LigneBareme.safeParse(l).success).toBe(true);
  });

  it('fin-exclue', () => {
    expect(s.lire('2025-12-31').effetDebut).toBe('2025-01-01');
    expect(s.lire('2026-01-01')).toMatchObject({ effetDebut: '2026-01-01', statut: 'a_verifier' });
    expect(s.lire('2025-01-01').effetDebut).toBe('2025-01-01');
  });

  it('bareme-absent-404', () => {
    expect(code(() => s.lire('2024-12-31'))).toBe('BAREME_ABSENT');
    expect(code(() => s.lire('2027-01-01'))).toBe('BAREME_ABSENT');
  });

  it('ambigu-et-illisible-jamais-de-repli', () => {
    const [p0] = jeu.parametres;
    if (!p0) throw new Error('jeu vide');
    const double = creerServiceVehiculesBareme({ ...jeu, parametres: [...jeu.parametres, { ...p0 }] });
    expect(code(() => double.lire('2025-06-15'))).toBe('BAREME_AMBIGU');
    const casse = creerServiceVehiculesBareme({ ...jeu, parametres: jeu.parametres.map((p) => (p.cle === 'bareme_ik_voiture' ? { ...p, valeur: 'pas du json' } : p)) });
    expect(code(() => casse.lire('2025-06-15'))).toBe('BAREME_ILLISIBLE');
    const sansMaj = creerServiceVehiculesBareme({ ...jeu, parametres: jeu.parametres.filter((p) => p.cle === 'bareme_ik_voiture') });
    expect(sansMaj.lire('2025-06-15').majorationPourcent).toBeNull();
    const majCassee = creerServiceVehiculesBareme({ ...jeu, parametres: jeu.parametres.map((p) => (p.cle !== 'bareme_ik_voiture' ? { ...p, valeur: '1,5' } : p)) });
    expect(code(() => majCassee.lire('2025-06-15'))).toBe('BAREME_ILLISIBLE');
  });

  it('openapi-contient-les-routes', () => {
    const doc = genererOpenapi() as { paths: Record<string, Record<string, { operationId?: string }>> };
    expect(doc.paths['/vehicules']?.get?.operationId).toBe('listerVehicules');
    expect(doc.paths['/parametres/bareme_ik_voiture']?.get?.operationId).toBe('lireBaremeIk');
    expect(routesEcritureSansEnTete()).toEqual([]);
  });
});
