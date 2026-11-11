import { afterEach, describe, expect, it } from 'vitest';
import { call } from '@orpc/server';
import { creerApp } from '../app.js';
import { deductionPreparee } from '../../../../packages/noyau/src/tva/sous-reserve.js';
import { routesTva } from '../domaines/tva.js';
import { creerServiceEcritureTva, type Acteur, type EtatTva, type LigneJournal } from '../domaines/tva-ecriture.js';
const appel = <I>(proc: unknown, input: I) => call(proc as Parameters<typeof call>[0], input, { context: {} });
const cle = (n: string) => ({ 'idempotency-key': `cle-essai-${n}` });
const E = 'exercice-fictif';
const L2 = 'ligne-fictive-2';
const payee = (periode: string, k: string) => ({ params: { exercice: E, periode }, headers: cle(k) });
const reserve = (ligne: string, k: string, motif = 'essai') => ({ params: { exercice: E, ligne }, headers: cle(k), body: { motif } });
const rattacher = (piece: string, k: string, nouveau_mois: string) => ({ params: { exercice: E, piece }, headers: cle(k), body: { nouveau_mois } });
const refuse = (p: Promise<unknown>, code: string, status: number) => expect(p).rejects.toMatchObject({ code, status });
const L = (n: number, certitude: 'solide' | 'en_doute', tvaCentimes: number) => ({ id: `ligne-fictive-${n}`, pieceId: `piece-fictive-${n}`, tvaCentimes, certitude });
const R = (n: number, mois: string) => ({ pieceId: `piece-fictive-${n}`, mois });
const etatFictif = (): EtatTva => ({ lignes: [L(1, 'solide', 100), L(2, 'en_doute', 50), L(3, 'solide', 70)], rattachements: [R(1, '2027-01'), R(2, '2027-01'), R(3, '2027-03'), R(4, '2026-12')], periodesDeposees: ['2026-12'] });
function monter(acteur: Acteur | undefined = { type: 'personne', id: 'personne-fictive-1', role: 'comptable' }) {
  const courant = { acteur };
  const journal: LigneJournal[] = [];
  const service = creerServiceEcritureTva({ session: { lire: () => (courant.acteur ? { acteur: courant.acteur } : undefined) }, journal: { ecrire: (l) => journal.push(l) }, horloge: () => '2027-02-10', etat: etatFictif() });
  return { courant, journal, service, routes: routesTva(undefined, service) };
}
const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});
describe('serveur : écritures de la TVA', () => {
  it('t1-reglage-refuse-quel-que-soit-le-role', async () => {
    const { courant, journal, service, routes } = monter();
    const avant = deductionPreparee(service.etat().lignes);
    const etatAvant = service.etat();
    let n = 0;
    for (const role of ['administrateur', 'comptable']) {
      courant.acteur = { type: 'personne', id: `personne-fictive-${role}`, role };
      await expect(appel(routes.modifierInclureSousReserve, { headers: cle(`r${++n}`), body: { valeur: true }, params: { exercice: E } })).rejects.toMatchObject({ code: 'REGLAGE_VERROUILLE', status: 403 });
      expect(journal).toHaveLength(n);
      expect(journal[n - 1]).toMatchObject({ type: 'refus_reglage', par: `personne-fictive-${role}`, reglage: 'tva.inclure_sous_reserve' });
    }
    expect(deductionPreparee(service.etat().lignes)).toEqual(avant);
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
    const r = (await appel(routes.cocherTvaPayee, payee('2027-03', 'p1'))) as { body: unknown };
    expect(r.body).toEqual({ etat: 'payee', par: 'personne-fictive-1', le: '2027-02-10', origine: 'coche' });
    expect(journal).toHaveLength(1);
    expect(journal[0]).toMatchObject({ type: 'tva_payee_cochee', par: 'personne-fictive-1', le: '2027-02-10', origine: 'coche' });
  });
  it('payee-meme-cle-meme-reponse', async () => {
    const { journal, routes } = monter();
    const e = payee('2027-03', 'p2');
    const a = await appel(routes.cocherTvaPayee, e);
    const b = await appel(routes.cocherTvaPayee, e);
    expect(b).toEqual(a);
    expect(journal).toHaveLength(1);
  });
  it('payee-autre-cle-409', async () => {
    const { journal, routes } = monter();
    await appel(routes.cocherTvaPayee, payee('2027-03', 'p3'));
    await refuse(appel(routes.cocherTvaPayee, payee('2027-03', 'p4')), 'DEJA_FAIT', 409);
    expect(journal).toHaveLength(1);
  });
  it('payee-periode-en-doute-409', async () => {
    const { journal, routes } = monter();
    await refuse(appel(routes.cocherTvaPayee, payee('2027-01', 'p5')), 'PERIODE_BLOQUEE', 409);
    await refuse(appel(routes.cocherTvaPayee, payee('2030-01', 'p6')), 'OBJET_INCONNU', 404);
    expect(journal).toHaveLength(0);
  });
  it('sous-reserve-par-une-personne-trace', async () => {
    const { journal, service, routes } = monter();
    const avant = deductionPreparee(service.etat().lignes);
    const r = (await appel(routes.passerLigneEnSousReserve, reserve(L2, 's1', 'justificatif attendu'))) as { body: { ligne: { certitude: string }; trace: unknown } };
    expect(r.body.ligne.certitude).toBe('sous_reserve');
    expect(r.body.trace).toEqual({ acteurId: 'personne-fictive-1', le: '2027-02-10', motif: 'justificatif attendu', pieceId: 'piece-fictive-2' });
    expect(journal).toHaveLength(1);
    expect(journal[0]).toMatchObject({ type: 'passage_sous_reserve', par: 'personne-fictive-1', ligne: 'ligne-fictive-2' });
    expect(avant).toEqual({ etat: 'bloquee', piecesEnDoute: 1 });
    expect(deductionPreparee(service.etat().lignes)).toEqual({ etat: 'preparee', centimes: 170 });
  });
  it('sous-reserve-par-ia-403', async () => {
    const { courant, journal, routes } = monter();
    courant.acteur = { type: 'ia', id: 'ia-fictive-1', role: 'comptable' };
    await refuse(appel(routes.passerLigneEnSousReserve, reserve('ligne-fictive-2', 's2')), 'ACTEUR_NON_HUMAIN', 403);
    expect(journal).toHaveLength(0);
  });
  it('sous-reserve-ligne-solide-409', async () => {
    const { journal, routes } = monter();
    await refuse(appel(routes.passerLigneEnSousReserve, reserve('ligne-fictive-1', 's3')), 'TRANSITION_INTERDITE', 409);
    await refuse(appel(routes.passerLigneEnSousReserve, reserve('ligne-inconnue', 's4')), 'OBJET_INCONNU', 404);
    expect(journal).toHaveLength(0);
  });
  it('sous-reserve-motif-vide-400', async () => {
    const a = creerApp();
    apps.push(a);
    const url = `/exercices/${E}/tva/lignes/ligne-fictive-2/sous-reserve`;
    for (const payload of [{ motif: '' }, { motif: '   ' }, { motif: 'ok', en_trop: 1 }]) expect((await a.inject({ method: 'POST', url, headers: cle('s5'), payload })).statusCode).toBe(400);
    expect((await a.inject({ method: 'POST', url, payload: { motif: 'ok' } })).statusCode).toBe(400);
  });
  it('rattachement-ancien-et-nouveau-mois', async () => {
    const { journal, service, routes } = monter();
    const r = (await appel(routes.modifierRattachement, rattacher('piece-fictive-1', 'm1', '2027-02'))) as { body: unknown };
    expect(r.body).toEqual({ ancien_mois: '2027-01', nouveau_mois: '2027-02', par: 'personne-fictive-1', le: '2027-02-10', periodes_a_recalculer: ['2027-01', '2027-02'] });
    expect(service.etat().rattachements.find((x) => x.pieceId === 'piece-fictive-1')?.mois).toBe('2027-02');
    expect(journal).toHaveLength(1);
    expect(journal[0]).toMatchObject({ type: 'rattachement_modifie', ancien_mois: '2027-01', nouveau_mois: '2027-02' });
    await refuse(appel(routes.modifierRattachement, rattacher('piece-fictive-1', 'm2', '2027-02')), 'MOIS_IDENTIQUE', 409);
  });
  it('rattachement-periode-deposee-409', async () => {
    const { journal, service, routes } = monter();
    const avant = service.etat();
    await refuse(appel(routes.modifierRattachement, rattacher('piece-fictive-1', 'm3', '2026-12')), 'PERIODE_DEPOSEE', 409);
    await refuse(appel(routes.modifierRattachement, rattacher('piece-inconnue', 'm4', '2027-02')), 'OBJET_INCONNU', 404);
    expect(service.etat()).toEqual(avant);
    expect(journal).toHaveLength(0);
  });
  it('serveur-par-defaut-refuse-401', async () => {
    const a = creerApp();
    apps.push(a);
    const base = `/exercices/${E}/tva`;
    const mv = (n: string, payload: object, url = `${base}/pieces/piece-fictive-1/rattachement`) => a.inject({ method: 'PUT', url, headers: cle(n), payload });
    const essais = [
      { method: 'PUT', url: `${base}/reglages/inclure-sous-reserve`, payload: { valeur: true } },
      { method: 'POST', url: `${base}/periodes/2027-03/payee` },
      { method: 'POST', url: `${base}/lignes/ligne-fictive-2/sous-reserve`, payload: { motif: 'essai' } },
      { method: 'PUT', url: `${base}/pieces/piece-fictive-1/rattachement`, payload: { nouveau_mois: '2027-02' } },
    ] as const;
    for (const e of essais) expect((await a.inject({ ...e, headers: cle('d1') })).statusCode).toBe(401);
    for (const mois of ['2027-13', '', '2027-1']) expect((await mv('d2', { nouveau_mois: mois })).statusCode).toBe(400);
    expect((await mv('d3', { nouveau_mois: '2027-02', en_trop: 1 })).statusCode).toBe(400);
    expect((await a.inject({ method: 'PUT', url: `${base}/reglages/inclure-sous-reserve`, payload: { valeur: true } })).statusCode).toBe(400);
  });
});
