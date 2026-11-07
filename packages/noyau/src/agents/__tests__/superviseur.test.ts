import { describe, expect, it } from 'vitest';
import { ETAPES_PIECE, SORTIES_PIECE } from '../../chat/types.js';
import { Superviseur, cleEtape, estFinal, etapeSuivante, type Agent, type Etat, type Resultat } from '../superviseur.js';

const OK: Resultat = { issue: 'ok' };
const NOMINAL: Etat[] = [...ETAPES_PIECE];
const BORNES = { maxEtapes: 20, maxReprises: 3 };
const tousOk = (): Record<string, Agent> => Object.fromEntries(ETAPES_PIECE.map((e) => [e, () => OK]));

describe('superviseur des agents', () => {
  it('parcours-nominal', () => {
    const r = new Superviseur().derouler('p1', tousOk(), BORNES);
    expect(r.etat).toBe('proposition_prete');
    expect(r.trace).toEqual(NOMINAL);
    expect(r.etapes).toBe(ETAPES_PIECE.length - 1);
    expect(r.reprises).toBe(0);
    expect(estFinal('proposition_prete')).toBe(true);
    expect(estFinal('recue')).toBe(false);
    for (const s of SORTIES_PIECE) expect(estFinal(s)).toBe(true);
  });

  it('ordre-fixe-des-etapes', () => {
    ETAPES_PIECE.slice(0, -1).forEach((e, i) => expect(etapeSuivante(e, OK)).toBe(ETAPES_PIECE[i + 1]));
    for (const s of SORTIES_PIECE) {
      expect(etapeSuivante('lue_a', { issue: s })).toBe(s);
      expect(etapeSuivante(s, OK)).toBe(s);
    }
    expect(etapeSuivante('proposition_prete', OK)).toBe('proposition_prete');
    expect(etapeSuivante('lue_a', { issue: 'ok', parcours: 'classee' })).toBe('lue_b');
  });

  it('rejeu-sans-second-effet', () => {
    const sup = new Superviseur();
    let appels = 0;
    const faire = () => ({ n: (appels += 1) });
    const a = sup.executer('p1', 'lue_a', 'v1', faire);
    const b = sup.executer('p1', 'lue_a', 'v1', faire);
    expect(appels).toBe(1);
    expect(b).toBe(a);
    expect(sup.executer('p2', 'lue_a', 'v1', faire).n).toBe(2);
    expect(cleEtape('p1', 'lue_a', 'v1')).toBe('p1:lue_a:v1');
    for (const [p, e, v] of [['', 'e', 'v'], ['p', 'e:x', 'v'], ['p', 'e', '']] as const) {
      expect(() => cleEtape(p, e, v)).toThrow(RangeError);
    }
    const compte: Record<string, number> = {};
    const agents = Object.fromEntries(ETAPES_PIECE.map((e) => [e, () => ((compte[e] = (compte[e] ?? 0) + 1), OK)]));
    const sup2 = new Superviseur();
    sup2.derouler('p1', agents, BORNES);
    expect(sup2.derouler('p1', agents, BORNES).etat).toBe('proposition_prete');
    expect(Object.values(compte).every((n) => n === 1)).toBe(true);
  });

  it('version-differente-rejouee', () => {
    const sup = new Superviseur();
    let appels = 0;
    const faire = () => (appels += 1);
    sup.executer('p1', 'lue_a', 'v1', faire);
    expect(sup.executer('p1', 'lue_a', 'v2', faire)).toBe(2);
    expect(appels).toBe(2);
    const compte = { n: 0 };
    const agents = { ...tousOk(), recue: () => ((compte.n += 1), OK) };
    sup.derouler('p9', agents, { ...BORNES, version: 'v1' });
    sup.derouler('p9', agents, { ...BORNES, version: 'v2' });
    expect(compte.n).toBe(2);
  });

  it('atypique-dans-la-liste', () => {
    const permis = ['classee', 'a_verifier'] as const;
    expect(etapeSuivante('lue_b', { issue: 'atypique', parcours: 'classee' }, permis)).toBe('classee');
    expect(etapeSuivante('lue_b', { issue: 'atypique', parcours: 'a_verifier' }, permis)).toBe('a_verifier');
    const agents = { ...tousOk(), recue: (): Resultat => ({ issue: 'atypique', parcours: 'comparee' }) };
    const r = new Superviseur().derouler('p1', agents, { ...BORNES, parcoursPermis: ['comparee'] });
    expect(r.trace.slice(0, 3)).toEqual(['recue', 'comparee', 'classee']);
    expect(r.etat).toBe('proposition_prete');
  });

  it('atypique-hors-liste-a-verifier', () => {
    expect(etapeSuivante('lue_b', { issue: 'atypique', parcours: 'classee' }, ['comparee'])).toBe('a_verifier');
    expect(etapeSuivante('lue_b', { issue: 'atypique', parcours: 'classee' })).toBe('a_verifier');
    expect(etapeSuivante('lue_b', { issue: 'atypique' }, ['classee'])).toBe('a_verifier');
    const hors = { issue: 'atypique', parcours: 'inconnu' } as unknown as Resultat;
    expect(etapeSuivante('lue_b', hors, ['inconnu' as Etat])).toBe('a_verifier');
  });

  it('reprises-bornees', () => {
    const sup = new Superviseur();
    let appels = 0;
    const agents = { ...tousOk(), lue_a: (): Resultat => { appels += 1; throw new Error('panne'); } };
    const r = sup.derouler('p1', agents, { maxEtapes: 20, maxReprises: 2 });
    expect(r.etat).toBe('en_attente');
    expect(appels).toBe(3);
    expect(r.reprises).toBe(3);
    let n = 0;
    const flaky = { ...tousOk(), lue_a: (): Resultat => { if ((n += 1) <= 2) throw new Error('panne'); return OK; } };
    const ok = new Superviseur().derouler('p2', flaky, { maxEtapes: 20, maxReprises: 2 });
    expect(ok.etat).toBe('proposition_prete');
    expect(ok.reprises).toBe(2);
  });

  it('etapes-bornees', () => {
    const sup = new Superviseur();
    const juste = ETAPES_PIECE.length - 1;
    expect(sup.derouler('p1', tousOk(), { maxEtapes: juste, maxReprises: 1 }).etat).toBe('proposition_prete');
    const court = sup.derouler('p2', tousOk(), { maxEtapes: juste - 1, maxReprises: 1 });
    expect(court.etat).toBe('en_attente');
    expect(court.etapes).toBe(juste - 1);
    const boucle = { ...tousOk(), lue_a: (): Resultat => ({ issue: 'atypique', parcours: 'recue' }) };
    expect(sup.derouler('p3', boucle, { maxEtapes: 10, maxReprises: 1, parcoursPermis: ['recue'] }).etat).toBe('en_attente');
    expect(sup.derouler('p4', { recue: () => OK }, BORNES).etat).toBe('en_attente');
  });

  it('cent-deroulements-aleatoires-finissent', () => {
    let graine = 12345;
    const alea = (n: number): number => {
      graine = (graine * 1664525 + 1013904223) % 4294967296;
      return graine % n;
    };
    const issues: Resultat[] = [OK, OK, OK, { issue: 'a_verifier' }, { issue: 'desaccord' }, { issue: 'en_attente' }, { issue: 'refusee' }, { issue: 'atypique', parcours: 'lue_a' }];
    for (let i = 0; i < 100; i += 1) {
      const agents = Object.fromEntries(
        ETAPES_PIECE.map((e) => [e, (): Resultat => { if (alea(4) === 0) throw new Error('panne'); return issues[alea(issues.length)] ?? OK; }]),
      );
      const r = new Superviseur().derouler(`p${i}`, agents, { maxEtapes: 12, maxReprises: 3, parcoursPermis: ['lue_a'] });
      expect(estFinal(r.etat)).toBe(true);
      expect(r.etapes).toBeLessThanOrEqual(12);
    }
  });

  it('bornes-invalides', () => {
    for (const v of [0, -1, 1.5, NaN, Infinity]) {
      expect(() => new Superviseur().derouler('p1', tousOk(), { maxEtapes: v, maxReprises: 1 })).toThrow(RangeError);
      expect(() => new Superviseur().derouler('p1', tousOk(), { maxEtapes: 5, maxReprises: v })).toThrow(RangeError);
    }
  });
});
