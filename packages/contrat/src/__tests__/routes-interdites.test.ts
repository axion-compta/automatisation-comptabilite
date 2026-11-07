import { describe, expect, it } from 'vitest';
import { genererOpenapi } from '../openapi.js';

type Document = { paths?: Record<string, Record<string, { operationId?: string }>> };

const FRAGMENTS = ['deposer', 'depot', 'transmettre', 'transmission', 'envoyer_administration', 'envoyer-administration', 'teledeclarer'];

function normaliser(texte: string): string {
  return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function routesInterdites(document: Document) {
  const trouvees: Array<{ methode: string; chemin: string; operationId: string; fragment: string }> = [];
  for (const [chemin, operations] of Object.entries(document.paths ?? {})) {
    for (const [methode, operation] of Object.entries(operations ?? {})) {
      const operationId = operation?.operationId ?? '';
      const cibles = [normaliser(chemin), normaliser(operationId)];
      const fragment = FRAGMENTS.find((f) => cibles.some((c) => c.includes(f)));
      if (fragment !== undefined) trouvees.push({ methode, chemin, operationId, fragment });
    }
  }
  return trouvees;
}

describe('routes interdites (préparer, jamais déposer)', () => {
  it('contrat-actuel-sans-route-interdite', () => {
    const doc = genererOpenapi() as Document;
    expect(Object.keys(doc.paths ?? {}).length).toBeGreaterThan(0);
    expect(routesInterdites(doc)).toEqual([]);
  });

  it('fragment-dans-le-chemin-detecte', () => {
    const doc: Document = { paths: { '/tva/declarations/{d}/deposer': { post: { operationId: 'autre' } } } };
    expect(routesInterdites(doc)).toEqual([
      { methode: 'post', chemin: '/tva/declarations/{d}/deposer', operationId: 'autre', fragment: 'deposer' },
    ]);
  });

  it('fragment-dans-operation-id-detecte', () => {
    const doc: Document = { paths: { '/tva/declarations': { post: { operationId: 'transmettreDeclaration' } } } };
    const res = routesInterdites(doc);
    expect(res).toHaveLength(1);
    expect(res[0]?.fragment).toBe('transmettre');
  });

  it('accents-et-casse-ignores', () => {
    const doc: Document = { paths: { '/Déposer': { put: {} }, '/DÉPÔT': { get: {} }, '/Télédéclarer': { get: {} } } };
    expect(routesInterdites(doc).map((r) => r.chemin).sort()).toEqual(['/DÉPÔT', '/Déposer', '/Télédéclarer']);
  });

  it('accuse-autorise', () => {
    const doc: Document = { paths: { '/tva/declarations/{d}/accuse': { post: { operationId: 'enregistrerAccuse' } } } };
    expect(routesInterdites(doc)).toEqual([]);
  });

  it('cas-limites-sans-exception', () => {
    expect(routesInterdites({})).toEqual([]);
    expect(routesInterdites({ paths: {} })).toEqual([]);
    expect(routesInterdites({ paths: { '': { get: {} } } })).toEqual([]);
    expect(routesInterdites({ paths: { '/x': { get: {} } } })).toEqual([]);
  });

  it('envoyer-administration-detecte', () => {
    const doc: Document = { paths: { '/fec/envoyer_administration': { post: {} }, '/fec/envoyer-administration': { post: {} } } };
    expect(routesInterdites(doc)).toHaveLength(2);
  });
});
