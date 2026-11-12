import { afterEach, describe, expect, it } from 'vitest';
import { genererFrais, type FraisFictif, type JeuFrais } from '../../../../packages/donnees-fictives/src/frais.js';
import { conflitBanque, creerServiceFraisActions, ErreurActions } from '../../../../packages/contrat/src/domaines/frais-actions-service.js';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerApp } from '../app.js';
import { PREFIXE_ROUTES_SOCIETE } from '../../../../packages/contrat/src/prefixe-routes.js';
import { creerFauxSessions } from '../../../../packages/noyau/src/session/memoire.js';

const JETON = 'jeton-fictif-lemoine';
/** L'identité vient de la session : une session fictive par personne (le paramètre `x-personne` des appels choisit le jeton, l'en-tête n'est plus envoyé). */
const sessionDe = (personneId: string) => ({ personneId, nature: 'personne', organisationId: 'org-fictive-1', organisations: ['org-fictive-1'], societeId: 'soc-lemoine', societes: ['soc-lemoine'], roles: ['utilisateur'], permissions: ['compta-lire', 'compta-deposer'], revendications: {} }) as const;
const SESSIONS = Object.fromEntries(['PER-01', 'PER-02'].map((p) => [JETON + '-' + p, sessionDe(p)]));
/** Vrai serveur avec jeton : chaque URL reçoit le préfixe de la société fictive et l'en-tête `authorization`. */
function appSociete() {
  const a = creerApp(undefined, { securite: { jeton: { sessions: creerFauxSessions(SESSIONS) } } });
  const inject = (o: { method: 'GET' | 'POST' | 'PATCH'; url: string; headers?: Record<string, string>; payload?: object }) => {
    const { 'x-personne': personne = 'PER-01', ...autres } = o.headers ?? {};
    return a.inject({ ...o, url: PREFIXE_ROUTES_SOCIETE.replace('{s}', 'soc-lemoine') + o.url, headers: { authorization: 'Bearer ' + JETON + '-' + personne, ...autres } });
  };
  return { inject, close: () => a.close() };
}
const apps: Array<ReturnType<typeof appSociete>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

let compteur = 0;
const cle = (): string => 'cle-essai-' + String(++compteur).padStart(6, '0');
const PER = 'PER-01';
const depense = (o: object = {}) => ({ nature: 'depense', personneId: PER, date: '2025-06-10', libelle: 'Achat fictif', montantTtcCentimes: 1234, ...o });
const trajet = (o: object = {}) => ({ nature: 'trajet', personneId: PER, date: '2025-06-11', depart: 'Siège fictif', arrivee: 'Atelier Bertin', motif: 'Visite fictive', vehiculeId: 'VEH-01', kmTexte: '12,5', ...o });

/** Jeu fictif plus une ligne bancaire libre LIB-002 et un véhicule VEH-01 avec carte grise. */
function jeuSurMesure(): JeuFrais {
  const jeu = genererFrais();
  jeu.lignesBanque.push({ id: 'LIB-002', carteId: 'CAR-01', date: '2025-04-08', libelle: 'Station fictive', montantCentimes: -5200 });
  Object.assign(jeu.vehicules[0] as object, { carteGrisePieceId: 'PIE-CG1' });
  return jeu;
}
const ligneDe = (jeu: JeuFrais, id: string) => jeu.frais.find((f) => f.id === id)?.ligneBanqueId;
const nouveauService = (jeu: JeuFrais = jeuSurMesure()) => creerServiceFraisActions({ jeu });
const code = (appel: () => unknown): unknown => { try { appel(); } catch (e) { return e instanceof ErreurActions ? e.code : e; } return 'AUCUNE'; };

function nouvelle() {
  const a = appSociete();
  apps.push(a);
  const creer = (corps: unknown, k = cle(), p = PER) => a.inject({ method: 'POST', url: '/frais', headers: { 'idempotency-key': k, 'x-personne': p }, payload: corps as object });
  const completer = (id: string, corps: unknown, v: string, k = cle(), p = PER) =>
    a.inject({ method: 'PATCH', url: '/frais/' + id, headers: { 'idempotency-key': k, 'x-personne': p, 'if-match': v }, payload: corps as object });
  const lire = (id: string) => a.inject({ method: 'GET', url: '/frais/' + id });
  return { a, creer, completer, lire };
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

  it('completer-payeur-societe-garde', () => {
    const jeu = jeuSurMesure();
    const s = creerServiceFraisActions({ jeu });
    const c = s.creer(depense({ date: '2025-04-08', montantTtcCentimes: 5200 }) as never, PER, cle());
    expect(c).toMatchObject({ payeur: 'societe', statut: 'exclu_paye_societe' });
    const r = s.completer(c.id, { declaration: 'personne' }, 1, PER, cle());
    expect(r).toMatchObject({ payeur: 'societe', statut: 'exclu_paye_societe', version: 2 });
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

  it('creer-sans-piece-reste-a-completer', async () => {
    const { creer } = nouvelle();
    const r = await creer(depense({ declaration: 'personne' }));
    expect(r.json().body).toMatchObject({ statut: 'a_completer', payeur: 'personne' });
    expect(r.json().body.manque).toContain('justificatif');
    const ok = await creer(depense({ declaration: 'personne', pieceId: 'PIE-901' }));
    expect(ok.json().body.statut).toBe('propose');
  });

  it('completer-sans-piece-reste-a-completer', async () => {
    const { creer, completer } = nouvelle();
    const id = (await creer(depense())).json().body.id;
    const r = await completer(id, { declaration: 'personne' }, '1');
    expect(r.json().body).toMatchObject({ statut: 'a_completer', payeur: 'personne', version: 2 });
  });

  it('meme-ligne-banque-une-seule-fois', () => {
    const jeu = jeuSurMesure();
    const s = nouveauService(jeu);
    const un = s.creer(depense({ date: '2025-04-08', montantTtcCentimes: 5200 }) as never, PER, cle());
    const deux = s.creer(depense({ date: '2025-04-08', montantTtcCentimes: 5200 }) as never, PER, cle());
    expect(un.payeur).toBe('societe');
    expect(ligneDe(jeu, un.id)).toBe('LIB-002');
    expect(deux.payeur).not.toBe('societe');
    expect(ligneDe(jeu, deux.id)).not.toBe('LIB-002');
  });

  it('completer-propose-ligne-societe-a-completer', () => {
    const jeu = jeuSurMesure();
    const propose: FraisFictif = { ...(jeu.frais.find((f) => f.id === 'FRA-004') as FraisFictif), id: 'FRA-099', dateDepense: '2025-04-08', montantTtc: 5200, pieceId: 'PIE-099', statut: 'propose', payeur: 'personne', version: 1 };
    jeu.frais.push(propose);
    const r = nouveauService(jeu).completer('FRA-099', { declaration: 'personne' }, 1, PER, cle());
    expect(r).toMatchObject({ statut: 'a_completer', payeur: 'personne' });
    expect(ligneDe(jeu, 'FRA-099')).toBeUndefined();
  });

  it('trajet-calculable-2025-propose', () => {
    const r = nouveauService().creer(trajet() as never, PER, cle());
    expect(r).toMatchObject({ statut: 'propose', payeur: 'personne' });
  });

  it('trajet-bareme-2026-a-completer', () => {
    const s = nouveauService();
    expect(s.creer(trajet({ date: '2026-02-10' }) as never, PER, cle()).statut).toBe('a_completer');
    expect(s.creer(trajet({ date: '2027-02-10' }) as never, PER, cle()).statut).toBe('a_completer');
    expect(s.creer(trajet({ vehiculeId: 'VEH-04' }) as never, PER, cle()).statut).toBe('a_completer');
  });

  it('trajet-complement-vehicule-recalcule-statut', () => {
    for (const veh of ['VEH-04', 'VEH-02']) {
      const jeu = jeuSurMesure();
      const s = nouveauService(jeu);
      const t = s.creer(trajet() as never, PER, cle());
      expect(t.statut).toBe('propose');
      expect(s.completer(t.id, { vehiculeId: veh }, 1, PER, cle()).statut).toBe('a_completer');
    }
  });

  it('trajet-location-avec-carte-grise-a-completer', () => {
    const jeu = jeuSurMesure();
    Object.assign(jeu.vehicules[3] as object, { carteGrisePieceId: 'PIE-CG4' });
    expect(nouveauService(jeu).creer(trajet({ vehiculeId: 'VEH-04' }) as never, PER, cle()).statut).toBe('a_completer');
  });

  it('trajet-sans-carte-grise-a-completer', () => {
    expect(nouveauService(genererFrais()).creer(trajet() as never, PER, cle()).statut).toBe('a_completer');
  });

  it('ligne-d-un-frais-refuse-redevient-utilisable', () => {
    const jeu = jeuSurMesure();
    jeu.frais.push({ ...(jeu.frais.find((f) => f.id === 'FRA-004') as FraisFictif), id: 'FRA-098', statut: 'refuse', ligneBanqueId: 'LIB-002' });
    const r = nouveauService(jeu).creer(depense({ date: '2025-04-08', montantTtcCentimes: 5200 }) as never, PER, cle());
    expect(r.payeur).toBe('societe');
    expect(ligneDe(jeu, r.id)).toBe('LIB-002');
  });

  it('completer-doublon-piece-409', async () => {
    const { creer, completer } = nouvelle();
    const id = (await creer(depense())).json().body.id;
    const r = await completer(id, { pieceId: 'PIE-004' }, '1');
    expect([r.statusCode, r.json().code]).toEqual([409, 'DOUBLON_PIECE']);
  });

  it('completer-vehicule-societe-409', async () => {
    const { creer, completer } = nouvelle();
    const id = (await creer(trajet())).json().body.id;
    const r = await completer(id, { vehiculeId: 'VEH-03' }, '1');
    expect([r.statusCode, r.json().code]).toEqual([409, 'VEHICULE_SOCIETE']);
  });

  it('rejeu-sans-deuxieme-effet', () => {
    const jeu = jeuSurMesure();
    const avant = jeu.frais.length;
    const s = nouveauService(jeu);
    const k = cle();
    const un = s.creer(depense() as never, PER, k);
    expect(s.creer(depense() as never, PER, k)).toEqual(un);
    expect(jeu.frais.length).toBe(avant + 1);
    const deux = s.creer(depense() as never, PER, cle());
    expect(deux.id).toBe('FRA-' + String(avant + 2).padStart(3, '0'));
    expect(jeu.frais.length).toBe(avant + 2);
  });

  it('aucune-ecriture-si-erreur', () => {
    const jeu = jeuSurMesure();
    const avant = [jeu.frais.length, jeu.trajets.length];
    expect(code(() => nouveauService(jeu).creer(trajet({ vehiculeId: 'VEH-03' }) as never, PER, cle()))).toBe('VEHICULE_SOCIETE');
    expect([jeu.frais.length, jeu.trajets.length]).toEqual(avant);
  });
});

const rattache = (jeu: JeuFrais, o: Partial<FraisFictif>): FraisFictif => ({ ...(jeu.frais.find((f) => f.id === 'FRA-004') as FraisFictif), id: 'FRA-097', dateDepense: '2025-04-08', montantTtc: 5200, pieceId: 'PIE-097', statut: 'a_completer', payeur: 'personne', ...o });

describe('serveur : un seul jeu de frais, relecture bancaire', () => {
  it('jeu-partage-frais-cree-lisible', async () => {
    const { a, creer, lire } = nouvelle();
    const avant = (await a.inject({ method: 'GET', url: '/frais' })).json().total;
    const id = (await creer(depense())).json().body.id;
    const r = await lire(id);
    expect([r.statusCode, r.json().body.id]).toEqual([200, id]);
    expect((await a.inject({ method: 'GET', url: '/frais' })).json().total).toBe(avant + 1);
  });

  it('jeu-partage-km-trajet-cree', async () => {
    const { creer, lire } = nouvelle();
    const cree = (await creer(trajet())).json().body;
    expect(cree.kmDixiemes).toBe(125);
    expect((await lire(cree.id)).json().body.kmDixiemes).toBe(cree.kmDixiemes);
  });

  it('jeu-propre-a-chaque-application', async () => {
    const un = nouvelle();
    const id = (await un.creer(depense())).json().body.id;
    expect((await un.lire(id)).statusCode).toBe(200);
    expect((await nouvelle().lire(id)).statusCode).toBe(404);
  });

  it('lire-ligne-banque-id', async () => {
    const { lire } = nouvelle();
    expect((await lire('FRA-001')).json().body.ligneBanqueId).toBe('LIB-001');
    expect('ligneBanqueId' in (await lire('FRA-004')).json().body).toBe(false);
  });

  it('completer-perso-transition-interdite-409', async () => {
    const { completer, lire } = nouvelle();
    const avant = (await lire('FRA-009')).json().body;
    expect(avant.statut).toBe('perso');
    const r = await completer('FRA-009', { declaration: 'personne' }, String(avant.version));
    expect([r.statusCode, r.json().code]).toEqual([409, 'TRANSITION_INTERDITE']);
    const apres = (await lire('FRA-009')).json().body;
    expect([apres.statut, apres.version, apres.payeur]).toEqual(['perso', avant.version, avant.payeur]);
  });

  it('contrat-completer-transition-interdite-409', () => {
    const erreurs = (contrat.fraisActions.completerFrais as unknown as { '~orpc': { errorMap: Record<string, { status: number }> } })['~orpc'].errorMap;
    expect(erreurs.TRANSITION_INTERDITE?.status).toBe(409);
  });

  it('conflit-banque-ligne-societe-libre', () => {
    const jeu = jeuSurMesure();
    jeu.frais.push(rattache(jeu, {}));
    const avant = JSON.stringify(jeu);
    expect(conflitBanque(jeu, 'FRA-097')).toBe('LIB-002');
    expect(JSON.stringify(jeu)).toBe(avant);
  });

  it('conflit-banque-ligne-deja-rattachee-ignoree', () => {
    const jeu = jeuSurMesure();
    jeu.frais.push(rattache(jeu, {}), { ...rattache(jeu, {}), id: 'FRA-096', pieceId: 'PIE-096', statut: 'propose', ligneBanqueId: 'LIB-002' });
    expect(conflitBanque(jeu, 'FRA-097')).toBeUndefined();
    (jeu.frais.find((f) => f.id === 'FRA-096') as FraisFictif).statut = 'refuse';
    expect(conflitBanque(jeu, 'FRA-097')).toBe('LIB-002');
  });
});
