import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../../app.js';
import { creerServicePropositions } from '../../domaines/chat-propositions.js';
import { creerServiceChat } from '../../domaines/chat.js';
import { creerJournalChat } from '../identite.js';
import { creerFauxSessions } from '../../../../../packages/noyau/src/session/memoire.js';
import type { Session } from '../../../../../packages/noyau/src/session/port.js';
import { cheminSociete } from '../../../../../packages/contrat/src/prefixe-routes.js';

const chat = (s: string) => cheminSociete('/chat').replace('{s}', s);
const DEBUT = '2031-03-10T08:00:00.000Z';
const base: Session = {
  personneId: 'personne-fictive-1', nature: 'personne', organisationId: 'org-fictive-1', organisations: ['org-fictive-1'],
  societeId: 'soc_a', societes: ['soc_a'], roles: ['utilisateur'], permissions: ['compta-lire', 'compta-saisir'], revendications: {},
};
const sessions = creerFauxSessions({
  personne: base, service: { ...base, nature: 'service', personneId: 'service-fictif-1' },
  lecture: { ...base, permissions: ['compta-lire'] }, autre: { ...base, societeId: 'soc_b', societes: ['soc_b'] },
});
const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(() => Promise.all(apps.splice(0).map((a) => a.close())).then(() => undefined));

function monter(outil = 'proposer_validation') {
  const journal = creerJournalChat('soc_a', DEBUT);
  const identite = { sessions, journal };
  const service = creerServicePropositions({ acteur: 'personne', horloge: () => DEBUT, reglages: { validiteMs: 1e6, toastMs: 1e5, historiqueMs: 1e6 }, identite });
  service.ajouter({ id: 'prp-0001', outil, niveau: 'B', cibles: ['ecr-1'], avant: { montant: 0 }, apres: { montant: 4200 } });
  const app = creerApp(undefined, { propositions: service, chat: creerServiceChat({ identite }) });
  apps.push(app);
  return { app, journal };
}
const applications = (j: ReturnType<typeof creerJournalChat>) => j.entrees().filter((e) => e.evenement === 'chat.application');
const appliquer = (app: ReturnType<typeof creerApp>, jeton?: string, s = 'soc_a') =>
  app.inject({ method: 'POST', url: `${chat(s)}/propositions/prp-0001/appliquer`, headers: { 'idempotency-key': 'cle-00001', ...(jeton ? { authorization: `Bearer ${jeton}` } : {}) } });

describe('identité du chat', () => {
  it('jeton-absent-401', async () => {
    const { app, journal } = monter();
    for (const jeton of [undefined, 'inconnu']) expect((await appliquer(app, jeton)).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: `${chat('soc_a')}/propositions/prp-0001` })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: `${chat('soc_a')}/tours/t1/arreter`, headers: { 'idempotency-key': 'cle-00001' } })).statusCode).toBe(401);
    expect(applications(journal)).toHaveLength(0);
  });
  it('autre-societe-403', async () => {
    const { app } = monter();
    expect((await appliquer(app, 'autre', 'soc_a')).statusCode).toBe(403);
    expect((await appliquer(app, 'personne', 'soc_b')).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: `${chat('soc_b')}/propositions/prp-0001`, headers: { authorization: 'Bearer personne' } })).statusCode).toBe(403);
  });
  it('compte-de-service-403', async () => {
    const { app, journal } = monter();
    const r = await appliquer(app, 'service');
    expect(r.statusCode).toBe(403);
    expect(r.json().code).toBe('ACTEUR_NON_HUMAIN');
    expect(applications(journal)).toHaveLength(0);
  });
  it('lecture-seule-outils-l', async () => {
    const { app } = monter();
    expect((await app.inject({ method: 'GET', url: `${chat('soc_a')}/propositions/prp-0001`, headers: { authorization: 'Bearer lecture' } })).statusCode).toBe(200);
    expect((await appliquer(app, 'lecture')).json().code).toBe('DROIT_INSUFFISANT');
    expect((await appliquer(monter('outil_inconnu').app, 'personne')).statusCode).toBe(403);
    expect((await appliquer(app, 'personne')).statusCode).toBe(200);
  });
  it('journal-une-ligne-par-application', async () => {
    const { app, journal } = monter();
    await appliquer(app, 'personne');
    await appliquer(app, 'personne');
    const lignes = journal.entrees();
    const n = lignes.length - 1;
    expect(applications(journal)).toHaveLength(1);
    expect(lignes[n]).toMatchObject({ acteur: 'personne-fictive-1', canal: 'chat', horodatage: DEBUT, avant: { montant: 0 }, apres: { montant: 4200 }, empreintePrecedente: lignes[n - 1]?.empreinte });
    expect(lignes[n]?.motif).toContain('proposer_validation');
  });
});
