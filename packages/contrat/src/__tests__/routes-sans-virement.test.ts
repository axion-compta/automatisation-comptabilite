import { describe, expect, it } from 'vitest';
import { contrat } from '../routes.js';
import { genererOpenapi } from '../openapi.js';

type Route = { methode: string; chemin: string; nom: string };
type Doc = { paths?: Record<string, Record<string, { operationId?: string }>> };

const FRAGMENTS = ['virer', 'virement', 'emettrepaiement', 'initierpaiement', 'sepa', 'transfert'];

function estPaiement(texte: string): boolean {
  const compact = texte.toLowerCase().replace(/[_\-/]/g, '');
  return FRAGMENTS.some((f) => compact.includes(f)) || /[Pp]ayer(?![a-z])/.test(texte);
}

function routesDePaiement(routes: Route[]): Route[] {
  return routes.filter((r) => estPaiement(r.nom) || estPaiement(r.chemin));
}

function routesDuContrat(noeud: unknown): Route[] {
  if (noeud === null || typeof noeud !== 'object') return [];
  const orpc = (noeud as { '~orpc'?: { route?: { method?: string; path?: string; operationId?: string } } })['~orpc'];
  if (orpc) return [{ methode: orpc.route?.method ?? '', chemin: orpc.route?.path ?? '', nom: orpc.route?.operationId ?? '' }];
  return Object.values(noeud).flatMap(routesDuContrat);
}

function routesOpenapi(doc: Doc): Route[] {
  return Object.entries(doc.paths ?? {}).flatMap(([chemin, ops]) =>
    Object.entries(ops ?? {}).map(([methode, op]) => ({ methode, chemin, nom: op?.operationId ?? '' })),
  );
}

describe('contrat sans virement ni paiement émis', () => {
  it('contrat-sans-route-de-paiement', () => {
    const routes = routesDuContrat(contrat);
    expect(routes.length).toBeGreaterThan(0);
    expect(routesDePaiement(routes)).toEqual([]);
  });

  it('openapi-sans-route-de-paiement', () => {
    const routes = routesOpenapi(genererOpenapi() as Doc);
    expect(routes.length).toBeGreaterThan(0);
    expect(routesDePaiement(routes)).toEqual([]);
  });

  it('detecteur-rougit-sur-un-exemple', () => {
    const exemple: Route[] = [
      { methode: 'POST', chemin: '/v1/a', nom: 'emettreVirement' },
      { methode: 'POST', chemin: '/v1/x/payer', nom: 'autre' },
      { methode: 'POST', chemin: '/transferts', nom: 'creer' },
    ];
    expect(routesDePaiement(exemple)).toEqual(exemple);
    expect(routesDePaiement([{ methode: 'POST', chemin: '/a/emettre_paiement', nom: '' }])).toHaveLength(1);
    expect(routesDePaiement([{ methode: 'POST', chemin: '/a/initier-paiement', nom: '' }])).toHaveLength(1);
    expect(routesDePaiement([{ methode: 'POST', chemin: '/a', nom: 'payerFacture' }])).toHaveLength(1);
    expect(routesDePaiement([{ methode: 'POST', chemin: '/a/SEPA', nom: '' }])).toHaveLength(1);
    expect(routesDePaiement([{ methode: 'POST', chemin: '/a/virer', nom: '' }])).toHaveLength(1);
  });

  it('detecteur-ignore-le-remboursement-prepare', () => {
    const ok: Route[] = [
      { methode: 'POST', chemin: '/remboursements', nom: 'preparerRemboursement' },
      { methode: 'POST', chemin: '/frais/{id}/payeur', nom: 'definirPayeur' },
    ];
    expect(routesDePaiement(ok)).toEqual([]);
    expect(routesDePaiement([])).toEqual([]);
    expect(routesDuContrat(undefined)).toEqual([]);
    expect(routesOpenapi({})).toEqual([]);
  });
});
