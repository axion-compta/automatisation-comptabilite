import { afterEach, describe, expect, it } from 'vitest';
import { call } from '@orpc/server';
import { creerApp } from '../app.js';
import { creerServiceEcritureJuridique, type SessionJuridique } from '../domaines/juridique-ecriture.js';
import { routesJuridique } from '../domaines/juridique.js';
import { creerServiceJuridique } from '../../../../packages/contrat/src/domaines/juridique-service.js';
import { routesEcritureSansEnTete } from '../../../../packages/contrat/src/openapi.js';

const JOUR = '2027-01-15';
const SARL = '123456782';
const SCI = '987654324';
const REPRESENTANT: SessionJuridique = { personneId: 'PERS-ESSAI-1', representantLegal: true, niveau: { ok: true } };
const appel = <I>(proc: unknown, input: I) => call(proc as Parameters<typeof call>[0], input, { context: {} });
let n = 0;
const cle = () => ({ 'idempotency-key': `cle-essai-${++n}` });

/** Faux ports : `ordinaire` et `recent` sont les sessions rendues selon l'exigence demandée. */
function monter(opts: { ordinaire?: SessionJuridique; recent?: SessionJuridique; siren?: string } = {}) {
  const exigences: string[] = [];
  const lignes: unknown[] = [];
  const service = creerServiceEcritureJuridique({
    session: { lire: (e) => (exigences.push(e), e === 'recent' ? opts.recent : opts.ordinaire) },
    trace: { ecrire: (l) => void lignes.push(l) },
    horloge: () => JOUR,
    lire: creerServiceJuridique(opts.siren ?? SARL).lire,
  });
  const h = routesJuridique(undefined, service);
  const valider = (rapport: string, entetes = cle(), exercice = 'EX2026') => appel(h.validerRapport, { params: { exercice, rapport }, headers: entetes });
  const choisir = (choix: string, entetes = cle()) => appel(h.choisirConfidentialite, { params: { exercice: 'EX2026' }, headers: entetes, body: { choix } });
  const piece = (genre: 'Decision' | 'Convention', objet: string, entetes = cle(), exercice = 'EX2026') =>
    appel(genre === 'Decision' ? h.enregistrerPieceDecision : h.enregistrerPieceConvention, { params: { exercice, objet }, headers: entetes, body: { piece_id: 'PIECE-1' } });
  return { exigences, lignes, valider, choisir, piece };
}
const refus = (code: string, status: number) => ({ code, status });
const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

describe('serveur : écriture juridique', () => {
  it('rapport-gestion-valide-trace', async () => {
    const m = monter({ recent: REPRESENTANT });
    expect((await m.valider('gestion')).body).toEqual({ objet: 'gestion', etat: 'valide', par: 'PERS-ESSAI-1', le: JOUR });
    expect(m.lignes).toEqual([{ action: 'rapport_valide', exercice: 'EX2026', objet: 'gestion', par: 'PERS-ESSAI-1', le: JOUR }]);
  });

  it('rapport-sans-double-facteur-recent-401', async () => {
    const m = monter({ ordinaire: REPRESENTANT, recent: { ...REPRESENTANT, niveau: { ok: false, raison: 'reauthentification_requise' } } });
    await expect(m.valider('gestion')).rejects.toMatchObject({ ...refus('REAUTHENTIFICATION_REQUISE', 401), data: { raison: 'reauthentification_requise' } });
    expect(m.exigences).toEqual(['recent']);
    expect(m.lignes).toEqual([]);
  });

  it('rapport-mfa-absent-401', async () => {
    const m = monter({ recent: { ...REPRESENTANT, niveau: { ok: false, raison: 'mfa_requis' } } });
    await expect(m.valider('gestion')).rejects.toMatchObject({ ...refus('REAUTHENTIFICATION_REQUISE', 401), data: { raison: 'mfa_requis' } });
    await expect(monter().valider('gestion')).rejects.toMatchObject({ ...refus('REAUTHENTIFICATION_REQUISE', 401), data: { raison: 'non_authentifie' } });
  });

  it('rapport-non-representant-403', async () => {
    const m = monter({ recent: { ...REPRESENTANT, representantLegal: false } });
    await expect(m.valider('gestion')).rejects.toMatchObject(refus('REPRESENTANT_LEGAL_REQUIS', 403));
    expect(m.lignes).toEqual([]);
  });

  it('rapport-gestion-dispense-409', async () => {
    const m = monter({ recent: REPRESENTANT, siren: SCI });
    await expect(m.valider('gestion')).rejects.toMatchObject(refus('NON_APPLICABLE', 409));
    expect(m.lignes).toEqual([]);
  });

  it('rapport-sci-hors-sci-409', async () => {
    const m = monter({ recent: REPRESENTANT });
    await expect(m.valider('sci')).rejects.toMatchObject(refus('NON_APPLICABLE', 409));
    expect((await monter({ recent: REPRESENTANT, siren: SCI }).valider('sci')).body.etat).toBe('valide');
  });

  it('confidentialite-choix-nominatif-date', async () => {
    const m = monter({ ordinaire: REPRESENTANT });
    expect((await m.choisir('demandee')).body).toEqual({ objet: 'confidentialite', etat: 'demandee', par: 'PERS-ESSAI-1', le: JOUR });
    expect(m.lignes).toHaveLength(1);
    expect(m.exigences).toEqual(['ordinaire']);
  });

  it('confidentialite-non-proposee-409', async () => {
    const m = monter({ ordinaire: REPRESENTANT, siren: SCI });
    await expect(m.choisir('refusee')).rejects.toMatchObject(refus('NON_APPLICABLE', 409));
    expect(m.lignes).toEqual([]);
  });

  it('piece-decision-deposee', async () => {
    const m = monter({ ordinaire: REPRESENTANT });
    expect((await m.piece('Decision', 'OBJ-SARL-001')).body).toEqual({ objet: 'OBJ-SARL-001', etat: 'deposee', par: 'PERS-ESSAI-1', le: JOUR });
    expect(m.lignes).toHaveLength(1);
  });

  it('piece-convention-archivee', async () => {
    const m = monter({ ordinaire: REPRESENTANT, siren: SCI });
    expect((await m.piece('Convention', 'OBJ-SCI-001')).body).toMatchObject({ objet: 'OBJ-SCI-001', etat: 'archivee' });
  });

  it('objet-inconnu-404', async () => {
    const m = monter({ ordinaire: REPRESENTANT, recent: REPRESENTANT });
    await expect(m.piece('Decision', 'OBJ-ABSENT')).rejects.toMatchObject(refus('OBJET_INCONNU', 404));
    await expect(m.piece('Convention', 'OBJ-SARL-001', cle(), 'EX1999')).rejects.toMatchObject(refus('EXERCICE_INCONNU', 404));
    await expect(m.valider('gestion', cle(), 'EX1999')).rejects.toMatchObject(refus('EXERCICE_INCONNU', 404));
    expect(m.lignes).toEqual([]);
  });

  it('meme-cle-meme-reponse-autre-cle-409', async () => {
    const m = monter({ ordinaire: REPRESENTANT });
    const k = cle();
    const premiere = await m.piece('Decision', 'OBJ-SARL-001', k);
    expect(await m.piece('Decision', 'OBJ-SARL-001', k)).toEqual(premiere);
    expect(m.lignes).toHaveLength(1);
    await expect(m.piece('Decision', 'OBJ-SARL-001', cle())).rejects.toMatchObject(refus('DEJA_FAIT', 409));
    expect(m.lignes).toHaveLength(1);
  });

  it('serveur-par-defaut-refuse-401', async () => {
    const a = creerApp();
    apps.push(a);
    const r = await a.inject({ method: 'POST', url: '/exercices/EX2026/juridique/rapports/gestion/valider', headers: cle() });
    expect(r.statusCode).toBe(401);
    expect(r.json().data).toEqual({ raison: 'non_authentifie' });
  });

  it('sans-en-tete-400', async () => {
    const a = creerApp();
    apps.push(a);
    const poster = (url: string, payload: object = {}, headers: Record<string, string> = cle()) => a.inject({ method: 'POST', url, headers, payload });
    const base = '/exercices/EX2026/juridique';
    expect((await poster(`${base}/rapports/gestion/valider`, undefined, {})).statusCode).toBe(400);
    expect((await poster(`${base}/rapports/autre/valider`)).statusCode).toBe(400);
    expect((await poster(`${base}/confidentialite`, { choix: 'demandee', en_trop: 1 })).statusCode).toBe(400);
    expect((await poster(`${base}/decisions/OBJ-SARL-001/piece`, { piece_id: '' })).statusCode).toBe(400);
    expect((await poster(`${base}/decisions/OBJ-SARL-001/piece`, { piece_id: 'P'.repeat(1000) })).statusCode).toBe(400);
    expect((await poster(`${base}/conventions/OBJ-SCI-001/piece`, { piece_id: 'P1', en_trop: 1 })).statusCode).toBe(400);
    expect(routesEcritureSansEnTete()).toEqual([]);
  });
});
