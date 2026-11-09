import { describe, expect, it } from 'vitest';
import { ETAPES } from '../../../../../../packages/noyau/src/pieces/etats.js';
import { FilesMemoire, NOMS_FILES, executeurAntivirus, prioriteDe, traiterUne, type ContexteFiles, type Executeur, type Priorite, type ReglagePriorite } from '../files.js';
import { AntivirusMemoire, DepotMemoire, HorlogeFixe, StockageMemoire } from '../../ports-memoire.js';
import { etapeEntree, sha256Hex, type ContexteEntree } from '../../etape-entree.js';

const T0 = '2026-11-09T08:00:00.000Z';
type Appels = Record<string, string[]>;
function monter(echec?: { etape: string; fois: number }) {
  const service = new FilesMemoire();
  const appels: Appels = Object.fromEntries(ETAPES.map((e) => [e, []]));
  let pannes = echec?.fois ?? 0;
  const executeurs = Object.fromEntries(ETAPES.map((e) => [e, async (id: string) => {
    if (echec?.etape === e && pannes > 0) { pannes -= 1; throw new Error('panne injectée'); }
    appels[e]!.push(id);
    return { pieces: [id] };
  }])) as Record<(typeof ETAPES)[number], Executeur>;
  const ctx: ContexteFiles = { service, executeurs, horloge: new HorlogeFixe(T0) };
  const vider = async (): Promise<void> => { for (let n = 0; n < 1000; n += 1) for (const e of ETAPES) await traiterUne(e, ctx).catch(() => undefined); };
  return { service, appels, ctx, vider };
}
const publier = (s: FilesMemoire, id: string, priorite: Priorite = 'unitaire'): Promise<'ajoutee' | 'existe'> =>
  s.publier(NOMS_FILES.entree, { cle: `${id}:entree`, pieceId: id, priorite });

describe('files de traitement', () => {
  it('cinq-files-enchainees', async () => {
    const m = monter();
    await publier(m.service, 'p-1');
    await m.vider();
    expect(ETAPES.map((e) => m.appels[e])).toEqual(ETAPES.map(() => ['p-1']));
    expect(Object.values(NOMS_FILES)).toEqual(['compta-pieces-entree', 'compta-pieces-antivirus', 'compta-pieces-preparation', 'compta-pieces-lecture', 'compta-pieces-classement']);
  });
  it('priorite-unitaire-avant-lot', async () => {
    const m = monter();
    await publier(m.service, 'lot-1', 'lot');
    await publier(m.service, 'lot-2', 'lot');
    await publier(m.service, 'seule', 'unitaire');
    for (let i = 0; i < 3; i += 1) await traiterUne('entree', m.ctx);
    expect(m.appels['entree']).toEqual(['seule', 'lot-1', 'lot-2']);
  });
  it('gros-documents-en-dernier', async () => {
    const m = monter();
    await publier(m.service, 'gros', 'gros_documents');
    await publier(m.service, 'lot', 'lot');
    await publier(m.service, 'unitaire', 'unitaire');
    for (let i = 0; i < 3; i += 1) await traiterUne('entree', m.ctx);
    expect(m.appels['entree']).toEqual(['unitaire', 'lot', 'gros']);
    const reglage: ReglagePriorite = { seuilGrosOctets: 1000 };
    const cas: [number, number, Priorite][] = [[10, 1, 'unitaire'], [10, 2, 'lot'], [1001, 1, 'gros_documents'], [1001, 5, 'gros_documents'], [1000, 1, 'unitaire']];
    expect(cas.map(([t, n]) => prioriteDe({ tailleOctets: t, nombreFichiers: n }, reglage))).toEqual(cas.map((c) => c[2]));
    for (const mauvais of [Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5]) {
      expect(() => prioriteDe({ tailleOctets: mauvais, nombreFichiers: 1 }, reglage)).toThrow();
      expect(() => prioriteDe({ tailleOctets: 1, nombreFichiers: mauvais }, reglage)).toThrow();
    }
  });
  it('tache-rejouee-sans-doublon', async () => {
    const m = monter();
    expect([await publier(m.service, 'p-1'), await publier(m.service, 'p-1')]).toEqual(['ajoutee', 'existe']);
    await m.vider();
    expect(await publier(m.service, 'p-1')).toBe('existe');
    await m.vider();
    expect(ETAPES.map((e) => m.appels[e]!.length)).toEqual(ETAPES.map(() => 1));
  });
  it('panne-reprise-a-la-derniere-etape', async () => {
    const m = monter({ etape: 'lecture', fois: 1 });
    for (let i = 0; i < 40; i += 1) await publier(m.service, `p-${String(i)}`);
    await m.vider();
    expect(await traiterUne('lecture', m.ctx).catch(() => 'x')).toBe('vide');
    expect(m.appels['entree']!.length + m.appels['antivirus']!.length + m.appels['preparation']!.length).toBe(120);
    expect([m.appels['lecture']!.length, new Set(m.appels['lecture']).size, m.appels['classement']!.length, new Set(m.appels['classement']).size]).toEqual([40, 40, 40, 40]);
  });
  it('relance-selon-prochaine-relance', async () => {
    const m = monter();
    const relance = new Date(Date.parse(T0) + 60_000).toISOString();
    let calls = 0;
    m.ctx.executeurs.entree = async () => (++calls === 1 ? { relanceA: relance } : { pieces: [] });
    await publier(m.service, 'p-1');
    expect(await traiterUne('entree', m.ctx)).toBe('reporte');
    expect(await traiterUne('entree', m.ctx)).toBe('vide');
    await expect(m.service.prendre(NOMS_FILES.entree, relance)).resolves.toMatchObject({ pieceId: 'p-1' });
  });
  it('abandon-sans-suite', async () => {
    const m = monter();
    m.ctx.executeurs.entree = async () => ({ fin: true });
    await publier(m.service, 'p-1');
    expect([await traiterUne('entree', m.ctx), await traiterUne('entree', m.ctx), await traiterUne('antivirus', m.ctx)]).toEqual(['fait', 'vide', 'vide']);
  });
  it('branchement-antivirus-indetermine-reporte', async () => {
    const stockage = new StockageMemoire();
    const depot = new DepotMemoire();
    const antivirus = new AntivirusMemoire();
    const horloge = new HorlogeFixe(T0);
    const entree: ContexteEntree = {
      societeId: 'soc-fictive', nouvelId: () => 'p-1', stockage, depot, horloge, antivirus, decompresser: () => new Uint8Array(),
      reglage: { archive: { ratioMax: 100, totalMaxOctets: 1_000_000, nombreMax: 50 }, image: { coteMax: 5000, pixelsMax: 10_000_000 }, limites: { tailleMaxOctets: 1_000_000, pagesMaxFileNormale: 10, pagesMaxModele: 10 }, delaisRelanceMinutes: [5] },
    };
    const octets = new TextEncoder().encode('%PDF-1.7 Facture fictive');
    await etapeEntree(octets, entree);
    antivirus.programmer(sha256Hex(octets), 'indetermine');
    const service = new FilesMemoire();
    const executeurs = { ...monter().ctx.executeurs, antivirus: executeurAntivirus(entree) };
    await service.publier(NOMS_FILES.antivirus, { cle: 'p-1:antivirus', pieceId: 'p-1', priorite: 'unitaire' });
    const ctx: ContexteFiles = { service, executeurs, horloge };
    expect(await traiterUne('antivirus', ctx)).toBe('reporte');
    expect(await traiterUne('antivirus', ctx)).toBe('vide');
    const piece = await depot.parId('p-1');
    expect(piece).toMatchObject({ etat: 'en_erreur', tentatives: 1 });
    await expect(service.prendre(NOMS_FILES.antivirus, String(piece?.prochaineRelanceA))).resolves.toMatchObject({ pieceId: 'p-1' });
  });
});
