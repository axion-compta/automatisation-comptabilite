import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { genererOpenapi } from '../openapi.js';

type Document = { paths?: Record<string, Record<string, { operationId?: string }>> };

const SEGMENTS = ['payer', 'paiement', 'paiements', 'virer', 'initier', 'envoyer', 'relancer', 'relances'];
const PREFIXES = ['payer', 'initier', 'virer', 'envoyer', 'relancer'];
const APPELS = ['fetch(', 'XMLHttpRequest', 'node:http', 'node:https', 'undici', 'axios'];

const normaliser = (t: string): string => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function routesInterdites(document: Document) {
  const trouvees: Array<{ methode: string; chemin: string; operationId: string; motif: string }> = [];
  for (const [chemin, operations] of Object.entries(document.paths ?? {})) {
    const segments = chemin.split('/').filter((s) => s !== '' && !s.startsWith('{')).map(normaliser);
    for (const [methode, operation] of Object.entries(operations ?? {})) {
      const operationId = operation?.operationId ?? '';
      const segment = SEGMENTS.find((s) => segments.includes(s));
      const prefixe = PREFIXES.find((p) => normaliser(operationId).startsWith(p));
      const motif = segment !== undefined ? `segment:${segment}` : prefixe !== undefined ? `operation:${prefixe}` : '';
      if (motif !== '') trouvees.push({ methode, chemin, operationId, motif });
    }
  }
  return trouvees;
}

function appelsSortants(fichiers: Array<{ chemin: string; texte: string }>) {
  const trouves: Array<{ chemin: string; motif: string }> = [];
  for (const { chemin, texte } of fichiers) {
    const motif = APPELS.find((a) => texte.includes(a));
    if (motif !== undefined) trouves.push({ chemin, motif });
  }
  return trouves;
}

const doc = (chemin: string, operationId?: string): Document => ({
  paths: { [chemin]: { post: operationId === undefined ? {} : { operationId } } },
});

describe('routes de paiement interdites (le logiciel ne paie jamais)', () => {
  it('contrat-actuel-sans-route-interdite', () => {
    const actuel = genererOpenapi() as Document;
    expect(Object.keys(actuel.paths ?? {}).length).toBeGreaterThan(0);
    expect(routesInterdites(actuel)).toEqual([]);
  });

  it('segment-payer-detecte', () => {
    expect(routesInterdites(doc('/fournisseurs/lots/{id}/payer', 'autre'))).toEqual([
      { methode: 'post', chemin: '/fournisseurs/lots/{id}/payer', operationId: 'autre', motif: 'segment:payer' },
    ]);
  });

  it.each(SEGMENTS)('segment %s detecte', (mot) => {
    expect(routesInterdites(doc(`/banque/${mot}/x`))).toHaveLength(1);
  });

  it('operation-id-detecte', () => {
    expect(routesInterdites(doc('/relances-ok', 'envoyerRelance'))).toEqual([
      { methode: 'post', chemin: '/relances-ok', operationId: 'envoyerRelance', motif: 'operation:envoyer' },
    ]);
  });

  it.each(PREFIXES)('operationId %s detecte', (mot) => {
    expect(routesInterdites(doc('/x', `${mot.toUpperCase()}Truc`))).toHaveLength(1);
  });

  it('a-payer-et-marquer-paye-permis', () => {
    expect(routesInterdites(doc('/factures/a-payer', 'listerAPayer'))).toEqual([]);
    expect(routesInterdites(doc('/factures/{id}/marquer-paye', 'marquerPaye'))).toEqual([]);
  });

  it('accents-et-casse-ignores', () => {
    expect(routesInterdites(doc('/Relancer'))).toHaveLength(1);
    expect(routesInterdites(doc('/PAIEMENTS'))).toHaveLength(1);
    expect(routesInterdites(doc('/x', 'Initier'))).toHaveLength(1);
  });

  it('cas-limites-sans-exception', () => {
    expect(routesInterdites({})).toEqual([]);
    expect(routesInterdites({ paths: {} })).toEqual([]);
    expect(routesInterdites(doc(''))).toEqual([]);
    expect(routesInterdites(doc('/x/{payer}'))).toEqual([]);
    expect(routesInterdites(doc('/x'))).toEqual([]);
  });

  it.each(APPELS)('appel-sortant-detecte %s', (appel) => {
    const res = appelsSortants([{ chemin: 'a.ts', texte: `const r = ${appel} ;` }, { chemin: 'b.ts', texte: 'ok' }]);
    expect(res.map((r) => r.chemin)).toEqual(['a.ts']);
  });

  it('depot-reel-sans-appel-sortant', () => {
    const racine = resolve(import.meta.dirname, '../../../..');
    const liste = execFileSync('git', ['ls-files', '-z'], { cwd: racine, encoding: 'utf8' }).split('\0');
    const cibles = liste.filter(
      (f) =>
        /^(packages\/noyau\/src\/banque\/|apps\/serveur\/src\/banque\/|apps\/serveur\/src\/domaines\/banque[^/]*\.ts$)/.test(f) &&
        f.endsWith('.ts') &&
        !f.includes('__tests__/') &&
        !/\.(test|spec)\.ts$/.test(f),
    );
    const fichiers = cibles.map((chemin) => ({ chemin, texte: readFileSync(resolve(racine, chemin), 'utf8') }));
    expect(appelsSortants(fichiers)).toEqual([]);
  });
});
