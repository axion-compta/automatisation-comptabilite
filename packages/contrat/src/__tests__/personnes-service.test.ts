import { describe, expect, it } from 'vitest';
import { genererRgpd } from '../../../donnees-fictives/src/rgpd.js';
import type { RegleConservation } from '../../../noyau/src/conservation/regles.js';
import { readFileSync } from 'node:fs';
import { creerServicePersonnes, empreintePure, ErreurPersonnes, type OptionsPersonnes } from '../domaines/personnes-service.js';

const REF = '2026-11-09';
// Réglages inventés pour les tests : ni délai ni durée réels.
const MOIS_FICTIF = Number('2');
const RAPPEL_FICTIF = Number('5');
const ANNEES_LONGUES = Number('9');
const ANNEES_COURTES = Number('1');
const regle = (categorie: RegleConservation['categorie'], dureeAnnees: number): RegleConservation => ({
  pays: 'FR', categorie, dureeAnnees, pointDepart: 'date_document', statut: 'valide', source: 'source_fictive',
});
const creer = (o: Partial<OptionsPersonnes> = {}) =>
  creerServicePersonnes({
    horloge: () => `${REF}T10:00:00Z`, dateReference: REF, moisReponse: MOIS_FICTIF, joursRappel: RAPPEL_FICTIF,
    regles: [regle('pieces', ANNEES_LONGUES)], ...o,
  });
const code = (f: () => unknown): string | undefined => {
  try { f(); } catch (e) { return e instanceof ErreurPersonnes ? `${e.code}:${e.status}` : 'autre'; }
  return undefined;
};

describe('service des demandes des personnes', () => {
  it('liste-triee-retard-et-rappel', () => {
    const l = creer().lister();
    expect(l.map((d) => d.id)).toEqual(['dem_1', 'dem_3', 'dem_4', 'dem_2', 'dem_5', 'dem_6']);
    expect(l.filter((d) => d.en_retard).map((d) => d.id)).toEqual(['dem_1']);
    expect(l.filter((d) => d.a_rappeler).map((d) => d.id)).toEqual(['dem_2', 'dem_6']);
    expect(l.every((d) => d.conserve_jusqu_au === null)).toBe(true);
  });

  it('enregistrer-calcule-l-echeance', () => {
    const s = creer();
    const d = s.enregistrer('k1', { type: 'acces', recue_le: '2026-11-09' });
    expect(d).toMatchObject({ id: 'dem-1', etat: 'recue', echeance: '2027-01-09', issue: null });
    expect(s.lister().some((x) => x.id === 'dem-1')).toBe(true);
    expect(s.enregistrer('k2', { type: 'acces', recue_le: '2026-11-09' }).id).toBe('dem-2');
  });

  it('recherche-douze-pieces-t-exp-7', () => {
    const t = creer().rechercher({ nom: 'Camille Exemple' });
    expect(t.filter((x) => x.source === 'pieces')).toHaveLength(12);
    expect(code(() => creer().rechercher({}))).toBe('RECHERCHE_VIDE:422');
    expect(code(() => creer().rechercher({ nom: 'ab' }))).toBe('RECHERCHE_TROP_COURTE:422');
  });

  it('recherche-exclut-les-donnees-marquees', () => {
    const jeu = genererRgpd({ dateReference: REF });
    jeu.conversations = [{ id: 'conv_x', texte: 'Question de Zoe Inventee.', derniereActiviteLe: '2024-01-01' }];
    const s = creer({ jeu, regles: [regle('conversations', ANNEES_COURTES)], concernes: { 'dem-1': { nom: 'Zoe Inventee' } } });
    s.enregistrer('k', { type: 'effacement', recue_le: REF });
    expect(s.rechercher({ nom: 'Zoe Inventee' })).toHaveLength(1);
    s.traiter('c', 'dem-1', { issue: 'a_effacer' });
    expect(s.rechercher({ nom: 'Zoe Inventee' })).toEqual([]);
    expect(s.rechercher({ nom: 'Camille Exemple' }).length).toBeGreaterThan(0);
  });

  it('effacement-facture-exercice-clos-refuse-t-exp-8', () => {
    const s = creer({ concernes: { 'dem-1': { nom: 'Dominique Essai' } } });
    s.enregistrer('k', { type: 'effacement', recue_le: REF });
    const r = code(() => s.traiter('c1', 'dem-1', { issue: 'a_effacer' }));
    expect(r).toBe('ISSUE_NON_PERMISE:422');
    const d = s.traiter('c2', 'dem-1', { issue: 'refus_conservation', motif: 'Obligation de conservation.' });
    expect(d).toMatchObject({ etat: 'refusee', issue: 'refus_conservation', source_motif: 'source_fictive' });
    expect(d.conserve_jusqu_au).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(s.lister().find((x) => x.id === 'dem-1')?.conserve_jusqu_au).toBe(d.conserve_jusqu_au);
    expect(JSON.stringify(s.journal())).not.toContain('Obligation');
  });

  it('effacement-hors-obligation-marque-a-effacer-sans-suppression', () => {
    const jeu = genererRgpd({ dateReference: REF });
    jeu.conversations = [{ id: 'conv_x', texte: 'Question de Zoe Inventee.', derniereActiviteLe: '2024-01-01' }];
    const s = creer({ jeu, regles: [regle('conversations', ANNEES_COURTES)], concernes: { 'dem-1': { nom: 'Zoe Inventee' } } });
    s.enregistrer('k', { type: 'effacement', recue_le: REF });
    expect(s.rechercher({ nom: 'Zoe Inventee' })).toHaveLength(1);
    const d = s.traiter('c', 'dem-1', { issue: 'a_effacer' });
    expect(d).toMatchObject({ etat: 'traitee', issue: 'a_effacer', conserve_jusqu_au: null });
    expect(jeu.conversations.map((c) => c.id)).toEqual(['conv_x']);
    expect(s.rechercher({ nom: 'Zoe Inventee' })).toEqual([]);
    expect(s.journal().map((e) => e.type)).toEqual(['personne.demande_recue', 'personne.marque_a_effacer']);
  });

  it('aucune-regle-reglee-refus-prudent', () => {
    const jeu = genererRgpd({ dateReference: REF });
    jeu.conversations = [{ id: 'conv_x', texte: 'Question de Zoe Inventee.', derniereActiviteLe: '2024-01-01' }];
    const s = creer({ jeu, regles: [], concernes: { 'dem-1': { nom: 'Zoe Inventee' } } });
    s.enregistrer('k', { type: 'effacement', recue_le: REF });
    expect(code(() => s.traiter('c', 'dem-1', { issue: 'a_effacer' }))).toBe('ISSUE_NON_PERMISE:422');
    expect(s.rechercher({ nom: 'Zoe Inventee' })).toHaveLength(1);
  });

  it('issue-contredite-refusee', () => {
    const s = creer();
    expect(code(() => s.traiter('c', 'dem_6', { issue: 'acces_produit' }))).toBe('ISSUE_NON_PERMISE:422');
    expect(code(() => s.traiter('c', 'dem_2', { issue: 'rectifiee' }))).toBeUndefined();
    expect(code(() => s.traiter('c3', 'dem_inconnue', { issue: 'a_effacer' }))).toBe('DEMANDE_INTROUVABLE:404');
    expect(code(() => s.traiter('c4', 'dem_1', { issue: 'refus_conservation' }))).toBe('ISSUE_NON_PERMISE:422');
    expect(s.lister().find((x) => x.id === 'dem_6')?.etat).toBe('recue');
  });

  it('deja-traitee-409', () => {
    const s = creer();
    expect(code(() => s.traiter('c', 'dem_3', { issue: 'a_effacer' }))).toBe('DEJA_TRAITEE:409');
    const d = s.traiter('c2', 'dem_6', { issue: 'limitee' });
    expect(d.etat).toBe('traitee');
    expect(code(() => s.traiter('c3', 'dem_6', { issue: 'limitee' }))).toBe('DEJA_TRAITEE:409');
  });

  it('meme-cle-un-seul-evenement', () => {
    const s = creer();
    const a = s.enregistrer('k', { type: 'acces', recue_le: REF });
    expect(s.enregistrer('k', { type: 'acces', recue_le: REF })).toEqual(a);
    expect(s.journal()).toHaveLength(1);
    const t = s.traiter('t', 'dem_6', { issue: 'limitee' });
    expect(s.traiter('t', 'dem_6', { issue: 'limitee' })).toEqual(t);
    expect(s.journal()).toHaveLength(2);
    expect(s.lister().filter((x) => x.id.startsWith('dem-'))).toHaveLength(1);
  });

  it('empreinte-pure-sans-node-crypto', () => {
    const source = readFileSync(new URL('../domaines/personnes-service.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/node:crypto|from 'crypto'/);
    expect(empreintePure('dem_1|limitee')).toMatch(/^[0-9a-f]{64}$/);
    expect(empreintePure('dem_1|limitee')).toBe(empreintePure('dem_1|limitee'));
    expect(empreintePure('dem_1|limitee')).not.toBe(empreintePure('dem_2|limitee'));
    expect(empreintePure('')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('empreinte-injectee-utilisee-pour-le-traitement', () => {
    const vues: string[] = [];
    const s = creer({ empreinte: (t) => { vues.push(t); return 'a'.repeat(64); } });
    s.traiter('t', 'dem_6', { issue: 'limitee' });
    expect(vues).toEqual(['dem_6|limitee']);
  });
});
