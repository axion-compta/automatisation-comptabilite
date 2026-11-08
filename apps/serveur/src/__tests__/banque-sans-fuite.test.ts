import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyReply } from 'fastify';
import type { Centimes } from '../../../../packages/noyau/src/argent/index.js';
import { genererBanque, type JeuBanque } from '../../../../packages/donnees-fictives/src/banque.js';
import { normaliserLibelle } from '../../../../packages/noyau/src/banque/libelles/normaliser.js';
import { proposerParIa } from '../../../../packages/noyau/src/banque/rapprochement/passe-ia.js';
import { rapprocher, type Reglage } from '../../../../packages/noyau/src/banque/rapprochement/passes.js';
import type { LigneBancaire, Moyen } from '../../../../packages/noyau/src/banque/types.js';
import { chercherFuites, resume } from '../../../../packages/noyau/src/exploitation/scanner-journaux.js';
import { validerListeRoutes } from '../../../../packages/noyau/src/securite/routes-ia.js';
import { creerApp } from '../app.js';
import { creerDepotMemoire, nouvelIdOrdonne } from '../banque/depot-memoire.js';
import type { Contexte } from '../banque/depot.js';
import { confirmer, deposer, repondre, type DependancesImport } from '../banque/imports.js';
import { creerRegistreMemoire, type ReponseHttp } from '../banque/reponses-http.js';
import { brancherJournal, NOM_CLE_JOURNAL } from '../exploitation/journal-requetes.js';
import { creerPasserelle, type Evenement } from '../ia/passerelle.js';

const CLE = 'cle-fictive-'.repeat(4);
const CLIENT = 'client-fictif';
const ROUTE = { fournisseur: 'fournisseur-test', region: 'region-test', mode: 'sans-entrainement' };
const LISTE = validerListeRoutes({ routes: [{ ...ROUTE, decision: 'D43', ajouteeLe: '2026-11-07' }] });
const PROFIL = { colonnes: { date: 0, libelle: [1] }, signe: { type: 'signe', colonne: '2' }, format: { decimal: ',', milliers: '' }, formatDate: 'JJ/MM/AAAA', deviseParDefaut: 'EUR', ligneEntete: 0 };
const bareme = { version: 'b-1', montantExact: 45, montantCentime: 43, contrepartieConnue: 25, contrepartieSimilaire: 15, referenceComplete: 20, referenceFin: 8, dateDansTolerance: 7, dateDouble: 3, sensEtMoyen: 3, regleApprise: 15, penalitePartielle: 10, penaliteEcartPeriode: 10, joursEcartPeriode: 60, plafond: 100, ecartAmbiguite: 5, plafondAmbigu: 79, seuils: { rapprochee: 95, proposee: 80, douteuse: 60 } };
const tol = (n: number): Record<Moyen, number> => ({ carte: n, virement: n, prelevement: n, cheque: n, especes: n, frais: n, inconnu: n });
const reglage: Reglage = { bareme, toleranceJours: tol(5), maxAffectation: 20 };
const reglageIa = { version: 'ia-1', plafondScore: 89, plafondDesaccord: 70 };
const T0 = '2026-11-01T10:00:00.000Z';
const ctx: Contexte = { societeId: 'S-ATELIER', acteur: { type: 'personne', id: 'acteur-fictif' }, module: 'banque', canal: 'api', horodatage: T0 };
const groupe4 = (s: string): string => s.replace(/(.{4})/g, '$1 ').trim();
const euros = (c: number): string => (c / 100).toFixed(2).replace('.', ',');
const jma = (d: string): string => `${d.slice(8)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

// Numéro de carte fictif de 16 chiffres, assemblé à l'exécution, clé de Luhn volontairement fausse.
function carteFictive(): string {
  const base = ['4974', '0185', '1234', '567'].join('');
  const somme = [...base].reverse().reduce((s, ch, i) => { const d = Number(ch) * (i % 2 === 0 ? 2 : 1); return s + (d > 9 ? d - 9 : d); }, 0);
  return base + String((((10 - (somme % 10)) % 10) + 1) % 10);
}
type Cibles = { ibans: string[]; cartes: string[]; libelles: string[]; noms: string[] };
type Fuite = { genre: string; indice: string };
// Cherche, sans tenir compte de la casse, tout ce qui ne doit jamais sortir.
function fuites(textes: string[], c: Cibles, tolerees: string[] = []): Fuite[] {
  const trouvees: Fuite[] = [];
  const noter = (genre: string, indice: string) => { if (!tolerees.includes(genre)) trouvees.push({ genre, indice }); };
  const sansEmpreinte = textes.map((t) => t.replace(/\b[0-9a-f]{64}\b/gi, ' '));
  for (const t of sansEmpreinte) {
    const bas = t.toLowerCase();
    const aiguilles: [string, string[]][] = [['fr76', ['fr76']], ['iban', c.ibans], ['carte', c.cartes], ['libelle', c.libelles], ['nom', c.noms]];
    for (const [genre, liste] of aiguilles) for (const a of liste) if (a.length >= 3 && bas.includes(a.toLowerCase())) noter(genre, genre === 'libelle' ? 'libelle' : a.slice(0, 4));
    if (/(?:\d ?){13,19}/.test(bas)) noter('suite_chiffres', 'chiffres');
  }
  const scan = chercherFuites(textes, { nomsInterdits: c.noms });
  for (const f of scan) noter(`scanner:${f.type}`, `ligne ${f.ligne}`);
  return trouvees;
}

function capturer() {
  const textes: string[] = [];
  const noter = (...a: unknown[]): void => void textes.push(a.map((x) => (typeof x === 'string' ? x : x instanceof Uint8Array ? Buffer.from(x).toString() : JSON.stringify(x))).join(' '));
  vi.spyOn(process.stdout, 'write').mockImplementation(((c: unknown) => (noter(c), true)) as never);
  vi.spyOn(process.stderr, 'write').mockImplementation(((c: unknown) => (noter(c), true)) as never);
  for (const m of ['log', 'info', 'warn', 'error', 'debug'] as const) vi.spyOn(console, m).mockImplementation(noter);
  return textes;
}

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

async function parcours() {
  const sorties = capturer();
  const jeu: JeuBanque = genererBanque();
  const carte = carteFictive();
  const ibanGroupe = groupe4(jeu.comptes[0]!.ibanFaux);
  const nom = jeu.contreparties[5]!.nom;
  const extras = [`VIR ${ibanGroupe} LOYER`, `CB ${carte.replace(/(.{4})/g, '$1 ').trim()} BOUTIQUE`, `VIR ${nom} ACOMPTE`];
  const jeuLignes = jeu.lignes.map((l) => `${jma(l.dateOperation)};${l.libelleBrut};${euros(l.montant)}`);
  const extraLignes = extras.map((l) => `28/10/2026;${l};${euros(-4200)}`);
  const csv = ['Date;Libelle;Montant', ...jeuLignes, ...extraLignes].join('\n');
  const nbLignes = jeuLignes.length + extraLignes.length;
  const cibles: Cibles = {
    ibans: jeu.comptes.flatMap((c) => [c.ibanFaux, groupe4(c.ibanFaux)]),
    cartes: [carte, groupe4(carte)],
    libelles: [...jeu.lignes.map((l) => l.libelleBrut), ...extras].flatMap((b) => [b, normaliserLibelle(b, []).normalise]),
    noms: jeu.contreparties.map((c) => c.nom),
  };
  const journal: string[] = [];
  const app = creerApp(undefined, { securite: { correlation: true } });
  apps.push(app);
  await brancherJournal(app, { coffre: { lireSecret: async (n) => (n === NOM_CLE_JOURNAL ? CLE : undefined) }, ecrire: (l) => void journal.push(l) });
  const depot = creerDepotMemoire({ nouvelId: nouvelIdOrdonne() });
  const stock = new Map<string, Uint8Array>();
  const deps: DependancesImport = {
    depot,
    originaux: { deposerSiAbsent: async (s, e, o) => void stock.set(`${s}/${e}`, o.slice()), lire: async (s, e) => stock.get(`${s}/${e}`)!.slice() },
    lecteur: { lire: async (o) => ({ format: 'csv', texte: new TextDecoder().decode(o) }) },
    hacherIban: (b) => (b === undefined ? undefined : `h-${b.length}`), idempotence: creerRegistreMemoire(),
    lancerRapprochement: async () => undefined, parametres: { taillesApercu: 5, limitesXml: { profondeurMax: 20, noeudsMax: 500 }, villes: [] },
  };
  await depot.ajouter(ctx, 'consentement_banque', { donneLe: T0 });
  const compte = await depot.ajouter(ctx, 'compte_bancaire', { nom: 'Compte fictif' });
  const envoi = (r: FastifyReply, h: ReponseHttp) => r.status(h.statut).send(h.corps);
  const cle = (h: Record<string, unknown>): string => String(h['idempotency-key']);
  app.addContentTypeParser('application/octet-stream', { parseAs: 'buffer' }, (_q, corps, fin) => fin(null, corps));
  app.post('/banque/imports', async (q, r) => envoi(r, await deposer(deps, ctx, { cle: cle(q.headers), octets: new Uint8Array(q.body as Buffer) })));
  app.post('/banque/imports/:id/reponses', async (q, r) => envoi(r, await repondre(deps, ctx, (q.params as { id: string }).id, { cle: cle(q.headers), ...(q.body as object) })));
  app.post('/banque/imports/:id/confirmer', async (q, r) => envoi(r, await confirmer(deps, ctx, (q.params as { id: string }).id, cle(q.headers))));
  const dep = await app.inject({ method: 'POST', url: '/banque/imports', headers: { 'content-type': 'application/octet-stream', 'idempotency-key': 'cle-fictive-0001' }, payload: Buffer.from(csv) });
  const importId = (dep.json() as { importId: string }).importId;
  const rep = await app.inject({ method: 'POST', url: `/banque/imports/${importId}/reponses`, headers: { 'idempotency-key': 'cle-fictive-0002' }, payload: { compteId: compte.id, profil: PROFIL } });
  const conf = await app.inject({ method: 'POST', url: `/banque/imports/${importId}/confirmer`, headers: { 'idempotency-key': 'cle-fictive-0003' } });
  // Rapprochement et passe IA par la passerelle, avec un faux fournisseur qui capture les questions.
  const lignes: LigneBancaire[] = [...jeu.lignes.map((l, i) => ({ ...l, rang: i + 1 })), ...extras.map((libelleBrut, k) => ({ ...jeu.lignes[0]!, id: `L-X${k}`, rang: nbLignes + k, libelleBrut, montant: -4200, moyen: 'virement' as Moyen }))]
    .map(({ montantOrigine, ...l }) => ({ ...l, montant: l.montant as Centimes, ...(montantOrigine === undefined ? {} : { montantOrigine: montantOrigine as Centimes }), certitudeContrepartie: 'connue' as const, etatTechnique: 'completee' as const, etatRapprochement: 'A_QUALIFIER' as const }));
  const pieces = jeu.pieces.map((p) => ({ ...p, montant: p.montant as Centimes, reste: p.montant as Centimes })) as never[];
  const res = rapprocher({ lignes, pieces }, reglage);
  const questions: string[] = [];
  const evenements: Evenement[] = [];
  const passerelle = creerPasserelle({ liste: LISTE, journaliser: (e) => void evenements.push(e), appel: async (_r, _c, q) => { questions.push(q); if (q === 'panne') throw new Error('panne fictive'); return JSON.stringify({ propositions: [] }); } });
  const proposer = async (e: unknown): Promise<string> => { const r = await passerelle.demander({ client: CLIENT, route: ROUTE, question: JSON.stringify(e) }); if (r.issue !== 'ok') throw new Error('indisponible'); return r.texte; };
  const ia = await proposerParIa({ lignes, pieces, liens: res.liens }, { bareme, reglage: reglageIa, personnes: cibles.noms, proposer });
  await passerelle.demander({ client: CLIENT, route: { ...ROUTE, region: 'hors-liste' }, question: extras.join(' ') });
  await passerelle.demander({ client: CLIENT, route: ROUTE, question: 'panne' });
  return { sorties, journal, evenements, questions, cibles, csv, nbLignes, extras, lignes, statuts: [dep.statusCode, rep.statusCode, conf.statusCode], compteurs: (rep.json() as { compteurs: { lues: number } }).compteurs, ia, res };
}

describe('aucune donnée bancaire dans les sorties techniques', () => {
  it('t01-3-aucun-fr76-apres-import', async () => {
    const p = await parcours();
    expect(p.statuts).toEqual([202, 200, 200]);
    expect(p.compteurs.lues).toBe(p.csv.split('\n').length - 1);
    expect(p.compteurs.lues).toBe(p.nbLignes);
    expect(p.journal.length).toBeGreaterThanOrEqual(p.statuts.length);
    const tout = [...p.journal, ...p.sorties, ...p.questions, JSON.stringify(p.evenements)];
    expect(tout.filter((t) => /fr76/i.test(t))).toEqual([]);
  });
  it('aucun-iban-ni-carte-ni-libelle-dans-les-journaux', async () => {
    const p = await parcours();
    expect(p.journal.length).toBeGreaterThan(0);
    expect(fuites([...p.journal, ...p.sorties], p.cibles)).toEqual([]);
    expect(resume(chercherFuites(p.journal, { nomsInterdits: p.cibles.noms }))).toEqual({ email: 0, iban: 0, montant: 0, nom: 0 });
  });
  it('aucun-libelle-dans-les-traces-ia', async () => {
    const p = await parcours();
    expect(p.evenements.map((e) => e.type)).toEqual(['ia.route_refusee', 'ia.indisponible']);
    expect(fuites(p.evenements.map((e) => JSON.stringify(e)), p.cibles)).toEqual([]);
  });
  it('t04-5-question-ia-pseudonymisee', async () => {
    const p = await parcours();
    expect(p.ia.issue).toBe('ok');
    const envoyees = p.questions.filter((q) => q !== 'panne');
    expect(envoyees.length).toBeGreaterThan(0);
    expect(envoyees.join('')).toContain('[IBAN_');
    expect(fuites(envoyees, p.cibles, ['libelle', 'scanner:montant'])).toEqual([]);
  });
  it('la-recherche-n-est-pas-aveugle', async () => {
    const p = await parcours();
    const genres = (f: Fuite[]) => new Set(f.map((x) => x.genre));
    const brut = genres(fuites([p.csv], p.cibles));
    for (const g of ['iban', 'carte', 'libelle']) expect(brut.has(g)).toBe(true);
    const question = JSON.stringify({ lignes: p.lignes.map((l) => ({ id: l.id, libelle: l.libelleBrut })) });
    const nue = genres(fuites([question], p.cibles));
    for (const g of ['iban', 'carte', 'libelle', 'nom']) expect(nue.has(g)).toBe(true);
  });
});
