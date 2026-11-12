import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { EntreeReleve } from '../../../../../packages/noyau/src/banque/import/analyse.js';
import type { ProfilImport } from '../../../../../packages/noyau/src/banque/import/profil.js';
import type { Contexte } from '../depot.js';
import { creerDepotMemoire, nouvelIdOrdonne } from '../depot-memoire.js';
import { confirmer, deposer, lireImport, repondre, type DependancesImport } from '../imports.js';
import { avecIdempotence, creerRegistreMemoire } from '../reponses-http.js';
const T0 = '2026-11-01T10:00:00.000Z';
const ctx = (societeId: string, type: 'personne' | 'ia' = 'personne'): Contexte => ({ societeId, acteur: { type, id: 'acteur-fictif' }, module: 'banque', canal: 'api', horodatage: T0 });
const A = ctx('S-A');
const PROFIL: ProfilImport = { colonnes: { date: 0, libelle: [1] }, signe: { type: 'signe', colonne: '2' }, format: { decimal: ',', milliers: '.' }, formatDate: 'JJ/MM/AAAA', deviseParDefaut: 'EUR', ligneEntete: 0 };
const MAUVAIS = { ...PROFIL, colonnes: { date: 0, libelle: [9] } };
const [IBAN_FICTIF, LIBELLE] = [`XX00${'1'.repeat(20)}`, 'Zorglub Tapis'];
const csv = (...l: string[]): Uint8Array => new TextEncoder().encode(['Date;Libelle;Montant', ...l].join('\n'));
const [L1, L2, L3] = [`01/10/2026;${LIBELLE};-12,50`, '02/10/2026;Boulangerie Fictive;-3,20', '03/10/2026;Atelier Imaginaire;-8,00'];
let n = 0;
const cleN = () => `cle-fictive-${String(++n).padStart(4, '0')}`;
const corps = (r: { corps: unknown }) => r.corps as { importId: string; etat: string; questions: { code: string }[] };
async function pret(consentement = true) {
  const depot = creerDepotMemoire({ nouvelId: nouvelIdOrdonne() });
  const [stock, ecrits, appels, lectures] = [new Map<string, Uint8Array>(), [] as string[], [] as unknown[], { n: 0 }];
  const deps: DependancesImport = {
    depot,
    originaux: { deposerSiAbsent: async (s, e, o) => { if (!stock.has(`${s}/${e}`)) { stock.set(`${s}/${e}`, o.slice()); ecrits.push(e); } }, lire: async (s, e) => stock.get(`${s}/${e}`)!.slice() },
    lecteur: { async lire(o): Promise<EntreeReleve | null> { lectures.n++; const t = new TextDecoder().decode(o); return t.startsWith('INCONNU') ? null : { format: 'csv', texte: t }; } },
    hacherIban: (b) => (b === undefined ? undefined : `h-${b}`), idempotence: creerRegistreMemoire(),
    lancerRapprochement: async (a) => void appels.push(a), parametres: { taillesApercu: 10, limitesXml: { profondeurMax: 20, noeudsMax: 500 }, villes: [] },
  };
  if (consentement) await depot.ajouter(A, 'consentement_banque', { donneLe: T0 });
  const comptes = [await depot.ajouter(A, 'compte_bancaire', { nom: 'Compte A' }), await depot.ajouter(A, 'compte_bancaire', { nom: 'Compte B' })];
  const dep = (octets: Uint8Array, cle = cleN()) => deposer(deps, A, { cle, octets });
  const rep = (id: string, e: { compteId?: string; profil?: ProfilImport }) => repondre(deps, A, id, { cle: cleN(), ...e });
  const conf = (id: string, c: Contexte = A) => confirmer(deps, c, id, cleN());
  const importerEtRepondre = async (octets: Uint8Array): Promise<string> => {
    const id = corps(await dep(octets)).importId;
    return (await rep(id, { compteId: comptes[0]!.id, profil: PROFIL })).statut === 200 ? id : 'echec';
  };
  return { depot, deps, stock, ecrits, appels, comptes, lectures, dep, rep, conf, importerEtRepondre, lignes: () => depot.lister(A, 'ligne_bancaire') };
}
describe('routes d’import de relevé', () => {
  it('depot-202-apercu-et-questions', async () => {
    const p = await pret();
    const r = await p.dep(csv(L1));
    expect([r.statut, corps(r)]).toMatchObject([202, { etat: 'a_confirmer', questions: [{ code: 'profil_a_choisir' }] }]);
    expect(JSON.stringify(r)).not.toContain('ibanBrut');
    expect(corps(await lireImport(p.deps, A, corps(r).importId))).toMatchObject({ etat: 'a_confirmer' });
    expect(await p.dep(new TextEncoder().encode('INCONNU'))).toEqual({ statut: 422, corps: { code: 'format_inconnu' } });
    expect(await p.depot.lister(A, 'import_job')).toHaveLength(1);
  });
  it('sans-consentement-403', async () => {
    const p = await pret(false);
    expect(await p.dep(csv(L1))).toEqual({ statut: 403, corps: { code: 'consentement_absent' } });
    await p.depot.ajouter(A, 'consentement_banque', { donneLe: T0, retireLe: T0 });
    expect((await p.dep(csv(L1))).statut).toBe(403);
    expect([p.stock.size, (await p.depot.lister(A, 'import_job')).length]).toEqual([0, 0]);
  });
  it('t02-3-reimport-meme-fichier', async () => {
    const p = await pret();
    await p.conf(await p.importerEtRepondre(csv(L1, L2)));
    const avant = p.lectures.n;
    expect(await p.dep(csv(L1, L2))).toEqual({ statut: 200, corps: { etat: 'deja_importe', recuLe: T0 } });
    expect([(await p.lignes()).length, (await p.depot.lister(A, 'import_job')).length]).toEqual([2, 1]);
    expect(p.lectures.n).toBe(avant);
  });
  it('reimport-chevauchant-cree-seulement-les-nouvelles', async () => {
    const p = await pret();
    await p.conf(await p.importerEtRepondre(csv(L1, L2)));
    const c = await p.conf(corps(await p.dep(csv(L2, L3))).importId);
    expect(c.corps).toEqual({ creees: 1, dejaPresentes: 1, rejetees: 0 });
    expect(await p.lignes()).toHaveLength(3);
  });
  it('t02-6-deuxieme-import-meme-profil-zero-question', async () => {
    const p = await pret();
    await p.conf(await p.importerEtRepondre(csv(L1)));
    const r2 = await p.dep(csv(L3));
    expect([r2.statut, corps(r2)]).toMatchObject([202, { etat: 'apercu', questions: [] }]);
  });
  it('reponse-quel-compte-puis-confirmer', async () => {
    const p = await pret();
    const id = corps(await p.dep(csv(L1))).importId;
    expect(await p.rep(id, { profil: MAUVAIS })).toEqual({ statut: 422, corps: { code: 'profil_invalide' } });
    expect(corps(await p.rep(id, { profil: PROFIL })).questions[0]).toMatchObject({ code: 'quel_compte' });
    expect(corps(await p.rep(id, { compteId: p.comptes[1]!.id }))).toMatchObject({ etat: 'apercu', questions: [] });
    expect((await p.conf(id)).statut).toBe(200);
    expect((await p.lignes()).map((l) => l['compteId'])).toEqual([p.comptes[1]!.id]);
  });
  it('confirmer-cree-lignes-rejets-et-lance-rapprochement', async () => {
    const p = await pret();
    const id = await p.importerEtRepondre(csv(L1, L1, '04/10/2026;Illisible;abc'));
    expect(await p.conf(id)).toEqual({ statut: 200, corps: { creees: 2, dejaPresentes: 0, rejetees: 1 } });
    const l = await p.lignes();
    expect(l.map((x) => [x['occurrence'], x['importId'], typeof x['empreinte']])).toEqual([[1, id, 'string'], [2, id, 'string']]);
    expect(await p.depot.lister(A, 'ligne_rejetee')).toMatchObject([{ importId: id, rang: 3 }]);
    expect(p.appels).toEqual([{ societeId: 'S-A', compteId: p.comptes[0]!.id, importId: id }]);
    expect(await p.conf(id)).toEqual({ statut: 409, corps: { code: 'etat_incompatible' } });
    expect([(await p.lignes()).length, p.appels.length]).toEqual([2, 1]);
  });
  it('confirmer-avec-questions-ouvertes-409', async () => {
    const p = await pret();
    expect(await p.conf(corps(await p.dep(csv(L1))).importId)).toEqual({ statut: 409, corps: { code: 'questions_ouvertes' } });
    expect([(await p.lignes()).length, p.appels.length]).toEqual([0, 0]);
    const vide = await p.importerEtRepondre(csv());
    expect(corps(await lireImport(p.deps, A, vide)).etat).toBe('vide');
    expect((await p.conf(vide)).corps).toMatchObject({ creees: 0 });
    expect(await p.lignes()).toHaveLength(0);
  });
  it('idempotence-meme-cle-et-autre-corps', async () => {
    const p = await pret();
    for (const cle of ['', 'a'.repeat(7), 'a'.repeat(129)]) expect(await p.dep(csv(L1), cle)).toEqual({ statut: 400, corps: { code: 'cle_invalide' } });
    const cle = cleN();
    const r1 = await p.dep(csv(L1), cle);
    const avant = p.lectures.n;
    expect([await p.dep(csv(L1), cle), p.lectures.n]).toEqual([r1, avant]);
    expect(await p.dep(csv(L2), cle)).toEqual({ statut: 409, corps: { code: 'cle_reutilisee' } });
    const [reg, nb] = [creerRegistreMemoire(), { n: 0 }];
    const exec = async () => ({ statut: 200 as const, corps: { appels: ++nb.n } });
    const idem = async (soc: string, c: object) => (await avecIdempotence(reg, soc, cle, c, exec)).corps;
    expect([await idem('S-A', { a: 1, b: 2 }), await idem('S-A', { b: 2, a: 1 }), await idem('S-B', { a: 1, b: 2 })]).toEqual([{ appels: 1 }, { appels: 1 }, { appels: 2 }]);
  });
  it('autre-societe-403-et-journal', async () => {
    const p = await pret();
    const id = corps(await p.dep(csv(L1))).importId;
    const B = ctx('S-B');
    for (const r of [await lireImport(p.deps, B, id), await repondre(p.deps, B, id, { cle: cleN(), profil: PROFIL }), await p.conf(id, B)]) expect(r).toEqual({ statut: 403, corps: { code: 'acces_refuse' } });
    const j = await p.depot.journal(B);
    expect(j.map((e) => e.evenement)).toEqual(Array(3).fill('banque.acces_refuse'));
    expect(JSON.stringify(j)).not.toContain(LIBELLE);
    expect((await lireImport(p.deps, B, 'B-inconnu')).statut).toBe(404);
  });
  it('ia-ne-confirme-pas', async () => {
    const p = await pret();
    const id = await p.importerEtRepondre(csv(L1));
    expect(await p.conf(id, ctx('S-A', 'ia'))).toEqual({ statut: 403, corps: { code: 'reserve_a_une_personne' } });
    expect([(await p.lignes()).length, p.appels.length]).toEqual([0, 0]);
  });
  it('aucun-iban-ni-libelle-dans-refus-et-journal', async () => {
    const p = await pret();
    const id = corps(await p.dep(csv(L1))).importId;
    const refus = [await p.rep(id, { profil: MAUVAIS }), await p.conf(id), await lireImport(p.deps, ctx('S-B'), id)];
    await p.importerEtRepondre(csv(L1, L2));
    const sortie = JSON.stringify([refus, await p.depot.journal(A), await p.depot.journal(ctx('S-B'))]);
    for (const interdit of [LIBELLE, IBAN_FICTIF, 'Boulangerie', 'ibanBrut']) expect(sortie).not.toContain(interdit);
  });
  it('original-intact', async () => {
    const p = await pret();
    const octets = csv(L1, L2);
    const sha = createHash('sha256').update(octets).digest('hex');
    await p.conf(await p.importerEtRepondre(octets));
    await p.dep(octets);
    expect(p.ecrits).toEqual([sha]);
    expect(Buffer.from(p.stock.get(`S-A/${sha}`)!).equals(Buffer.from(octets))).toBe(true);
  });
});
