import { describe, expect, it } from 'vitest';
import {
  avancer,
  creerFiche,
  ErreurVeille,
  type Acteur,
  type ActionVeille,
  type FicheChangement,
} from '../veille-circuit.js';

const T0 = '2026-03-01T08:00:00Z';
const T1 = '2026-03-02T08:00:00Z';
const T2 = '2026-03-03T08:00:00Z';
const T3 = '2026-03-04T08:00:00Z';
const T4 = '2026-03-05T08:00:00Z';
const T5 = '2026-03-06T08:00:00Z';
const IA: Acteur = { type: 'ia', id: 'assistant-1' };
const MARIE: Acteur = { type: 'personne', id: 'marie-exemple' };

function neuve(): FicheChangement {
  return creerFiche({ id: 'F1', sourceId: 'S1', detecteeLe: T0, empreinteAvant: 'aaa', empreinteApres: 'bbb' });
}

function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    expect(e).toBeInstanceOf(ErreurVeille);
    return (e as ErreurVeille).code;
  }
  return undefined;
}

function profond<T>(o: T): T {
  Object.freeze(o);
  if (o && typeof o === 'object') for (const v of Object.values(o)) if (v && typeof v === 'object' && !Object.isFrozen(v)) profond(v);
  return o;
}

function jusqua(statut: 'resumee' | 'validee' | 'testee' | 'signee'): FicheChangement {
  let f = avancer(neuve(), 'resumer', IA, T1, { resume: 'Résumé de test' });
  if (statut === 'resumee') return f;
  f = avancer(f, 'valider', MARIE, T2, { parametresTouches: ['p.un'] });
  if (statut === 'validee') return f;
  f = avancer(f, 'tester', MARIE, T3);
  if (statut === 'testee') return f;
  return avancer(f, 'signer', MARIE, T4);
}

describe('creerFiche', () => {
  it('cree-une-fiche-detectee', () => {
    const f = neuve();
    expect(f).toMatchObject({ statut: 'detectee', resumeIa: null, validateur: null, paquetId: null, parametresTouches: [], historique: [] });
    expect(Object.isFrozen(f)).toBe(true);
  });

  it('refuse-les-entrees-invalides', () => {
    const base = { id: 'F1', sourceId: 'S1', detecteeLe: T0, empreinteAvant: 'a', empreinteApres: 'b' };
    expect(code(() => creerFiche({ ...base, empreinteApres: 'a' }))).toBe('empreintes_identiques');
    expect(code(() => creerFiche({ ...base, id: '' }))).toBe('identifiant_invalide');
    expect(code(() => creerFiche({ ...base, id: '  ' }))).toBe('identifiant_invalide');
    expect(code(() => creerFiche({ ...base, sourceId: '' }))).toBe('identifiant_invalide');
    expect(code(() => creerFiche({ ...base, empreinteAvant: '' }))).toBe('empreinte_invalide');
    expect(code(() => creerFiche({ ...base, empreinteApres: '' }))).toBe('empreinte_invalide');
    expect(code(() => creerFiche({ ...base, detecteeLe: '2026-03-01' }))).toBe('date_invalide');
    expect(code(() => creerFiche({ ...base, detecteeLe: '2026-02-30T00:00:00Z' }))).toBe('date_invalide');
    expect(code(() => creerFiche({ ...base, detecteeLe: '2026-13-01T00:00:00Z' }))).toBe('date_invalide');
    expect(code(() => creerFiche({ ...base, detecteeLe: 'NaN' }))).toBe('date_invalide');
    expect(code(() => creerFiche({ ...base, detecteeLe: undefined as unknown as string }))).toBe('date_invalide');
    expect(code(() => creerFiche({ ...base, id: 3 as unknown as string }))).toBe('identifiant_invalide');
  });
});

describe('avancer', () => {
  it('saut-d-etat-refuse-depuis-un-etat-avance', () => {
    expect(code(() => avancer(jusqua('resumee'), 'tester', MARIE, T3))).toBe('transition_interdite');
    expect(code(() => avancer(jusqua('validee'), 'signer', MARIE, T3))).toBe('transition_interdite');
    expect(code(() => avancer(jusqua('testee'), 'publier', MARIE, T5, { paquetId: 'P' }))).toBe('transition_interdite');
    expect(code(() => avancer(jusqua('signee'), 'resumer', MARIE, T5, { resume: 'x' }))).toBe('transition_interdite');
    expect(code(() => avancer(jusqua('resumee'), 'resumer', IA, T3, { resume: 'x' }))).toBe('transition_interdite');
  });

  it('ia-ne-valide-pas', () => {
    expect(code(() => avancer(jusqua('resumee'), 'valider', IA, T2))).toBe('ia_non_autorisee');
    for (const a of ['tester', 'signer', 'publier', 'rejeter'] as const) {
      expect(code(() => avancer(jusqua('signee'), a, IA, T5, { paquetId: 'P' }))).toBe('ia_non_autorisee');
    }
  });

  it('ia-ne-touche-aucun-parametre', () => {
    const f = profond(jusqua('resumee'));
    expect(code(() => avancer(f, 'valider', IA, T2, { parametresTouches: ['tva.taux_a'] }))).toBe('ia_non_autorisee');
    expect(f.statut).toBe('resumee');
    expect(f.parametresTouches).toEqual([]);
    expect(f.validateur).toBeNull();
    expect(f.historique).toHaveLength(1);
    // l'IA peut résumer, sans rien toucher d'autre
    const r = avancer(neuve(), 'resumer', IA, T1, { resume: 'x', parametresTouches: ['p'] });
    expect(r.parametresTouches).toEqual([]);
    expect(r.validateur).toBeNull();
  });

  it('rejet-depuis-resumee', () => {
    const r = avancer(jusqua('resumee'), 'rejeter', MARIE, T2);
    expect(r.statut).toBe('rejetee');
    expect(r.historique[r.historique.length - 1]).toMatchObject({ de: 'resumee', vers: 'rejetee' });
    for (const s of ['validee', 'testee', 'signee'] as const) expect(avancer(jusqua(s), 'rejeter', MARIE, T5).statut).toBe('rejetee');
    expect(avancer(neuve(), 'rejeter', MARIE, T1).statut).toBe('rejetee');
  });

  it('rejet-apres-publication-refuse', () => {
    const p = avancer(jusqua('signee'), 'publier', MARIE, T5, { paquetId: 'P1' });
    expect(code(() => avancer(p, 'rejeter', MARIE, T5))).toBe('transition_interdite');
    const r = avancer(neuve(), 'rejeter', MARIE, T1);
    expect(code(() => avancer(r, 'rejeter', MARIE, T2))).toBe('transition_interdite');
    expect(code(() => avancer(r, 'resumer', IA, T2, { resume: 'x' }))).toBe('transition_interdite');
  });

  it('publier-sans-paquet-refuse', () => {
    const f = jusqua('signee');
    expect(code(() => avancer(f, 'publier', MARIE, T5))).toBe('paquet_manquant');
    expect(code(() => avancer(f, 'publier', MARIE, T5, { paquetId: '' }))).toBe('paquet_manquant');
    expect(code(() => avancer(f, 'publier', MARIE, T5, { paquetId: '  ' }))).toBe('paquet_manquant');
    expect(f.paquetId).toBeNull();
  });

  it('entree-jamais-modifiee', () => {
    const f = profond(neuve());
    const avant = JSON.stringify(f);
    const g = avancer(f, 'resumer', IA, T1, { resume: 'x' });
    expect(JSON.stringify(f)).toBe(avant);
    expect(g).not.toBe(f);
    expect(g.historique).not.toBe(f.historique);
    const p = ['a'];
    const h = avancer(profond(g), 'valider', MARIE, T2, { parametresTouches: p });
    p.push('b');
    expect(h.parametresTouches).toEqual(['a']);
    expect(g.statut).toBe('resumee');
  });

  it('refuse-les-cas-limites', () => {
    const f = jusqua('resumee');
    expect(code(() => avancer(f, 'valider', MARIE, 'hier'))).toBe('date_invalide');
    expect(code(() => avancer(f, 'valider', MARIE, '2026-03-02'))).toBe('date_invalide');
    expect(code(() => avancer(f, 'valider', MARIE, '2026-02-30T00:00:00Z'))).toBe('date_invalide');
    expect(code(() => avancer(f, 'valider', MARIE, ''))).toBe('date_invalide');
    expect(code(() => avancer(f, 'inconnue' as ActionVeille, MARIE, T2))).toBe('action_inconnue');
    expect(code(() => avancer(f, 'toString' as ActionVeille, MARIE, T2))).toBe('action_inconnue');
    expect(code(() => avancer(f, 'valider', { type: 'personne', id: '' }, T2))).toBe('acteur_invalide');
    expect(code(() => avancer(f, 'valider', { type: 'personne', id: ' ' }, T2))).toBe('acteur_invalide');
    expect(code(() => avancer(f, 'valider', { type: 'robot', id: 'x' } as unknown as Acteur, T2))).toBe('acteur_invalide');
    expect(code(() => avancer(f, 'valider', undefined as unknown as Acteur, T2))).toBe('acteur_invalide');
    expect(code(() => avancer(f, 'valider', MARIE, T2, { parametresTouches: [''] }))).toBe('parametres_invalides');
    expect(code(() => avancer(f, 'valider', MARIE, T2, { parametresTouches: 'p' as unknown as string[] }))).toBe('parametres_invalides');
    expect(code(() => avancer(neuve(), 'resumer', IA, T1))).toBe('resume_manquant');
    expect(code(() => avancer(neuve(), 'resumer', IA, T1, { resume: ' ' }))).toBe('resume_manquant');
    // valider sans paramètre touché : liste vide acceptée
    expect(avancer(f, 'valider', MARIE, T2).parametresTouches).toEqual([]);
  });

  it('date-anterieure-refusee', () => {
    const f = jusqua('resumee'); // dernier pas : T1
    expect(code(() => avancer(f, 'valider', MARIE, T0))).toBe('date_anterieure');
    expect(code(() => avancer(f, 'rejeter', MARIE, '2026-03-02T07:59:59Z'))).toBe('date_anterieure');
    expect(avancer(f, 'valider', MARIE, T1).statut).toBe('validee'); // égalité acceptée
    // sans historique, la borne est la date de détection
    expect(code(() => avancer(neuve(), 'resumer', IA, '2026-02-28T00:00:00Z', { resume: 'x' }))).toBe('date_anterieure');
    expect(avancer(neuve(), 'resumer', IA, T0, { resume: 'x' }).statut).toBe('resumee');
  });
});
