import { afterEach, describe, expect, it } from 'vitest';
import { genererFrais, type JeuFrais } from '../../../../packages/donnees-fictives/src/frais.js';
import { creerServiceFraisValidation, ErreurValidation } from '../../../../packages/contrat/src/domaines/frais-validation-service.js';
import { creerApp } from '../app.js';
import { configEssai } from '../domaines/frais-validation.js';
const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});
let compteur = 0;
const cle = (): string => 'cle-essai-' + String(++compteur).padStart(6, '0');
const PER = 'PER-01';
function http() {
  const a = creerApp();
  apps.push(a);
  const post = (url: string, payload: unknown, headers: Record<string, string> = {}) => a.inject({ method: 'POST', url, headers: { 'idempotency-key': cle(), ...headers }, payload: payload as object });
  return { a, post, valider: (payload: unknown, h: Record<string, string> = { 'x-personne': PER }) => post('/frais/valider', payload, h) };
}
/** Jeu fictif : carte grise sur VEH-01 et VEH-02, trajet FRA-013 remis à proposer. */
function jeu(): JeuFrais {
  const j = genererFrais();
  for (const v of j.vehicules.slice(0, 2)) Object.assign(v, { carteGrisePieceId: 'PIE-CG' + v.id });
  Object.assign(j.frais.find((f) => f.id === 'FRA-013') as object, { statut: 'propose' });
  return j;
}
const service = (j: JeuFrais = jeu(), surcharge: object = {}) => creerServiceFraisValidation(j, { ...configEssai(), ...surcharge });
const code = (appel: () => unknown): unknown => { try { appel(); } catch (e) { return e instanceof ErreurValidation ? e.code : e; } return 'AUCUNE'; };
const statut = (j: JeuFrais, id: string) => j.frais.find((f) => f.id === id)?.statut;
const somme = (l: Array<{ debitCentimes: number; creditCentimes: number }>, k: 'debitCentimes' | 'creditCentimes') => l.reduce((s, x) => s + x[k], 0);
describe('serveur : proposer, valider un lot, préparer un remboursement', () => {
  it('proposer-depense-ecriture-equilibree', async () => {
    const r = await http().post('/frais/FRA-005/proposer', undefined);
    expect(r.statusCode).toBe(200);
    const e = r.json().body;
    expect([e.statut, e.fraisId, e.date]).toEqual(['propose', 'FRA-005', '2025-03-12']);
    expect(e.lignes.length).toBeGreaterThanOrEqual(2);
    expect(somme(e.lignes, 'debitCentimes')).toBe(somme(e.lignes, 'creditCentimes'));
    expect(somme(e.lignes, 'creditCentimes')).toBeGreaterThan(0);
    const t = service().proposer('FRA-013', cle());
    expect(t.lignes).toHaveLength(2);
    expect(somme(t.lignes, 'debitCentimes')).toBe(somme(t.lignes, 'creditCentimes'));
  });
  it('proposer-trajet-bareme-a-verifier-409', () => {
    const j = jeu();
    expect(code(() => service(j).proposer('FRA-014', cle()))).toBe('BAREME_A_VERIFIER');
    expect(statut(j, 'FRA-014')).toBe('propose');
  });
  it('proposer-sans-justificatif-409', async () => {
    const r = await http().post('/frais/FRA-002/proposer', undefined);
    expect([r.statusCode, r.json().code]).toEqual([409, 'JUSTIFICATIF_MANQUANT']);
  });
  it('proposer-refuse-frais-paye-societe', async () => {
    const j = jeu();
    const f = j.frais.find((x) => x.id === 'FRA-005') as { dateDepense: string; montantTtc: number };
    j.lignesBanque.push({ id: 'LIB-009', carteId: 'CAR-01', date: f.dateDepense, libelle: 'Achat fictif', montantCentimes: -f.montantTtc });
    expect(code(() => service(j).proposer('FRA-005', cle()))).toBe('FRAIS_PAYE_SOCIETE');
    expect(code(() => service(j).proposer('FRA-999', cle()))).toBe('FRAIS_INCONNU');
    expect(statut(j, 'FRA-005')).toBe('propose');
  });
  it('valider-sans-personne-400', async () => {
    const r = await http().valider({ ids: ['FRA-005'] }, {});
    expect(r.statusCode).toBe(400);
  });
  it('valider-refuse-frais-paye-societe', () => {
    const j = jeu();
    const f = j.frais.find((x) => x.id === 'FRA-005') as { dateDepense: string; montantTtc: number };
    j.lignesBanque.push({ id: 'LIB-009', carteId: 'CAR-01', date: f.dateDepense, libelle: 'Achat fictif', montantCentimes: -f.montantTtc });
    expect(code(() => service(j).valider({ ids: ['FRA-012', 'FRA-005'] }, PER, cle()))).toBe('FRAIS_PAYE_SOCIETE');
    expect([statut(j, 'FRA-005'), statut(j, 'FRA-012')]).toEqual(['propose', 'propose']);
  });
  it('valider-lot-au-dela-du-seuil-recapitulatif', () => {
    const j = jeu();
    const s = service(j, { seuilLotNombre: 1 });
    let total: number | undefined;
    try { s.valider({ ids: ['FRA-005', 'FRA-012'] }, PER, cle()); } catch (e) { total = e instanceof ErreurValidation && e.code === 'RECAPITULATIF_A_CONFIRMER' ? e.totalCentimes : -1; }
    expect(total).toBeGreaterThan(0);
    expect(statut(j, 'FRA-005')).toBe('propose');
    const ok = s.valider({ ids: ['FRA-005', 'FRA-012'], confirmeRecapitulatif: true }, PER, cle());
    expect(ok.map((x) => x.ecritureId)).toEqual(['ECR-FRA-005', 'ECR-FRA-012']);
    expect([statut(j, 'FRA-005'), statut(j, 'FRA-012')]).toEqual(['valide', 'valide']);
    expect(service(jeu(), { seuilLotMontantCentimes: 1 }).valider({ ids: ['FRA-005'], confirmeRecapitulatif: true }, PER, cle())).toHaveLength(1);
  });
  it('valider-lot-ids-en-double-400', async () => {
    const { valider } = http();
    expect((await valider({ ids: ['FRA-005', 'FRA-005'] })).statusCode).toBe(400);
  });
  it('remboursement-superieur-409', async () => {
    const { post } = http();
    const r = await post('/remboursements', { personneId: PER, fraisIds: ['FRA-003'], montantCentimes: 999999 });
    expect([r.statusCode, r.json().code]).toEqual([409, 'REMBOURSEMENT_SUPERIEUR']);
  });
  it('remboursement-prepare-sans-virement', async () => {
    const { post } = http();
    const r = await post('/remboursements', { personneId: PER, fraisIds: ['FRA-003'] });
    expect(r.statusCode).toBe(201);
    expect(Object.keys(r.json().body).sort()).toEqual(['fraisIds', 'id', 'montantCentimes', 'personneId', 'statut']);
    expect(r.json().body).toMatchObject({ statut: 'propose', montantCentimes: 1260 });
    expect((await post('/remboursements', { personneId: PER, fraisIds: ['FRA-003'] })).statusCode).toBe(400);
  });
  it('idempotence-meme-reponse', async () => {
    const { a } = http();
    const entetes = { 'idempotency-key': cle() };
    const appel = () => a.inject({ method: 'POST', url: '/frais/FRA-005/proposer', headers: entetes });
    const [p, q] = [await appel(), await appel()];
    expect(q.json()).toEqual(p.json());
    const s = service(jeu());
    const k = cle();
    const un = s.valider({ ids: ['FRA-005'] }, PER, k);
    expect(s.valider({ ids: ['FRA-005'] }, PER, k)).toEqual(un);
    expect(code(() => s.valider({ ids: ['FRA-012'] }, PER, k))).toBe('CLE_REUTILISEE');
  });
  it('corps-invalides-400', async () => {
    const { valider, post } = http();
    const cent = Array.from({ length: 101 }, (_, i) => 'FRA-' + String(i));
    for (const ids of [[], cent]) expect((await valider({ ids })).statusCode).toBe(400);
    for (const montantCentimes of ['NaN', 1.5, -1, 0, null]) {
      expect((await post('/remboursements', { personneId: PER, fraisIds: ['FRA-003'], montantCentimes })).statusCode).toBe(400);
    }
  });
});
