import { describe, expect, it } from 'vitest';
import { CATALOGUE_GESTES } from '../../../noyau/src/principes/gestes.js';
import { ROUTES_A_GESTE, VERBES_SENSIBLES } from '../gestes-routes.js';
import { genererOpenapi } from '../openapi.js';

type Document = { paths?: Record<string, Record<string, { operationId?: string }>> };
type Carte = Readonly<Record<string, string>>;

const CODES = new Set(CATALOGUE_GESTES.map((g) => g.code as string));

/** Routes dont l'operationId commence par un verbe sensible sans geste connu, et codes inconnus de la carte. */
function routesSensiblesSansGeste(doc: Document, carte: Carte): string[] {
  const connues = new Map(Object.entries(carte).map(([id, code]) => [id.toLowerCase(), code]));
  const problemes: string[] = [];
  for (const operations of Object.values(doc.paths ?? {})) {
    for (const operation of Object.values(operations ?? {})) {
      const id = (operation?.operationId ?? '').toLowerCase();
      if (!VERBES_SENSIBLES.some((verbe) => id.startsWith(verbe))) continue;
      const code = connues.get(id);
      if (code === undefined) problemes.push(`sans_geste:${id}`);
      else if (!CODES.has(code)) problemes.push(`code_inconnu:${id}`);
    }
  }
  for (const [id, code] of Object.entries(carte)) if (!CODES.has(code)) problemes.push(`code_inconnu:${id.toLowerCase()}`);
  return [...new Set(problemes)];
}

const docAvec = (...ids: string[]): Document => ({
  paths: Object.fromEntries(ids.map((id, i) => [`/r${i}`, { post: { operationId: id } }])),
});

describe('carte des routes à geste humain', () => {
  it('contrat-actuel-vert', () => {
    expect(routesSensiblesSansGeste(genererOpenapi() as Document, ROUTES_A_GESTE)).toEqual([]);
    expect(VERBES_SENSIBLES).toHaveLength(14);
    expect(VERBES_SENSIBLES.every((v) => v === v.toLowerCase() && v.length > 0)).toBe(true);
    expect(Object.values(ROUTES_A_GESTE).every((code) => CODES.has(code))).toBe(true);
  });

  it('route-sensible-forgee-sans-geste-rouge', () => {
    expect(routesSensiblesSansGeste(docAvec('validerLot'), {})).toEqual(['sans_geste:validerlot']);
    for (const verbe of VERBES_SENSIBLES) {
      expect(routesSensiblesSansGeste(docAvec(`${verbe}X`), {})).toEqual([`sans_geste:${verbe}x`]);
    }
  });

  it('route-declaree-acceptee', () => {
    expect(routesSensiblesSansGeste(docAvec('validerLot'), { validerLot: 'G01' })).toEqual([]);
  });

  it('code-inconnu-dans-la-carte-rouge', () => {
    expect(routesSensiblesSansGeste(docAvec('validerLot'), { validerLot: 'G13' })).toEqual(['code_inconnu:validerlot']);
    expect(routesSensiblesSansGeste(docAvec('listerTiers'), { autreRoute: 'G13' })).toEqual(['code_inconnu:autreroute']);
  });

  it('creer-ecriture-n-est-pas-un-geste', () => {
    expect(routesSensiblesSansGeste(docAvec('creerEcriture', 'creerCompteTiers'), {})).toEqual(['sans_geste:creercomptetiers']);
    expect(routesSensiblesSansGeste(docAvec('creerEcriture', 'preciserValider'), {})).toEqual([]);
  });

  it('casse-ignoree', () => {
    expect(routesSensiblesSansGeste(docAvec('ValiderLot'), {})).toEqual(['sans_geste:validerlot']);
    expect(routesSensiblesSansGeste(docAvec('VALIDERLOT'), { validerLot: 'G01' })).toEqual([]);
  });
});
