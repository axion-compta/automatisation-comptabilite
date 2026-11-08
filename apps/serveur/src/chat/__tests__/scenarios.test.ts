import { describe, expect, it } from 'vitest';
import { executerTour, MARQUEUR_INCONNU, type ContexteTour, type EntreeJournal, type ReglagesTour } from '../tour.js';
import { repondreSelonVolume, type LectureVolume } from '../volume-plan.js';
import { creerServiceChat } from '../../domaines/chat.js';
import { creerServicePropositions } from '../../domaines/chat-propositions.js';
import { ErreurModele, type ModeleTexte } from '../../ia/appel.js';
import { DecodeurFlux } from '../../../../../packages/contrat/src/chat/flux.js';
import { empreinteCanonique } from '../../../../../packages/noyau/src/chat/annulation.js';
import { verifierTour, type EvenementTour } from '../../../../../packages/noyau/src/chat/issues.js';
import { ErreurChat } from '../../../../../packages/noyau/src/chat/types.js';
import type { Evenement } from '../../../../../packages/contrat/src/chat/evenements.js';

const LECTURE = JSON.stringify({ outil: 'exercices.lister', arguments: {} });
const REGLAGES: ReglagesTour = {
  principal: 'alias-a', secours: 'alias-b', listeFermee: ['alias-a', 'alias-b'], delaiMs: 1000, plafond: 0, tarifEntree: 0, tarifSortie: 0,
  plafondJetonsSortie: 0, etapesMax: 3, lexique: [], sorteAgent: 'chat', roleLectureSeule: true, detecteurSensibles: () => ({ zones: [] }),
};
/** Port de test : compte ses appels et note l'alias demandé ; une erreur du script simule une panne. */
function port(...script: Array<string | ErreurModele>) {
  const alias: string[] = [];
  const completer: ModeleTexte['completer'] = (a) => {
    const r = script[Math.min(alias.push(a) - 1, script.length - 1)];
    return r instanceof ErreurModele ? Promise.reject(r) : Promise.resolve({ texte: r ?? '', jetons: 1, coutMicroCentimes: 0, modele: 'm', version: 'v' });
  };
  return { p: { completer } as ModeleTexte, alias };
}
const contexte = (): ContexteTour => ({
  puces: [], societeSession: 'soc_a', societeConversation: 'soc_a', appartenance: () => 'soc_a',
  executer: () => ({ exercices: [{ id: 'e1', libelle: 'A' }, { id: 'e2', libelle: 'B' }] }),
});
async function tour(texte: string, p: ModeleTexte, r: Partial<ReglagesTour> = {}) {
  const journal: EntreeJournal[] = [];
  const demande = { message_id: 'm1', conversation_id: 'c1', texte, puces: [], canal: 'clavier' as const };
  const evts: Evenement[] = [];
  for await (const e of executerTour({ demande, contexte: contexte(), port: p, reglages: { ...REGLAGES, ...r }, journal: (j) => journal.push(j) })) evts.push(e);
  const fin = evts[evts.length - 1] as { issue?: string };
  return { evts, journal, issue: fin.issue, valide: verifierTour(evts as EvenementTour[]).valide };
}
/** Service de propositions avec horloge injectée et réglages de test inventés (en minutes). */
const MIN = 60_000;
const REGLAGES_PROP = { validiteMs: 30 * MIN, toastMs: 2 * MIN, historiqueMs: 5 * MIN };
function propositions() {
  const h = { t: Date.parse('2031-03-10T08:00:00.000Z') };
  const s = creerServicePropositions({ acteur: 'personne', horloge: () => new Date(h.t).toISOString(), reglages: REGLAGES_PROP });
  const avant = { montantCentimes: 0 };
  const apres = { montantCentimes: 4200 };
  s.ajouter({ id: 'prp-1', outil: 'enregistrer_ecriture', niveau: 'B', cibles: ['ecr-1'], avant, apres });
  s.appliquerProposition('prp-1', 'cle-application');
  return { s, h, avant, apres };
}
const volume = (l: LectureVolume) => ({ lire: () => Promise.resolve(l) });

describe('scénarios T-CHT rejoués sur le serveur en mémoire', () => {
  it('T-CHT-3', () => {
    const { s, h, avant } = propositions();
    h.t += REGLAGES_PROP.toastMs / 2;
    expect(s.annulerProposition('prp-1', 'cle-annulation').etat).toBe('annulee');
    expect(empreinteCanonique(s.etatObjet('prp-1'))).toBe(empreinteCanonique(avant));
  });

  it('T-CHT-4', () => {
    const { s, h, apres } = propositions();
    h.t += REGLAGES_PROP.historiqueMs + MIN;
    expect(() => s.annulerProposition('prp-1', 'cle-annulation')).toThrow(expect.objectContaining({ code: 'annulation_expiree' }));
    expect(() => s.annulerProposition('prp-1', 'cle-annulation')).toThrow(ErreurChat);
    expect(empreinteCanonique(s.etatObjet('prp-1'))).toBe(empreinteCanonique(apres));
  });

  it('T-CHT-9', async () => {
    let ouvrir: () => void = () => undefined;
    const porte = new Promise<void>((res) => (ouvrir = res));
    const service = creerServiceChat({ attendre: async (rang) => (rang === 3 ? porte : undefined) });
    const envoi = service.envoyer({ message_id: 'msg-0001', conversation_id: 'conv-0001', texte: 'Bonjour', puces: [], canal: 'clavier' });
    await service.tourOuvert('msg-0001');
    expect(service.arreter('msg-0001')).toBe(true);
    ouvrir();
    const evts = new DecodeurFlux().pousser(await envoi);
    expect(evts[evts.length - 1]?.type).toBe('tour.fin');
    expect(evts.filter((e) => e.type === 'texte')).toEqual([]);
    expect([service.motifFin('msg-0001'), service.ecrituresAppliquees()]).toEqual(['arret', 0]);
  });

  it('T-CHT-10', async () => {
    const service = creerServiceChat();
    const demande = { message_id: 'msg-0001', conversation_id: 'conv-0001', texte: 'Bonjour', puces: [], canal: 'clavier' as const };
    const a = await service.envoyer(demande);
    expect(await service.envoyer(demande)).toBe(a);
    expect(service.appelsIa()).toBe(1);
  });

  it('T-CHT-13', async () => {
    const t = await tour('Combien ?', port(LECTURE, 'Il y a {{ref:appel_1.exercices_nombre}} exercices.').p);
    const texte = (t.evts.find((e) => e.type === 'texte') as { texte: string }).texte;
    expect(texte).toBe('Il y a 2 exercices.');
    expect(texte).not.toContain(MARQUEUR_INCONNU);
    expect(t.issue).toBe('reponse');
  });

  it('T-CHT-14', async () => {
    const { p, alias } = port('x');
    const t = await tour('Bonjour', p, { plafond: 5, tarifEntree: 1 });
    expect(t.evts.find((e) => e.type === 'erreur')).toMatchObject({ code: 'budget_tour_atteint' });
    expect([alias.length, t.issue, t.valide]).toEqual([0, 'refus_utile', true]);
  });

  it('T-CHT-15', async () => {
    const SEUIL_ESSAI = 9000;
    const modele = port('x');
    const appels = () => modele.alias.length;
    const portModele = { repondre: (m: string) => modele.p.completer('alias-a', m, new AbortController().signal).then((r) => r.texte) };
    const plein = await repondreSelonVolume(volume({ utilise: 100, inclus: 100, seuilPdb: SEUIL_ESSAI }), portModele, 'Bonjour');
    expect([plein.decision, plein.reponse, appels()]).toEqual(['sans_modele', null, 0]);
    const sous = await repondreSelonVolume(volume({ utilise: 10, inclus: 100, seuilPdb: SEUIL_ESSAI }), portModele, 'Bonjour');
    expect([sous.decision, appels()]).toEqual(['normal', 1]);
  });

  it('T-CHT-16', async () => {
    const { p, alias } = port(new ErreurModele('serveur'), 'Bonjour');
    const t = await tour('Bonjour', p);
    expect(alias).toEqual(['alias-a', 'alias-b']);
    expect(t.issue).toBe('reponse');
  });

  it('T-CHT-17', async () => {
    const { p, alias } = port(new ErreurModele('serveur'));
    const t = await tour('Bonjour', p);
    expect(alias).toEqual(['alias-a', 'alias-b']);
    expect(t.evts.find((e) => e.type === 'erreur')).toMatchObject({ code: 'ia_indisponible' });
    expect([t.issue, t.valide]).toEqual(['escalade', true]);
  });
});
