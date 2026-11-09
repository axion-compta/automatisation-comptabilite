import { describe, expect, it } from 'vitest';
import { ETAPES } from '../../../../../../packages/noyau/src/pieces/etats.js';
import { FilesMemoire, NOMS_FILES, executeurAntivirus, executeurClassement, executeurEntree, executeurLecture, executeurPreparation, prioriteDe, traiterUne, type ContexteFiles, type Executeur, type Priorite, type ReglagePriorite } from '../files.js';
import { AntivirusMemoire, DepotMemoire, HorlogeFixe, StockageMemoire } from '../../ports-memoire.js';
import { etapeEntree, sha256Hex, type ContexteEntree } from '../../etape-entree.js';
import type { ContexteLecture, ResultatLecture } from '../../etape-lecture.js';
import type { ContexteClassement } from '../../etape-classement.js';
import type { ResultatPreparation } from '../../etape-preparation.js';
import type { PieceEnregistree } from '../../ports.js';

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
    const m = monter(); await publier(m.service, 'p-1'); await m.vider();
    expect(ETAPES.map((e) => m.appels[e])).toEqual(ETAPES.map(() => ['p-1']));     expect(Object.values(NOMS_FILES)).toEqual(['compta-pieces-entree', 'compta-pieces-antivirus', 'compta-pieces-preparation', 'compta-pieces-lecture', 'compta-pieces-classement']);
  });
  it('priorite-unitaire-avant-lot', async () => {
    const m = monter(); await publier(m.service, 'lot-1', 'lot'); await publier(m.service, 'lot-2', 'lot');
    await publier(m.service, 'seule', 'unitaire');
    for (let i = 0; i < 3; i += 1) await traiterUne('entree', m.ctx);
    expect(m.appels['entree']).toEqual(['seule', 'lot-1', 'lot-2']);
  });
  it('gros-documents-en-dernier', async () => {
    const m = monter(); await publier(m.service, 'gros', 'gros_documents'); await publier(m.service, 'lot', 'lot');
    await publier(m.service, 'unitaire', 'unitaire');
    for (let i = 0; i < 3; i += 1) await traiterUne('entree', m.ctx);
    expect(m.appels['entree']).toEqual(['unitaire', 'lot', 'gros']); const reglage: ReglagePriorite = { seuilGrosOctets: 1000 }; const cas: [number, number, Priorite][] = [[10, 1, 'unitaire'], [10, 2, 'lot'], [1001, 1, 'gros_documents'], [1001, 5, 'gros_documents'], [1000, 1, 'unitaire']];
    expect(cas.map(([t, n]) => prioriteDe({ tailleOctets: t, nombreFichiers: n }, reglage))).toEqual(cas.map((c) => c[2]));
    for (const mauvais of [Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5]) {
      expect(() => prioriteDe({ tailleOctets: mauvais, nombreFichiers: 1 }, reglage)).toThrow();
      expect(() => prioriteDe({ tailleOctets: 1, nombreFichiers: mauvais }, reglage)).toThrow();
    }
  });
  it('tache-rejouee-sans-doublon', async () => {
    const m = monter(); expect([await publier(m.service, 'p-1'), await publier(m.service, 'p-1')]).toEqual(['ajoutee', 'existe']); await m.vider();
    expect(await publier(m.service, 'p-1')).toBe('existe'); await m.vider(); expect(ETAPES.map((e) => m.appels[e]!.length)).toEqual(ETAPES.map(() => 1));
  });
  it('panne-reprise-a-la-derniere-etape', async () => {
    const m = monter({ etape: 'lecture', fois: 1 });
    for (let i = 0; i < 40; i += 1) await publier(m.service, `p-${String(i)}`);
    await m.vider(); expect(await traiterUne('lecture', m.ctx).catch(() => 'x')).toBe('vide');     expect(m.appels['entree']!.length + m.appels['antivirus']!.length + m.appels['preparation']!.length).toBe(120);     expect([m.appels['lecture']!.length, new Set(m.appels['lecture']).size, m.appels['classement']!.length, new Set(m.appels['classement']).size]).toEqual([40, 40, 40, 40]);
  });
  it('relance-selon-prochaine-relance', async () => {
    const m = monter(); const relance = new Date(Date.parse(T0) + 60_000).toISOString(); let calls = 0;
    m.ctx.executeurs.entree = async () => (++calls === 1 ? { relanceA: relance } : { pieces: [] }); await publier(m.service, 'p-1'); expect(await traiterUne('entree', m.ctx)).toBe('reporte');     expect(await traiterUne('entree', m.ctx)).toBe('vide');
    await expect(m.service.prendre(NOMS_FILES.entree, relance)).resolves.toMatchObject({ pieceId: 'p-1' });
  });
  it('abandon-sans-suite', async () => {
    const m = monter(); m.ctx.executeurs.entree = async () => ({ fin: true }); await publier(m.service, 'p-1');
    expect([await traiterUne('entree', m.ctx), await traiterUne('entree', m.ctx), await traiterUne('antivirus', m.ctx)]).toEqual(['fait', 'vide', 'vide']);
  });
  it('branchement-antivirus : indéterminé, puis sain ou indéterminé jusqu\'à l\'abandon', async () => {
    const { entree, depot, antivirus } = montageEntree(); const octets = new TextEncoder().encode('%PDF-1.7 Facture fictive'); await etapeEntree(octets, entree);
    const service = new FilesMemoire(); const ctx: ContexteFiles = { service, executeurs: { ...monter().ctx.executeurs, antivirus: executeurAntivirus(entree) }, horloge: entree.horloge };
    const lancer = async (verdict: 'sain' | 'indetermine'): Promise<string> => {
      antivirus.programmer(sha256Hex(octets), verdict);
      await service.publier(NOMS_FILES.antivirus, { cle: `p-1:antivirus:${String(Math.random())}`, pieceId: 'p-1', priorite: 'unitaire' });
      return traiterUne('antivirus', ctx);
    };
    expect(await lancer('indetermine')).toBe('reporte');     expect(await depot.parId('p-1')).toMatchObject({ etat: 'en_erreur', tentatives: 1 });     expect(await traiterUne('antivirus', ctx)).toBe('vide'); expect(await lancer('indetermine')).toBe('reporte');     expect(await depot.parId('p-1')).toMatchObject({ etat: 'en_erreur', tentatives: 2 });     expect(await lancer('indetermine')).toBe('fait'); expect(await depot.parId('p-1')).toMatchObject({ etat: 'en_erreur', tentatives: 3, prochaineRelanceA: 'abandon' });     expect(await service.prendre(NOMS_FILES.preparation, '2099-01-01T00:00:00.000Z')).toBeNull();
    await depot.enregistrer({ ...(await depot.parId('p-1'))!, prochaineRelanceA: new Date(Date.parse(T0) + 60_000).toISOString() }); expect(await lancer('sain')).toBe('fait');     expect(await depot.parId('p-1')).toMatchObject({ etat: 'quarantaine', tentatives: 3 });     expect((await depot.parId('p-1'))?.prochaineRelanceA).toBeUndefined(); await expect(service.prendre(NOMS_FILES.preparation, T0)).resolves.toMatchObject({ pieceId: 'p-1' });
  });
});

function montageEntree() {
  const antivirus = new AntivirusMemoire();
  const depot = new DepotMemoire();
  const entree: ContexteEntree = {
    societeId: 'soc-fictive', nouvelId: () => 'p-1', stockage: new StockageMemoire(), depot, horloge: new HorlogeFixe(T0), antivirus, decompresser: () => new Uint8Array(),
    reglage: { archive: { ratioMax: 100, totalMaxOctets: 1_000_000, nombreMax: 50 }, image: { coteMax: 5000, pixelsMax: 10_000_000 }, limites: { tailleMaxOctets: 1_000_000, pagesMaxFileNormale: 10, pagesMaxModele: 10 }, delaisRelanceMinutes: [5, 10] },
  };
  return { entree, depot, antivirus };
}

const journal = <T,>(): { lire(c: string): Promise<T | undefined>; ecrire(c: string, v: T): Promise<void>; m: Map<string, T> } => {
  const m = new Map<string, T>();
  return { m, lire: async (c) => m.get(c), ecrire: async (c, v) => void m.set(c, v) };
};
const prepOk: ResultatPreparation = { etat: 'preparee', texteTransmissible: null, texteCache: false, sensible: true, motifs: [] };
const piece = (extra: Partial<PieceEnregistree> = {}): PieceEnregistree => ({ id: 'p-1', societeId: 'soc-fictive', sha256: 'a'.repeat(64), etat: 'quarantaine', typeReel: 'pdf', ...extra });

describe('branchement des exécuteurs sur les étapes', () => {
  it('entree : nominal, rejeu journalisé sans relire la source, source absente', async () => {
    const { entree, depot } = montageEntree(); const faits = journal<string[]>(); let lectures = 0;
    const source = { lire: async (id: string) => { lectures += 1; return id === 'depot-1' ? new TextEncoder().encode('%PDF-1.7 Facture fictive') : null; } }; const exec = executeurEntree(entree, source, faits); expect(await exec('depot-1')).toEqual({ pieces: ['p-1'] });     expect(faits.m.get('depot-1')).toEqual(['p-1']);     expect(await exec('depot-1')).toEqual({ pieces: ['p-1'] });
    expect([lectures, depot.nombre()]).toEqual([1, 1]);     expect(await exec('depot-absent')).toEqual({ fin: true });
  });
  it('preparation : erreur = pièce en_erreur et relance, abandon après le dernier délai, reprise réussie', async () => {
    const depot = new DepotMemoire(); const stockage = new StockageMemoire(); const extracteur = { extraire: async () => ({ elements: [{ texte: 'Facture fictive', page: 1, x: 1, y: 1, largeur: 100, hauteur: 12, taillePolice: 12, couleur: [0, 0, 0] as [number, number, number], couleurFond: [255, 255, 255] as [number, number, number], calqueVisible: true, annotationCachee: false }], pages: [{ numero: 1, largeur: 600, hauteur: 800 }], nbPages: 1 }) };
    const preparations = journal<ResultatPreparation>(); const ctx = { depot, stockage, extracteur, horloge: new HorlogeFixe(T0), reglage: { seuilNettete: 100, texteCache: { ecartCouleurMax: 30, taillePoliceMin: 4 } } }; const exec = executeurPreparation(ctx, preparations, { delaisRelanceMinutes: [5] });
    expect(await exec('inconnue')).toEqual({ fin: true }); await depot.enregistrer(piece({ cle: 'originaux/absent' })); const relance = new Date(Date.parse(T0) + 5 * 60_000).toISOString();
    expect(await exec('p-1')).toEqual({ relanceA: relance });     expect(await depot.parId('p-1')).toMatchObject({ etat: 'en_erreur', tentatives: 1, prochaineRelanceA: relance, code: 'original_introuvable' });     expect(preparations.m.size).toBe(0); expect(await exec('p-1')).toEqual({ fin: true });     expect(await depot.parId('p-1')).toMatchObject({ etat: 'en_erreur', tentatives: 2, prochaineRelanceA: 'abandon' }); await stockage.deposerSiAbsent('originaux/absent', new TextEncoder().encode('%PDF-1.7 Facture fictive'));
    await depot.enregistrer(piece({ cle: 'originaux/absent', etat: 'en_erreur', tentatives: 1 })); expect(await exec('p-1')).toEqual({ pieces: ['p-1'] });     expect(await depot.parId('p-1')).toMatchObject({ etat: 'preparee' });     expect(preparations.m.get('p-1')?.etat).toBe('preparee');
  });
  it('lecture : sans préparation fin, IA indisponible relancée, nominal journalisé', async () => {
    const depot = new DepotMemoire(); await depot.enregistrer(piece({ etat: 'preparee' })); const preparations = journal<ResultatPreparation>();
    const resultats = journal<ResultatLecture>(); let panne = true;
    const lecture: ContexteLecture = {
      depot, journal: journal<ResultatLecture>(), suiviDepense: { microCentimes: 0 },
      modele: { estimer: () => 0, completer: async () => { if (panne) throw new Error('indisponible'); return { sortie: '{}', coutMicroCentimes: 1 }; } },
      reglage: { versionLecteur: 'v1', versionInvite: 1, plafondMicroCentimes: 1000, convention: { decimal: ',', ordreDate: 'JMA' }, bareme: { xml: 95, accordTextePdf: 90, accordOcr: 80, aSeul: 60, visionSeule: 50, echec: 0 }, seuils: { sur: 85, douteux: 40 }, arithmetique: { toleranceParTaux: 1, tolerancePieceMax: 2, toleranceParLigne: 1, toleranceLignesMax: 2, tauxConnusPdb: [1234] } },
    };
    const exec = executeurLecture(lecture, preparations, resultats, { delaiIaMinutes: 10 }, new HorlogeFixe(T0)); expect(await exec('p-1')).toEqual({ fin: true }); await preparations.ecrire('p-1', { ...prepOk, texteTransmissible: 'Facture fictive' });
    expect(await exec('p-1')).toEqual({ relanceA: new Date(Date.parse(T0) + 10 * 60_000).toISOString() });     expect(resultats.m.size).toBe(0);
    panne = false;
    expect(await exec('p-1')).toEqual({ pieces: ['p-1'] });     expect([...resultats.m.keys()]).toEqual(['p-1:lecture:v1']);
  });
  it('classement : sans lecture fin sans effet, avec lecture enregistre la pièce comparée', async () => {
    const depot = new DepotMemoire(); await depot.enregistrer(piece({ etat: 'a_verifier' })); const lectures = journal<ResultatLecture>();
    const vus: string[] = [];
    const ctx: ContexteClassement = {
      depot, horloge: new HorlogeFixe(T0), doublons: { autres: async () => [], enregistrer: async (_s, p) => void vus.push(p.id) },
      propositions: { creerSiAbsente: async () => 'creee' }, reglage: { distanceImageMax: 0, journal: 'ACH', comptes: { charge: '606000', tvaDeductible: '445660', fournisseur: '401000' } },
    };
    const exec = executeurClassement(ctx, lectures, 'v1'); expect(await exec('p-1')).toEqual({ fin: true });     expect(vus).toEqual([]); await lectures.ecrire('p-1:lecture:v1', { etat: 'a_verifier', motifs: ['sensible'], champs: [], parTaux: [], nombreDeNumeros: 0, texte: 'x', sensible: true });
    expect(await exec('p-1')).toEqual({ fin: true });     expect(vus).toEqual(['p-1']);     expect(await exec('absente')).toEqual({ fin: true });
  });
});
