import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrat } from '../routes.js';

type Route = { methode: string; chemin: string; nom: string };

const FRAGMENTS = ['creerfacture', 'creerdevis', 'numeroter', 'emettre', 'envoyerfacture', 'envoyerdevis', 'facturedabonnement'];
// Facturer l'abonnement du module reste hors module (ADR 0008) : « abonnement » associé à « factur » est interdit,
// quel que soit l'ordre. « abonnement » seul reste permis (accès, volume, demande de palier).
const ABONNEMENT = 'abonnement';
const FACTURE = 'factur';
const ECRITURES = ['POST', 'PUT', 'PATCH'];

const simplifier = (t: string): string => t.toLowerCase().replace(/[_\-/]/g, '');

function routesInterdites(routes: Route[]): Route[] {
  return routes.filter((r) => {
    const cibles = [simplifier(r.nom), simplifier(r.chemin)];
    if (FRAGMENTS.some((f) => cibles.some((c) => c.includes(f)))) return true;
    if (cibles.some((c) => c.includes(ABONNEMENT) && c.includes(FACTURE))) return true;
    const fin = r.chemin.toLowerCase();
    return ECRITURES.includes(r.methode.toUpperCase()) && (fin.endsWith('/factures') || fin.endsWith('/devis'));
  });
}

function routesDuContrat(noeud: unknown, nom: string, acc: Route[] = []): Route[] {
  if (typeof noeud !== 'object' && typeof noeud !== 'function') return acc;
  if (noeud === null) return acc;
  const def = (noeud as Record<string, unknown>)['~orpc'] as { route?: { method?: string; path?: string; operationId?: string } } | undefined;
  if (def !== undefined) {
    const r = def.route ?? {};
    acc.push({ methode: r.method ?? 'GET', chemin: r.path ?? '', nom: `${nom} ${r.operationId ?? ''}` });
    return acc;
  }
  for (const [cle, enfant] of Object.entries(noeud)) routesDuContrat(enfant, `${nom}.${cle}`, acc);
  return acc;
}

function routesOpenapi(): Route[] {
  const doc = JSON.parse(readFileSync(new URL('../../openapi.json', import.meta.url), 'utf8')) as {
    paths?: Record<string, Record<string, { operationId?: string }>>;
  };
  const routes: Route[] = [];
  for (const [chemin, ops] of Object.entries(doc.paths ?? {})) {
    for (const [methode, op] of Object.entries(ops)) routes.push({ methode, chemin, nom: op.operationId ?? '' });
  }
  return routes;
}

describe('aucune route de création, numérotation, émission ou envoi de facture', () => {
  it('contrat-sans-route-d-emission', () => {
    const routes = routesDuContrat(contrat, 'contrat');
    expect(routes.length).toBeGreaterThan(3);
    expect(routesInterdites(routes)).toEqual([]);
  });

  it('openapi-sans-route-d-emission', () => {
    const routes = routesOpenapi();
    expect(routes.length).toBeGreaterThan(3);
    expect(routesInterdites(routes)).toEqual([]);
  });

  it('detecteur-rougit-sur-un-exemple', () => {
    const exemple: Route[] = [
      { methode: 'GET', chemin: '/x', nom: 'creerFacture' },
      { methode: 'GET', chemin: '/v1/x/envoyer-facture', nom: 'autre' },
      { methode: 'POST', chemin: '/factures', nom: 'autre' },
    ];
    expect(routesInterdites(exemple)).toEqual(exemple);
    expect(routesInterdites([{ methode: 'PATCH', chemin: '/a/devis', nom: 'z' }])).toHaveLength(1);
    expect(routesInterdites([{ methode: 'GET', chemin: '/x', nom: 'Numéroter'.replace('é', 'e') }])).toHaveLength(1);
  });

  it('detecteur-ignore-la-lecture', () => {
    expect(routesInterdites([{ methode: 'GET', chemin: '/ventes', nom: 'lireVente' }])).toEqual([]);
    expect(routesInterdites([{ methode: 'GET', chemin: '/factures', nom: 'listerFactures' }])).toEqual([]);
    expect(routesInterdites([])).toEqual([]);
  });

  it('aucune-route-facture-abonnement', () => {
    expect(routesInterdites(routesDuContrat(contrat, 'contrat'))).toEqual([]);
    const abonnement = (r: Route): boolean => simplifier(`${r.nom} ${r.chemin}`).includes(ABONNEMENT);
    const reelles = [...routesDuContrat(contrat, 'contrat'), ...routesOpenapi()];
    expect(reelles.some(abonnement)).toBe(true); // la garde porte sur de vraies routes d'abonnement
    expect(reelles.filter((r) => abonnement(r) && simplifier(`${r.nom} ${r.chemin}`).includes(FACTURE))).toEqual([]);
    const interdites: Route[] = [
      { methode: 'GET', chemin: '/abonnement/factures', nom: 'x' },
      { methode: 'GET', chemin: '/v1/facture-d-abonnement', nom: 'x' },
      { methode: 'GET', chemin: '/x', nom: 'lireFactureAbonnement' },
      { methode: 'GET', chemin: '/x', nom: 'abonnement_facturation' },
    ];
    expect(routesInterdites(interdites)).toEqual(interdites);
    // les routes d'abonnement sans facture, et les factures sans abonnement en lecture, restent permises
    expect(routesInterdites([{ methode: 'POST', chemin: '/abonnement/demandes-palier', nom: 'demanderPalier' }])).toEqual([]);
    expect(routesInterdites([{ methode: 'GET', chemin: '/acces', nom: 'lireAcces' }])).toEqual([]);
  });
});
