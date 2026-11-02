import { describe, expect, it } from 'vitest';
import { contrat, ConflitVersion, creerService, genererOpenapi, routesEcritureSansEnTete, EnTeteEcriture } from '../index.js';

describe('contrat', () => {
  it('expose exactement 3 routes', () => {
    expect(Object.keys(contrat.ecritures).sort()).toEqual(['creer', 'lister', 'modifier']);
  });

  it('aucune route d\'écriture sans en-tête Idempotency-Key', () => {
    expect(routesEcritureSansEnTete()).toEqual([]);
  });

  it('refuse une écriture sans en-tête', () => {
    expect(EnTeteEcriture.safeParse({}).success).toBe(false);
    expect(EnTeteEcriture.safeParse({ 'idempotency-key': 'cle-fictive-1' }).success).toBe(true);
  });

  it('le document OpenAPI déclare 409 et l\'en-tête', () => {
    const doc = JSON.stringify(genererOpenapi());
    expect(doc).toContain('"409"');
    expect(doc).toContain('Idempotency-Key');
  });
});

describe('service', () => {
  const entree = { libelle: 'Achat fictif', montantCentimes: 1250 };

  it('2 envois avec la même clé = 1 effet', () => {
    const s = creerService();
    const a = s.creer('cle-fictive-1', entree);
    const b = s.creer('cle-fictive-1', entree);
    expect(b).toEqual(a);
    expect(s.lister()).toHaveLength(1);
  });

  it('des clés différentes créent deux effets', () => {
    const s = creerService();
    s.creer('cle-fictive-1', entree);
    s.creer('cle-fictive-2', entree);
    expect(s.lister()).toHaveLength(2);
  });

  it('version périmée = 409', () => {
    const s = creerService();
    const e = s.creer('cle-fictive-1', entree);
    s.modifier('cle-fictive-2', e.id, { ...entree, montantCentimes: 1300, version: 1 });
    let erreur: unknown;
    try {
      s.modifier('cle-fictive-3', e.id, { ...entree, montantCentimes: 1400, version: 1 });
    } catch (x) {
      erreur = x;
    }
    expect(erreur).toBeInstanceOf(ConflitVersion);
    expect((erreur as ConflitVersion).status).toBe(409);
    expect((erreur as ConflitVersion).versionActuelle).toBe(2);
  });

  it('rejouer une modification ne l\'applique qu\'une fois', () => {
    const s = creerService();
    const e = s.creer('cle-fictive-1', entree);
    const m = { ...entree, montantCentimes: 1300, version: 1 };
    s.modifier('cle-fictive-2', e.id, m);
    const rejeu = s.modifier('cle-fictive-2', e.id, m);
    expect(rejeu.version).toBe(2);
    expect(s.lister()[0]?.version).toBe(2);
  });
});
