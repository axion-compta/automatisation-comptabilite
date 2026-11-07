import { oc } from '@orpc/contract';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { contrat } from '../../routes.js';
import { ErreurCatalogue, catalogueExportable, colonnesTexte } from '../catalogue.js';
const liste = (operationId: string, ligne: z.ZodType, chemin: `/${string}` = '/x') =>
  oc.route({ method: 'GET', path: chemin, operationId }).output(z.object({ body: z.array(ligne) }));
describe('catalogue des listes exportables', () => {
  it('contient-plan-tiers-ecritures', () => {
    const c = catalogueExportable(contrat);
    expect(c.map((l) => l.code)).toEqual(['listerEcritures', 'listerExercices', 'listerPlan', 'listerTiers']);
    const plan = c.find((l) => l.code === 'listerPlan')!;
    expect(plan.methode).toBe('GET');
    expect(plan.chemin).toBe('/exercices/{exercice}/plan');
    expect(plan.colonnes).toEqual([
      { code: 'numero', type: 'texte' },
      { code: 'libelle', type: 'texte' },
      { code: 'classe', type: 'entier' },
      { code: 'soldeCentimes', type: 'centimes' },
    ]);
    expect(plan.colonneTotal).toBe('soldeCentimes');
    const ecr = c.find((l) => l.code === 'listerEcritures')!;
    expect(ecr.colonneTotal).toBe('montantCentimes');
    expect(ecr.colonnes.map((x) => x.type)).toEqual(['texte', 'texte', 'centimes', 'entier']);
    const tiers = c.find((l) => l.code === 'listerTiers')!;
    expect(tiers.colonnes.map((x) => x.type)).toEqual(['texte', 'texte', 'texte', 'texte']);
    expect('colonneTotal' in tiers).toBe(false);
    expect(c.find((l) => l.code === 'listerExercices')!.colonnes.map((x) => x.code)).toEqual(['id', 'libelle', 'debut', 'fin', 'statut']);
  });
  it('routes-non-liste-exclues', () => {
    const faux = {
      creer: oc.route({ method: 'POST', path: '/a', operationId: 'creerA' }).output(z.object({ body: z.array(z.object({ id: z.string() })) })),
      modifier: oc.route({ method: 'PUT', path: '/a/{id}', operationId: 'modifierA' }).output(z.object({ body: z.array(z.object({ id: z.string() })) })),
      suppr: oc.route({ method: 'DELETE', path: '/a/{id}', operationId: 'supprA' }).output(z.object({ body: z.array(z.object({ id: z.string() })) })),
      sansMethode: oc.route({ path: '/b', operationId: 'sansMethode' }).output(z.object({ body: z.array(z.object({ id: z.string() })) })),
      unSeul: oc.route({ method: 'GET', path: '/c', operationId: 'unSeulC' }).output(z.object({ body: z.object({ id: z.string() }) })),
      pasDeBody: oc.route({ method: 'GET', path: '/d', operationId: 'pasDeBodyD' }).output(z.object({ autre: z.array(z.object({ id: z.string() })) })),
      tableauNu: oc.route({ method: 'GET', path: '/e', operationId: 'tableauNuE' }).output(z.array(z.object({ id: z.string() }))),
      tableauTextes: liste('tableauTextes', z.string()),
      sansSortie: oc.route({ method: 'GET', path: '/f', operationId: 'sansSortieF' }),
      sansChemin: oc.route({ method: 'GET', operationId: 'sansCheminG' }).output(z.object({ body: z.array(z.object({ id: z.string() })) })),
      vraie: liste('vraieListe', z.object({ id: z.string() })),
    };
    expect(catalogueExportable(faux).map((l) => l.code)).toEqual(['vraieListe']);
    expect(catalogueExportable(null)).toEqual([]);
    expect(catalogueExportable(undefined)).toEqual([]);
    expect(catalogueExportable({ a: 1, b: 'x', c: [1, 2] })).toEqual([]);
  });
  it('centimes-par-suffixe', () => {
    const [l] = catalogueExportable({
      v: liste('listerMontants', z.object({ totalCentimes: z.number().int(), centimes: z.number().int(), nombre: z.number().int(), reel: z.number() })),
    });
    expect(l!.colonnes).toEqual([
      { code: 'totalCentimes', type: 'centimes' },
      { code: 'centimes', type: 'entier' },
      { code: 'nombre', type: 'entier' },
      { code: 'reel', type: 'texte' },
    ]);
    expect(l!.colonneTotal).toBe('totalCentimes');
    // La première colonne centimes donne le total, pas la dernière.
    const [m] = catalogueExportable({
      v: liste('listerDeux', z.object({ id: z.string(), aCentimes: z.number().int(), bCentimes: z.number().int() })),
    });
    expect(m!.colonneTotal).toBe('aCentimes');
  });
  it('inconnu-devient-texte', () => {
    const [l] = catalogueExportable({
      v: liste(
        'listerInconnus',
        z.object({
          union: z.union([z.string(), z.number()]),
          objet: z.object({ x: z.string() }),
          tout: z.any(),
          tableau: z.array(z.string()),
          enumeration: z.enum(['a', 'b']),
          nullable: z.number().int().nullable(),
          date: z.iso.date(),
          dateMotif: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          dateMotifCrochets: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/),
          autreMotif: z.string().regex(/^[a-z]+$/),
          vrai: z.boolean(),
          optionnel: z.number().int().optional(),
        }),
      ),
    });
    const types = Object.fromEntries(l!.colonnes.map((c) => [c.code, c.type]));
    expect(types).toEqual({
      union: 'texte',
      objet: 'texte',
      tout: 'texte',
      tableau: 'texte',
      enumeration: 'texte',
      nullable: 'texte',
      date: 'date',
      dateMotif: 'date',
      dateMotifCrochets: 'date',
      autreMotif: 'texte',
      vrai: 'booleen',
      optionnel: 'entier',
    });
    const texte = colonnesTexte([l!]).map((x) => x.colonne);
    expect(texte).toEqual(['union', 'objet', 'tout', 'tableau', 'enumeration', 'nullable', 'autreMotif']);
    expect(colonnesTexte([l!])[0]).toEqual({ liste: 'listerInconnus', colonne: 'union' });
    expect(colonnesTexte([])).toEqual([]);
  });
  it('catalogue-suit-le-contrat', () => {
    const avant = catalogueExportable(contrat).map((l) => l.code);
    const forge = {
      ...contrat,
      nouveau: { profond: { listerFactures: liste('listerFactures', z.object({ numero: z.string(), montantCentimes: z.number().int() }), '/factures') } },
    };
    const apres = catalogueExportable(forge);
    expect(apres.map((l) => l.code)).toEqual([...avant, 'listerFactures'].sort());
    const f = apres.find((l) => l.code === 'listerFactures')!;
    expect(f.chemin).toBe('/factures');
    expect(f.colonneTotal).toBe('montantCentimes');
    expect(colonnesTexte(apres)).toContainEqual({ liste: 'listerFactures', colonne: 'numero' });
    // Sans operationId : le chemin dans le contrat sert de code.
    const sans = catalogueExportable({ a: { b: oc.route({ method: 'GET', path: '/z' }).output(z.object({ body: z.array(z.object({ id: z.string() })) })) } });
    expect(sans.map((l) => l.code)).toEqual(['a.b']);
    // Cycle dans l'objet : pas de boucle infinie.
    const cyclique: Record<string, unknown> = { v: liste('listerCycle', z.object({ id: z.string() })) };
    cyclique['soi'] = cyclique;
    expect(catalogueExportable(cyclique).map((l) => l.code)).toEqual(['listerCycle']);
  });
  it('ordre-stable', () => {
    const a = liste('listerA', z.object({ id: z.string() }), '/a');
    const b = liste('listerB', z.object({ id: z.string() }), '/b');
    const c = liste('listerC', z.object({ id: z.string() }), '/c');
    const un = catalogueExportable({ c, a, b });
    const deux = catalogueExportable({ b, c, a });
    expect(un.map((l) => l.code)).toEqual(['listerA', 'listerB', 'listerC']);
    expect(deux).toEqual(un);
    expect(catalogueExportable(contrat)).toEqual(catalogueExportable(contrat));
  });
  it('liste-sans-colonne-refusee', () => {
    const vide = { v: liste('listerVide', z.object({})) };
    expect(() => catalogueExportable(vide)).toThrow(ErreurCatalogue);
    try {
      catalogueExportable(vide);
    } catch (e) {
      expect((e as ErreurCatalogue).code).toBe('liste_sans_colonne');
      expect((e as ErreurCatalogue).liste).toBe('listerVide');
      expect((e as Error).message).toContain('listerVide');
    }
  });
});
