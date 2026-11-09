import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

let compteur = 0;
const cle = (): string => 'cle-essai-' + String(++compteur).padStart(6, '0');
const PER = 'PER-01';
const depense = (o: object = {}) => ({ nature: 'depense', personneId: PER, date: '2025-06-10', libelle: 'Achat fictif', montantTtcCentimes: 1234, ...o });
const trajet = (o: object = {}) => ({ nature: 'trajet', personneId: PER, date: '2025-06-11', depart: 'Siège fictif', arrivee: 'Atelier Bertin', motif: 'Visite fictive', vehiculeId: 'VEH-01', kmTexte: '12,5', ...o });

function nouvelle() {
  const a = creerApp();
  apps.push(a);
  const creer = (corps: unknown, k = cle(), p = PER) => a.inject({ method: 'POST', url: '/frais', headers: { 'idempotency-key': k, 'x-personne': p }, payload: corps as object });
  const completer = (id: string, corps: unknown, v: string, k = cle(), p = PER) =>
    a.inject({ method: 'PATCH', url: '/frais/' + id, headers: { 'idempotency-key': k, 'x-personne': p, 'if-match': v }, payload: corps as object });
  return { a, creer, completer };
}

describe('serveur : créer et compléter un frais', () => {
  it('creer-depense-a-completer', async () => {
    const { creer } = nouvelle();
    const r = await creer(depense());
    expect(r.statusCode).toBe(201);
    expect(r.json().body).toMatchObject({ nature: 'depense', statut: 'a_completer', payeur: 'a_confirmer', version: 1, personneId: PER, montantTtcCentimes: 1234 });
    expect(r.json().body.manque).toContain('justificatif');
    const t = await creer(trajet());
    expect(t.statusCode).toBe(201);
    expect(t.json().body).toMatchObject({ nature: 'trajet', payeur: 'personne', kmDixiemes: 125, vehiculeId: 'VEH-01', version: 1 });
  });

  it('creer-trajet-vehicule-societe-409', async () => {
    const { creer } = nouvelle();
    const r = await creer(trajet({ vehiculeId: 'VEH-03' }));
    expect([r.statusCode, r.json().code]).toEqual([409, 'VEHICULE_SOCIETE']);
  });

  it('doublon-de-piece-409', async () => {
    const { creer } = nouvelle();
    const r = await creer(depense({ pieceId: 'PIE-004' }));
    expect([r.statusCode, r.json().code]).toEqual([409, 'DOUBLON_PIECE']);
    const ok = await creer(depense({ pieceId: 'PIE-900' }));
    expect(ok.statusCode).toBe(201);
    expect((await creer(depense({ pieceId: 'PIE-900' }))).json().code).toBe('DOUBLON_PIECE');
  });

  it('completer-change-la-version', async () => {
    const { creer, completer } = nouvelle();
    const id = (await creer(depense())).json().body.id;
    const r = await completer(id, { motifSansJustificatif: 'Ticket perdu, motif fictif', partPersoTtcCentimes: 200 }, '1');
    expect(r.statusCode).toBe(200);
    expect(r.json().body).toMatchObject({ id, version: 2, partPersoTtcCentimes: 200, motifSansJustificatif: 'Ticket perdu, motif fictif' });
    const encore = await completer(id, { declaration: 'societe' }, '2');
    expect(encore.json().body).toMatchObject({ version: 3, payeur: 'societe' });
    expect((await completer(id, { partPersoTtcCentimes: 99999 }, '3')).statusCode).toBe(400);
  });

  it('completer-payeur-societe-garde', async () => {
    const { creer, completer } = nouvelle();
    const c = (await creer(depense({ date: '2025-03-12', montantTtcCentimes: 6400 }))).json().body;
    expect(c).toMatchObject({ payeur: 'societe', statut: 'exclu_paye_societe' });
    const r = await completer(c.id, { declaration: 'personne' }, '1');
    expect(r.statusCode).toBe(200);
    expect(r.json().body).toMatchObject({ payeur: 'societe', statut: 'exclu_paye_societe', version: 2 });
  });

  it('if-match-perime-412', async () => {
    const { creer, completer } = nouvelle();
    const id = (await creer(depense())).json().body.id;
    await completer(id, { declaration: 'societe' }, '1');
    const r = await completer(id, { declaration: 'personne' }, '1');
    expect([r.statusCode, r.json().code]).toEqual([412, 'VERSION_PERIMEE']);
    expect((await completer(id, {}, 'abc')).statusCode).toBe(400);
    expect((await completer('FRA-999', {}, '1')).json().code).toBe('FRAIS_INCONNU');
  });

  it('frais-valide-non-modifiable-409', async () => {
    const { completer } = nouvelle();
    const r = await completer('FRA-003', { declaration: 'societe' }, '1');
    expect([r.statusCode, r.json().code]).toEqual([409, 'FRAIS_VALIDE']);
  });

  it('autre-personne-403', async () => {
    const { creer, completer } = nouvelle();
    const r = await creer(depense({ personneId: 'PER-02' }));
    expect([r.statusCode, r.json().code]).toEqual([403, 'PERSONNE_DIFFERENTE']);
    expect((await creer(depense(), cle(), 'PER-02')).statusCode).toBe(403);
    const id = (await creer(depense())).json().body.id;
    expect((await completer(id, { declaration: 'societe' }, '1', cle(), 'PER-02')).statusCode).toBe(403);
    expect((await completer(id, {}, '1')).statusCode).toBe(200);
  });

  it('idempotence-meme-reponse', async () => {
    const { a, creer, completer } = nouvelle();
    const k = cle();
    const un = await creer(depense(), k);
    expect(await creer(depense(), k)).toMatchObject({ statusCode: 201 });
    expect((await creer(depense(), k)).json()).toEqual(un.json());
    expect((await a.inject({ method: 'GET', url: '/frais' })).json().total).toBe(16);
    const id = un.json().body.id;
    const k2 = cle();
    const p1 = await completer(id, { declaration: 'societe' }, '1', k2);
    const p2 = await completer(id, { declaration: 'societe' }, '1', k2);
    expect(p2.json()).toEqual(p1.json());
    expect(p2.json().body.version).toBe(2);
    expect((await a.inject({ method: 'POST', url: '/frais', headers: { 'x-personne': PER }, payload: depense() })).statusCode).toBe(400);
  });

  it('meme-cle-autre-corps-409', async () => {
    const { creer, completer } = nouvelle();
    const k = cle();
    expect((await creer(depense(), k)).statusCode).toBe(201);
    const r = await creer(depense({ montantTtcCentimes: 1235 }), k);
    expect([r.statusCode, r.json().code]).toEqual([409, 'CLE_REUTILISEE']);
    const k2 = cle();
    expect((await completer('FRA-004', { declaration: 'societe' }, '1', k2)).statusCode).toBe(200);
    expect((await completer('FRA-004', { declaration: 'personne' }, '2', k2)).json().code).toBe('CLE_REUTILISEE');
  });

  it('corps-invalides-400', async () => {
    const { creer } = nouvelle();
    const montants = [Number.NaN, 1.5, -1, 'Infinity'].map((montantTtcCentimes) => depense({ montantTtcCentimes }));
    const mauvais = [...montants, depense({ date: '2025-02-30' }), trajet({ kmTexte: '' }), trajet({ kmTexte: '0' }), depense({ nature: 'autre' })];
    for (const m of mauvais) expect((await creer(m)).statusCode).toBe(400);
    expect((await creer(depense(), 'court')).statusCode).toBe(400);
  });
});
