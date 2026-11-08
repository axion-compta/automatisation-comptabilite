import { describe, expect, it } from 'vitest';
import { call } from '@orpc/server';
import { creerRouteur } from '../../../../apps/serveur/src/app.js';
import { genererDeclarations } from '../../../donnees-fictives/src/declarations.js';
import { creerServiceTva } from '../domaines/tva-service.js';
import { ReponseDeclarationTva, ReponseEstimationTva, ReponsePeriodesTva } from '../domaines/tva.js';
import { genererOpenapi } from '../openapi.js';

const jeu = genererDeclarations();
const r = creerRouteur().tva;
const rejet = (p: Promise<unknown>) => p.then(() => 'ok', (e: { code?: string }) => e.code);
const periodes = (exercice: string, query?: { limite?: number; decalage?: number }) =>
  call(r.listerPeriodesTva, { params: { exercice }, ...(query ? { query } : {}) }) as Promise<{ body: Array<{ id: string }>; decalage: number; total: number }>;

describe('tva en lecture : service et routes', () => {
  it('periodes-enveloppe-et-tri', async () => {
    const ex26 = await periodes('EX2026');
    expect(ex26.body.map((p) => p.id)).toEqual(['PER2026T1', 'PER2026T2']);
    expect(ex26).toMatchObject({ decalage: 0, total: 2 });
    expect(ReponsePeriodesTva.safeParse(ex26).success).toBe(true);
    const page = await periodes('EX2026', { limite: 1, decalage: 1 });
    expect(page.body.map((p) => p.id)).toEqual(['PER2026T2']);
    expect(page).toMatchObject({ decalage: 1, total: 2 });
    expect(await periodes('EX2026', { decalage: 50 })).toEqual({ body: [], decalage: 50, total: 2 });
    // ordre d'entrée inversé : le tri ne dépend pas de la source
    const inverse = creerServiceTva({ ...jeu, periodesTva: [...jeu.periodesTva].reverse() });
    expect(inverse.periodes('EX2026')?.body.map((p) => p.id)).toEqual(['PER2026T1', 'PER2026T2']);
    expect(creerServiceTva(genererDeclarations(undefined, 'vide')).periodes('EX2026')).toBeUndefined();
    expect(await rejet(periodes('EX0000'))).toBe('EXERCICE_INCONNU');
    // bornes refusées par le contrat
    for (const query of [{ limite: 0 }, { limite: 101 }, { limite: 1.5 }, { limite: Number.NaN }, { decalage: -1 }]) {
      expect(await rejet(periodes('EX2026', query)), JSON.stringify(query)).toBe('BAD_REQUEST');
    }
    expect(await rejet(periodes(''))).toBe('BAD_REQUEST');
  });

  it('estimation-non-calculee-sans-montant', async () => {
    const e = (await call(r.lireEstimationTva, { params: { exercice: 'EX2026' } })) as { body: Record<string, unknown> };
    expect(e.body).toEqual({ exerciceId: 'EX2026', etat: 'non_calculee', motif: 'tva_en_doute', piecesARegarder: 2 });
    expect(Object.keys(e.body).filter((k) => /centimes|montant/i.test(k))).toEqual([]);
    expect(ReponseEstimationTva.safeParse(e).success).toBe(true);
    // un montant dans un état non calculé est refusé
    expect(ReponseEstimationTva.safeParse({ body: { ...e.body, collecteeCentimes: 1 } }).success).toBe(false);
    expect(await rejet(call(r.lireEstimationTva, { params: { exercice: 'EX0000' } }))).toBe('EXERCICE_INCONNU');
    expect(await rejet(call(r.lireEstimationTva, { params: { exercice: '' } }))).toBe('BAD_REQUEST');
  });

  it('estimation-calculee-avec-montants', async () => {
    const e = (await call(r.lireEstimationTva, { params: { exercice: 'EX2025' } })) as { body: Record<string, unknown> };
    const attendu = jeu.estimations.find((x) => x.exerciceId === 'EX2025')!;
    expect(e.body).toEqual({ exerciceId: 'EX2025', etat: 'calculee', collecteeCentimes: attendu.collecteeCentimes, deductibleCentimes: attendu.deductibleCentimes });
    expect(Number.isInteger(e.body['collecteeCentimes'])).toBe(true);
    expect(ReponseEstimationTva.safeParse(e).success).toBe(true);
    // un état calculé sans montant est refusé
    expect(ReponseEstimationTva.safeParse({ body: { exerciceId: 'EX2025', etat: 'calculee' } }).success).toBe(false);
    expect(ReponseEstimationTva.safeParse({ body: { exerciceId: 'EX2025', etat: 'calculee', collecteeCentimes: 1.5, deductibleCentimes: 0 } }).success).toBe(false);
    expect(ReponseEstimationTva.safeParse({ body: { exerciceId: 'EX2025', etat: 'calculee', collecteeCentimes: Infinity, deductibleCentimes: 0 } }).success).toBe(false);
  });

  it('declaration-avec-sources-et-mention', async () => {
    const d = (await call(r.lireDeclarationTva, { params: { declaration: 'DEC2025T4' } })) as { body: Record<string, unknown> & { cases: Array<{ code: string; sources: unknown[] }>; controles: unknown[] } };
    const source = jeu.declarations.find((x) => x.id === 'DEC2025T4')!;
    expect(d.body).toMatchObject({ id: 'DEC2025T4', mention: 'prepare_par_ia', versionPaquet: source.versionPaquet, statut: 'validee', validePar: source.validePar, valideLe: source.valideLe });
    expect(d.body.cases.map((c) => c.code)).toEqual(source.cases.map((c) => c.code));
    expect(d.body.cases.every((c) => c.sources.length > 0)).toBe(true);
    expect(d.body.controles.length).toBeGreaterThan(0);
    expect(ReponseDeclarationTva.safeParse(d).success).toBe(true);
    // déclaration non validée : validateur null
    const t1 = (await call(r.lireDeclarationTva, { params: { declaration: 'DEC2026T1' } })) as { body: Record<string, unknown> };
    expect(t1.body['mention']).toBe('prepare_par_ia');
    expect(ReponseDeclarationTva.safeParse({ body: { ...d.body, mention: 'autre' } }).success).toBe(false);
    expect(ReponseDeclarationTva.safeParse({ body: { ...d.body, mention: undefined } }).success).toBe(false);
  });

  it('declaration-inconnue-404', async () => {
    expect(await rejet(call(r.lireDeclarationTva, { params: { declaration: 'DEC0000' } }))).toBe('DECLARATION_INCONNUE');
    expect(await rejet(call(r.lireDeclarationTva, { params: { declaration: '' } }))).toBe('BAD_REQUEST');
    expect(creerServiceTva().declaration('DEC0000')).toBeUndefined();
  });

  it('openapi-contient-les-routes-tva', () => {
    const doc = genererOpenapi() as { paths: Record<string, Record<string, { operationId: string; responses: Record<string, unknown> }>> };
    expect(doc.paths['/exercices/{exercice}/tva/periodes']?.['get']?.operationId).toBe('listerPeriodesTva');
    expect(doc.paths['/exercices/{exercice}/tva/estimation']?.['get']?.operationId).toBe('lireEstimationTva');
    expect(doc.paths['/tva/declarations/{declaration}']?.['get']?.operationId).toBe('lireDeclarationTva');
    expect(Object.keys(doc.paths['/tva/declarations/{declaration}']?.['get']?.responses ?? {})).toContain('404');
    const verbes = Object.entries(doc.paths).filter(([c]) => c.includes('/tva/')).flatMap(([, ops]) => Object.keys(ops));
    expect(verbes).toEqual(['get', 'get', 'get']);
  });
});
