import { describe, expect, it } from 'vitest';
import type { CaseDeclaration } from '../../../../../packages/noyau/src/declarations/cases.js';
import type { ResultatFormules } from '../../../../../packages/noyau/src/declarations/formules.js';
import type { RegleControle, TraceControle } from '../../../../../packages/noyau/src/controles/moteur.js';
import type { VerdictNiveau } from '../../../../../packages/noyau/src/securite/connexion.js';
import { DepotDocumentsMemoire, DepotTvaMemoire } from '../../persistance/declarations-memoire.js';
import type { PieceEnregistree } from '../../pieces/ports.js';
import { creerEcritureTva } from '../ecriture-tva.js';

const A = 'societe-a';
const B = 'societe-b';
const EX = 'ex-2026';
const PERSONNE = 'prenom.nom@exemple.fr';
const AUTRE = 'autre.personne@exemple.fr';
const MAINTENANT = '2026-05-01T10:00:00Z';
const OK: VerdictNiveau = { ok: true };
const cas: CaseDeclaration = { code: 'L1', montant: 1000 as never, sources: [{ ecritureId: 'e1', ligneIndex: 0 }], aCalculer: false };
const regleB: RegleControle<unknown> = { id: 'CC-TEST', version: 1, gravite: 'B', bloque: ['tva'], declencheurs: [], actif: true, evaluer: () => ({ resultat: 'OK' }) };
const trace = (resultat: TraceControle['resultat']): TraceControle => ({ horodatage: MAINTENANT, declencheur: 'avant_export', regleId: 'CC-TEST', versionRegle: 1, objetType: 'periode', objetId: 'p', resultat });
const piece = (id: string, societeId: string): PieceEnregistree => ({ id, societeId, sha256: 'h'.repeat(8), etat: 'traitee' as never });

function monter(o: { verdict?: VerdictNiveau; personneId?: string | null; traces?: TraceControle[]; formules?: ResultatFormules } = {}) {
  const documents = new DepotDocumentsMemoire();
  const tva = new DepotTvaMemoire();
  const pid = (s: string): string => (tva.enregistrerPeriodes(s, EX, [{ debut: '2026-01-01', fin: '2026-01-31', periodicite: 'mensuelle', formulaire: 'F-TEST' }])[0] as { id: string }).id;
  const idA = pid(A);
  const etat = { reauthAppels: 0, verdict: o.verdict ?? OK, traces: o.traces ?? [], formules: o.formules ?? ({ bloque: false, cases: [cas] } as ResultatFormules) };
  const pieces = new Map([['pa', piece('pa', A)], ['pb', piece('pb', B)]]);
  const s = creerEcritureTva({
    documents, tva,
    reauth: { verifier: async () => { etat.reauthAppels += 1; return { verdict: etat.verdict, personneId: o.personneId === undefined ? PERSONNE : o.personneId }; } },
    pieces: { parId: async (id) => pieces.get(id) ?? null },
    controles: { traces: async () => etat.traces, regles: () => [regleB] },
    formules: { calculer: async () => etat.formules },
    horloge: { maintenant: () => MAINTENANT },
    versions: { logiciel: 'v-test', paquet: 1 },
  });
  const stock = () => JSON.stringify([documents.historique(A, 'declaration_tva', EX), tva.periodes(A, EX), tva.declaration(A, `declaration-${idA}`)]);
  const preparee = async (cle = 'k1') => { await s.preparer({ societeId: A, periodeId: idA, cle, personneId: PERSONNE }); return `declaration-${idA}`; };
  const validee = async () => { const d = await preparee(); await val(d, 'kv'); return d; };
  const val = (d: string, cle: string) => s.valider({ societeId: A, declarationId: d, cle, sessionId: 'sess' });
  const acc = (d: string, pieceId: string, cle: string) => s.enregistrerAccuse({ societeId: A, declarationId: d, cle, pieceId });
  return { s, val, acc, idA, documents, tva, etat, stock, preparee, validee };
}
const statutPeriode = (m: ReturnType<typeof monter>) => m.tva.periode(A, m.idA)?.statut;

describe('écriture TVA', () => {
  it('preparer-201-a-valider', async () => {
    const m = monter();
    const r = await m.s.preparer({ societeId: A, periodeId: m.idA, cle: 'k1', personneId: PERSONNE });
    expect(r.statut).toBe(201);
    expect(r.corps).toMatchObject({ periodeId: m.idA, mention: 'prepare_par_ia', validePar: null, valideLe: null, formulaire: 'F-TEST', millesime: 2026 });
    expect(statutPeriode(m)).toBe('preparee');
    const docs = m.documents.historique(A, 'declaration_tva', EX);
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({ statut: 'a_valider', version: 1, preparePar: PERSONNE });
    expect(m.tva.declaration(A, `declaration-${m.idA}`)?.cases).toHaveLength(1);
  });
  it('preparer-409-si-b-ouvert', async () => {
    for (const ouvert of ['ALERTE', 'IMPOSSIBLE'] as const) {
      const m = monter({ traces: [trace(ouvert)] });
      const avant = m.stock();
      const r = await m.s.preparer({ societeId: A, periodeId: m.idA, cle: 'k1', personneId: PERSONNE });
      expect(r).toMatchObject({ statut: 409, corps: { code: 'controle_bloquant_ouvert' } });
      expect(m.stock()).toBe(avant);
    }
  });
  it('preparer-422-formules-bloquees', async () => {
    const cas422: ResultatFormules[] = [{ bloque: true, code: 'ligne_absente', ligne: 'L9' }, { bloque: true, code: 'base_negative', ligne: 'L8', montant: -5 as never }];
    for (const f of cas422) {
      const m = monter({ formules: f });
      const avant = m.stock();
      const r = await m.s.preparer({ societeId: A, periodeId: m.idA, cle: 'k1', personneId: PERSONNE });
      expect(r).toEqual({ statut: 422, corps: { code: f.bloque ? f.code : '', ligne: f.bloque ? f.ligne : '' } });
      expect(m.stock()).toBe(avant);
    }
  });
  it('d5-sans-reauth-401', async () => {
    for (const raison of ['reauthentification_requise', 'mfa_requis', 'non_authentifie', 'recuperation_recente'] as const) {
      const m = monter({ verdict: { ok: false, raison } });
      const d = await m.preparee();
      const avant = m.stock();
      const r = await m.val(d, 'kv');
      expect(r).toEqual({ statut: 401, corps: { code: raison } });
      expect(m.etat.reauthAppels).toBe(1);
      expect(m.stock()).toBe(avant);
      expect(m.documents.historique(A, 'declaration_tva', EX)[0]?.statut).toBe('a_valider');
      expect(statutPeriode(m)).toBe('preparee');
    }
    const m = monter({ personneId: null });
    expect((await m.val(await m.preparee(), 'kv')).statut).toBe(401);
  });
  it('d5-avec-reauth-validateur-et-date', async () => {
    const m = monter({ personneId: AUTRE });
    const d = await m.preparee();
    const r = await m.s.valider({ societeId: A, declarationId: d, cle: 'kv', sessionId: 'sess', validePar: PERSONNE } as never);
    expect(r).toMatchObject({ statut: 200, corps: { statut: 'validee', validePar: AUTRE, valideLe: MAINTENANT } });
    expect(m.documents.historique(A, 'declaration_tva', EX)[0]).toMatchObject({ statut: 'valide', validePar: AUTRE, valideLe: MAINTENANT });
    expect(statutPeriode(m)).toBe('validee');
  });
  it('valider-409-si-b-ouvert', async () => {
    const m = monter();
    const d = await m.preparee();
    m.etat.traces = [trace('ALERTE')];
    const avant = m.stock();
    expect((await m.val(d, 'kv')).statut).toBe(409);
    expect(m.stock()).toBe(avant);
  });
  it('accuse-apres-validation-seulement', async () => {
    const m = monter();
    const d = await m.preparee();
    const avant = m.stock();
    expect(await m.acc(d, 'pa', 'ka')).toEqual({ statut: 409, corps: { code: 'transition_interdite' } });
    expect(m.stock()).toBe(avant);
    await m.val(d, 'kv');
    expect((await m.acc(d, 'pa', 'ka2')).statut).toBe(201);
    expect(statutPeriode(m)).toBe('deposee_par_client');
    expect(m.tva.periode(A, m.idA)?.accusePieceId).toBe('pa');
  });
  it('accuse-sans-piece-422', async () => {
    const m = monter();
    const d = await m.validee();
    const avant = m.stock();
    for (const pieceId of ['', '   ', 'inexistante', 'pb']) {
      expect(await m.s.enregistrerAccuse({ societeId: A, declarationId: d, cle: `k-${pieceId}`, pieceId })).toEqual({ statut: 422, corps: { code: 'accuse_manquant' } });
      expect(m.stock()).toBe(avant);
    }
    const nv = monter();
    expect((await nv.acc(await nv.preparee(), '', 'k')).statut).toBe(409);
  });
  it('idempotence-meme-cle', async () => {
    const m = monter();
    const demande = { societeId: A, periodeId: m.idA, cle: 'k1', personneId: PERSONNE };
    const r1 = await m.s.preparer(demande);
    const r2 = await m.s.preparer(demande);
    expect(r2).toEqual(r1);
    expect(m.documents.historique(A, 'declaration_tva', EX)).toHaveLength(1);
    const d = `declaration-${m.idA}`;
    const v1 = await m.val(d, 'kv');
    const v2 = await m.val(d, 'kv');
    expect(v2).toEqual(v1);
    expect(m.etat.reauthAppels).toBe(1);
  });
  it('cle-reutilisee-409', async () => {
    const m = monter();
    await m.s.preparer({ societeId: A, periodeId: m.idA, cle: 'k1', personneId: PERSONNE });
    const d = `declaration-${m.idA}`;
    const avant = m.stock();
    expect(await m.val(d, 'k1')).toEqual({ statut: 409, corps: { code: 'cle_reutilisee' } });
    expect(m.stock()).toBe(avant);
    for (const cle of ['', '   ', '\t']) {
      const r = await m.s.valider({ societeId: A, declarationId: d, cle, sessionId: 's' });
      expect(r).toEqual({ statut: 400, corps: { code: 'cle_manquante' } });
    }
    expect((await m.s.preparer({ societeId: A, periodeId: m.idA, cle: ' ', personneId: PERSONNE })).statut).toBe(400);
    expect((await m.acc(d, 'pa', '')).statut).toBe(400);
  });
  it('autre-societe-404', async () => {
    const m = monter();
    const d = await m.validee();
    const avant = m.stock();
    const inconnu = { statut: 404, corps: { code: 'introuvable' } };
    expect(await m.s.preparer({ societeId: B, periodeId: m.idA, cle: 'x1', personneId: PERSONNE })).toEqual(inconnu);
    expect(await m.s.preparer({ societeId: A, periodeId: 'periode-inexistante', cle: 'x2', personneId: PERSONNE })).toEqual(inconnu);
    expect(await m.s.valider({ societeId: B, declarationId: d, cle: 'x3', sessionId: 's' })).toEqual(inconnu);
    expect(await m.val('declaration-inexistante', 'x4')).toEqual(inconnu);
    expect(await m.s.enregistrerAccuse({ societeId: B, declarationId: d, cle: 'x5', pieceId: 'pb' })).toEqual(inconnu);
    expect(await m.acc('declaration-inexistante', 'pa', 'x6')).toEqual(inconnu);
    expect(m.stock()).toBe(avant);
  });
});
