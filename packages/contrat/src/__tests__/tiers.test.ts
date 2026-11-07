import { describe, expect, it } from 'vitest';
import { genererCompta } from '../../../donnees-fictives/src/compta.js';
import { creerServiceTiers } from '../domaines/tiers-service.js';
import { genererOpenapi, routesEcritureSansEnTete } from '../openapi.js';

const source = genererCompta().societes.find((s) => s.profil === 'pleine')!.tiers;

describe('tiers en mémoire', () => {
  it('tiers-enveloppe-et-tri', () => {
    const s = creerServiceTiers();
    const tout = s.lister();
    expect(tout.decalage).toBe(0);
    expect(tout.total).toBe(source.length);
    const codes = tout.body.map((t) => t.code);
    expect(codes).toEqual([...source.map((t) => t.code)].sort());
    expect(codes[0]).toBe('CLI001');
    expect(codes[codes.length - 1]).toBe('FOU006');
    expect(tout.body[0]).toEqual({ code: 'CLI001', nom: 'Lemoine Rénovation', type: 'client', email: 'client1@exemple.fr' });
    expect(tout.body.every((t) => t.email.endsWith('@exemple.fr'))).toBe(true);
    // pagination : le total reste celui du filtre
    const page = s.lister({ limite: 3, decalage: 2 });
    expect(page.body.map((t) => t.code)).toEqual(codes.slice(2, 5));
    expect(page.decalage).toBe(2);
    expect(page.total).toBe(source.length);
    expect(s.lister({ limite: 1 }).body).toHaveLength(1);
    expect(s.lister({ decalage: 100 })).toEqual({ body: [], decalage: 100, total: source.length });
    expect(s.lister({ limite: 0 }).body).toEqual([]);
    expect(s.lister({ limite: 1.5 }).body.length).toBeLessThanOrEqual(2);
    // ordre d'entrée inversé ou vide : le tri par code ne dépend pas de la source
    expect(creerServiceTiers([...source].reverse()).lister().body.map((t) => t.code)).toEqual(codes);
    const melange = source.map((_, i) => source[(i * 5) % source.length]!);
    expect(creerServiceTiers(melange).lister().body.map((t) => t.code)).toEqual(codes);
    expect(creerServiceTiers([]).lister()).toEqual({ body: [], decalage: 0, total: 0 });
    // deux services indépendants donnent le même résultat
    expect(creerServiceTiers().lister()).toEqual(tout);
  });

  it('tiers-filtre-type', () => {
    const s = creerServiceTiers();
    const clients = s.lister({ type: 'client' });
    const fournisseurs = s.lister({ type: 'fournisseur' });
    expect(clients.total).toBe(source.filter((t) => t.type === 'client').length);
    expect(clients.total).toBeGreaterThan(0);
    expect(clients.body.every((t) => t.type === 'client')).toBe(true);
    expect(fournisseurs.body.every((t) => t.type === 'fournisseur')).toBe(true);
    expect(clients.total + fournisseurs.total).toBe(source.length);
    expect(s.lister({ type: 'fournisseur', q: 'CLI' }).total).toBe(0);
  });

  it('tiers-recherche-sans-accent', () => {
    const s = creerServiceTiers();
    const nomsRenovation = s.lister({ q: 'RENOVATION' }).body;
    expect(nomsRenovation.length).toBeGreaterThan(0);
    expect(nomsRenovation.every((t) => t.nom === 'Lemoine Rénovation')).toBe(true);
    expect(s.lister({ q: 'rénovation' }).total).toBe(nomsRenovation.length);
    expect(s.lister({ q: 'immobiliere' }).body.every((t) => t.nom === 'Immobilière Marceau')).toBe(true);
    expect(s.lister({ q: 'fou00' }).total).toBe(6);
    expect(s.lister({ q: 'cli003' }).body.map((t) => t.code)).toEqual(['CLI003']);
    expect(s.lister({ q: '' }).total).toBe(source.length);
    expect(s.lister({ q: 'introuvable-xyz' }).total).toBe(0);
    expect(s.lister({ q: 'exemple.fr' }).total).toBe(0);
  });

  it('openapi-contient-lister-tiers', () => {
    const paths = (genererOpenapi() as { paths: Record<string, Record<string, { operationId: string; parameters: Array<{ name: string; in: string }> }>> }).paths;
    const op = paths['/tiers']?.['get'];
    expect(op?.operationId).toBe('listerTiers');
    expect(op?.parameters.map((p) => `${p.in}:${p.name}`).sort()).toEqual(['query:decalage', 'query:limite', 'query:q', 'query:type']);
    expect(paths['/tiers']?.['post']).toBeUndefined();
    expect(paths['/ecritures']).toBeDefined();
    expect(routesEcritureSansEnTete()).toEqual([]);
  });
});
