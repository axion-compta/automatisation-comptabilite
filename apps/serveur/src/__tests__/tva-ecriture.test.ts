import { afterEach, describe, expect, it } from 'vitest';
import { call } from '@orpc/server';
import { creerApp } from '../app.js';
import { routesTva } from '../domaines/tva.js';
import { creerServiceEcritureTva, type Acteur, type EtatTva, type LigneJournal } from '../domaines/tva-ecriture.js';

const appel = <I>(proc: unknown, input: I) => call(proc as Parameters<typeof call>[0], input, { context: {} });
const cle = (n: string) => ({ 'idempotency-key': `cle-essai-${n}` });
const E = 'exercice-fictif';

const etatFictif = (): EtatTva => ({
  lignes: [
    { id: 'ligne-fictive-1', pieceId: 'piece-fictive-1', tvaCentimes: 100, certitude: 'solide' },
    { id: 'ligne-fictive-2', pieceId: 'piece-fictive-2', tvaCentimes: 50, certitude: 'en_doute' },
    { id: 'ligne-fictive-3', pieceId: 'piece-fictive-3', tvaCentimes: 70, certitude: 'solide' },
  ],
  rattachements: [
    { pieceId: 'piece-fictive-1', mois: '2027-01' },
    { pieceId: 'piece-fictive-2', mois: '2027-01' },
    { pieceId: 'piece-fictive-3', mois: '2027-03' },
    { pieceId: 'piece-fictive-4', mois: '2026-12' },
  ],
  periodesDeposees: ['2026-12'],
});

function monter(acteur: Acteur | undefined = { type: 'personne', id: 'personne-fictive-1', role: 'comptable' }) {
  const courant = { acteur };
  const journal: LigneJournal[] = [];
  const service = creerServiceEcritureTva({
    session: { lire: () => (courant.acteur ? { acteur: courant.acteur } : undefined) },
    journal: { ecrire: (l) => journal.push(l) },
    horloge: () => '2027-02-10',
    etat: etatFictif(),
  });
  const routes = routesTva(undefined, service);
  return { courant, journal, service, routes };
}

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

describe('serveur : écritures de la TVA', () => {
  it('t1-reglage-refuse-quel-que-soit-le-role', async () => {
    const { courant, journal, service, routes } = monter();
    const avant = service.deduction();
    const etatAvant = service.etat();
    let n = 0;
    for (const role of ['administrateur', 'comptable']) {
      courant.acteur = { type: 'personne', id: `personne-fictive-${role}`, role };
      await expect(appel(routes.modifierInclureSousReserve, { headers: cle(`r${++n}`), body: { valeur: true }, params: { exercice: E } })).rejects.toMatchObject({ code: 'REGLAGE_VERROUILLE', status: 403 });
      expect(journal).toHaveLength(n);
      expect(journal[n - 1]).toMatchObject({ type: 'refus_reglage', par: `personne-fictive-${role}`, reglage: 'tva.inclure_sous_reserve' });
    }
    expect(service.deduction()).toEqual(avant);
    expect(service.etat()).toEqual(etatAvant);
    expect(service.etat().lignes.filter((l) => l.certitude === 'sous_reserve')).toHaveLength(0);
  });

  it('reglage-valeur-false-aussi-refuse', async () => {
    const { journal, routes } = monter();
    const e = { params: { exercice: E }, headers: cle('f1'), body: { valeur: false } };
    await expect(appel(routes.modifierInclureSousReserve, e)).rejects.toMatchObject({ code: 'REGLAGE_VERROUILLE', status: 403 });
    await expect(appel(routes.modifierInclureSousReserve, e)).rejects.toMatchObject({ code: 'REGLAGE_VERROUILLE' });
    expect(journal).toHaveLength(1);
  });

  it('d4-payee-cochee-une-ligne', async () => {
    const { journal, routes } = monter();
    const r = (await appel(routes.cocherTvaPayee, { params: { exercice: E, periode: '2027-03' }, headers: cle('p1') })) as { body: unknown };
    expect(r.body).toEqual({ etat: 'payee', par: 'personne-fictive-1', le: '2027-02-10', origine: 'coche' });
    expect(journal).toHaveLength(1);
    expect(journal[0]).toMatchObject({ type: 'tva_payee_cochee', par: 'personne-fictive-1', le: '2027-02-10', origine: 'coche' });
  });

  it('payee-meme-cle-meme-reponse', async () => {
    const { journal, routes } = monter();
    const e = { params: { exercice: E, periode: '2027-03' }, headers: cle('p2') };
    const a = await appel(routes.cocherTvaPayee, e);
    const b = await appel(routes.cocherTvaPayee, e);
    expect(b).toEqual(a);
    expect(journal).toHaveLength(1);
  });

  it('payee-autre-cle-409', async () => {
    const { journal, routes } = monter();
    await appel(routes.cocherTvaPayee, { params: { exercice: E, periode: '2027-03' }, headers: cle('p3') });
    await expect(appel(routes.cocherTvaPayee, { params: { exercice: E, periode: '2027-03' }, headers: cle('p4') })).rejects.toMatchObject({ code: 'DEJA_FAIT', status: 409 });
    expect(journal).toHaveLength(1);
  });

  it('payee-periode-en-doute-409', async () => {
    const { journal, routes } = monter();
    await expect(appel(routes.cocherTvaPayee, { params: { exercice: E, periode: '2027-01' }, headers: cle('p5') })).rejects.toMatchObject({ code: 'PERIODE_BLOQUEE', status: 409 });
    await expect(appel(routes.cocherTvaPayee, { params: { exercice: E, periode: '2030-01' }, headers: cle('p6') })).rejects.toMatchObject({ code: 'OBJET_INCONNU', status: 404 });
    expect(journal).toHaveLength(0);
  });

  it('sous-reserve-par-une-personne-trace', async () => {
    const { journal, service, routes } = monter();
    const solide = service.deduction();
    const r = (await appel(routes.passerLigneEnSousReserve, { params: { exercice: E, ligne: 'ligne-fictive-2' }, headers: cle('s1'), body: { motif: 'justificatif attendu' } })) as { body: { ligne: { certitude: string }; trace: unknown } };
    expect(r.body.ligne.certitude).toBe('sous_reserve');
    expect(r.body.trace).toEqual({ acteurId: 'personne-fictive-1', le: '2027-02-10', motif: 'justificatif attendu', pieceId: 'piece-fictive-2' });
    expect(journal).toHaveLength(1);
    expect(journal[0]).toMatchObject({ type: 'passage_sous_reserve', par: 'personne-fictive-1', ligne: 'ligne-fictive-2' });
    expect(solide).toEqual({ etat: 'bloquee', piecesEnDoute: 1 });
    expect(service.deduction()).toEqual({ etat: 'preparee', centimes: 170 });
  });

  it('sous-reserve-par-ia-403', async () => {
    const { courant, journal, routes } = monter();
    courant.acteur = { type: 'ia', id: 'ia-fictive-1', role: 'comptable' };
    await expect(appel(routes.passerLigneEnSousReserve, { params: { exercice: E, ligne: 'ligne-fictive-2' }, headers: cle('s2'), body: { motif: 'essai' } })).rejects.toMatchObject({ code: 'ACTEUR_NON_HUMAIN', status: 403 });
    expect(journal).toHaveLength(0);
  });

  it('sous-reserve-ligne-solide-409', async () => {
    const { journal, routes } = monter();
    await expect(appel(routes.passerLigneEnSousReserve, { params: { exercice: E, ligne: 'ligne-fictive-1' }, headers: cle('s3'), body: { motif: 'essai' } })).rejects.toMatchObject({ code: 'TRANSITION_INTERDITE', status: 409 });
    await expect(appel(routes.passerLigneEnSousReserve, { params: { exercice: E, ligne: 'ligne-inconnue' }, headers: cle('s4'), body: { motif: 'essai' } })).rejects.toMatchObject({ code: 'OBJET_INCONNU', status: 404 });
    expect(journal).toHaveLength(0);
  });

  it('sous-reserve-motif-vide-400', async () => {
    const a = creerApp();
    apps.push(a);
    const url = `/exercices/${E}/tva/lignes/ligne-fictive-2/sous-reserve`;
    for (const payload of [{ motif: '' }, { motif: '   ' }, { motif: 'ok', en_trop: 1 }]) {
      expect((await a.inject({ method: 'POST', url, headers: cle('s5'), payload })).statusCode).toBe(400);
    }
    expect((await a.inject({ method: 'POST', url, payload: { motif: 'ok' } })).statusCode).toBe(400);
  });

  it('rattachement-ancien-et-nouveau-mois', async () => {
    const { journal, service, routes } = monter();
    const r = (await appel(routes.modifierRattachement, { params: { exercice: E, piece: 'piece-fictive-1' }, headers: cle('m1'), body: { nouveau_mois: '2027-02' } })) as { body: unknown };
    expect(r.body).toEqual({ ancien_mois: '2027-01', nouveau_mois: '2027-02', par: 'personne-fictive-1', le: '2027-02-10', periodes_a_recalculer: ['2027-01', '2027-02'] });
    expect(service.etat().rattachements.find((x) => x.pieceId === 'piece-fictive-1')?.mois).toBe('2027-02');
    expect(journal).toHaveLength(1);
    expect(journal[0]).toMatchObject({ type: 'rattachement_modifie', ancien_mois: '2027-01', nouveau_mois: '2027-02' });
    await expect(appel(routes.modifierRattachement, { params: { exercice: E, piece: 'piece-fictive-1' }, headers: cle('m2'), body: { nouveau_mois: '2027-02' } })).rejects.toMatchObject({ code: 'MOIS_IDENTIQUE', status: 409 });
  });

  it('rattachement-periode-deposee-409', async () => {
    const { journal, service, routes } = monter();
    const avant = service.etat();
    await expect(appel(routes.modifierRattachement, { params: { exercice: E, piece: 'piece-fictive-1' }, headers: cle('m3'), body: { nouveau_mois: '2026-12' } })).rejects.toMatchObject({ code: 'PERIODE_DEPOSEE', status: 409 });
    await expect(appel(routes.modifierRattachement, { params: { exercice: E, piece: 'piece-inconnue' }, headers: cle('m4'), body: { nouveau_mois: '2027-02' } })).rejects.toMatchObject({ code: 'OBJET_INCONNU', status: 404 });
    expect(service.etat()).toEqual(avant);
    expect(journal).toHaveLength(0);
  });

  it('serveur-par-defaut-refuse-401', async () => {
    const a = creerApp();
    apps.push(a);
    const base = `/exercices/${E}/tva`;
    const essais = [
      { method: 'PUT', url: `${base}/reglages/inclure-sous-reserve`, payload: { valeur: true } },
      { method: 'POST', url: `${base}/periodes/2027-03/payee` },
      { method: 'POST', url: `${base}/lignes/ligne-fictive-2/sous-reserve`, payload: { motif: 'essai' } },
      { method: 'PUT', url: `${base}/pieces/piece-fictive-1/rattachement`, payload: { nouveau_mois: '2027-02' } },
    ] as const;
    for (const e of essais) {
      expect((await a.inject({ ...e, headers: cle('d1') })).statusCode).toBe(401);
    }
    for (const mois of ['2027-13', '', '2027-1']) {
      const r = await a.inject({ method: 'PUT', url: `${base}/pieces/piece-fictive-1/rattachement`, headers: cle('d2'), payload: { nouveau_mois: mois } });
      expect(r.statusCode).toBe(400);
    }
    expect((await a.inject({ method: 'PUT', url: `${base}/pieces/piece-fictive-1/rattachement`, headers: cle('d3'), payload: { nouveau_mois: '2027-02', en_trop: 1 } })).statusCode).toBe(400);
    expect((await a.inject({ method: 'PUT', url: `${base}/reglages/inclure-sous-reserve`, payload: { valeur: true } })).statusCode).toBe(400);
  });
});
