import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parametresRequete, contrat, ConflitVersion, creerService, genererOpenapi, routesEcritureSansEnTete, EnTeteEcriture } from '../index.js';

describe('parametresRequete', () => {
  it('tire noms, obligation et bornes du schéma Zod', () => {
    const schema = z.object({ taille: z.coerce.number().int().min(5), page: z.coerce.number().int().min(0).optional() }).optional();
    expect(parametresRequete(schema)).toEqual([
      { name: 'taille', in: 'query', required: true, schema: { type: 'integer', minimum: 5, maximum: 9007199254740991 } },
      { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 0, maximum: 9007199254740991 } },
    ]);
    expect(parametresRequete(undefined)).toEqual([]);
  });
});

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
    expect(doc).toContain('"decalage"');
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

  it('idempotence-par-route : la même clé sur creer et modifier = deux effets distincts', () => {
    const s = creerService();
    const e = s.creer('cle-fictive-1', entree);
    const m = s.modifier('cle-fictive-1', e.id, { ...entree, montantCentimes: 1300, version: 1 });
    expect(m.version).toBe(2);
    expect(s.lister()[0]?.montantCentimes).toBe(1300);
  });

  it('page : décalage et total', () => {
    const s = creerService();
    for (let i = 1; i <= 4; i++) s.creer('cle-fictive-' + i, { ...entree, libelle: 'Achat ' + i });
    const p = s.page({ limite: 2, decalage: 1 });
    expect(p.body.map((e) => e.libelle)).toEqual(['Achat 2', 'Achat 3']);
    expect([p.decalage, p.total]).toEqual([1, 4]);
    expect(s.page()).toMatchObject({ decalage: 0, total: 4 });
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
