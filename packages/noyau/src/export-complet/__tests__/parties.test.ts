import { describe, expect, it } from 'vitest';
import { empreinteSha256 } from '../../documents/empreinte.js';
import { ErreurExploitation } from '../../exploitation/types.js';
import { decouper, manifesteGlobal, premierePartieAbsente, verifierParties } from '../parties.js';

function code(action: () => unknown): string | undefined {
  try {
    action();
  } catch (e) {
    return e instanceof ErreurExploitation ? e.code : 'autre';
  }
  return undefined;
}

const GO = 1024 * 1024 * 1024;
const f = (chemin: string, taille: number) => ({ chemin, taille });
const quatre = ['d', 'a', 'c', 'b'].map((c) => f(`${c}.pdf`, GO));
const empreinteDe = (nom: string) => empreinteSha256(`contenu ${nom}`);
const faite = (nom: string) => ({ nom, empreinte: empreinteDe(nom) });

describe('export complet : parties', () => {
  it('t-exp-12-quatre-parties', () => {
    const plan = decouper(quatre, GO);
    expect(plan.map((p) => p.nom)).toEqual(['partie-01.zip', 'partie-02.zip', 'partie-03.zip', 'partie-04.zip']);
    expect(plan.map((p) => p.chemins)).toEqual([['a.pdf'], ['b.pdf'], ['c.pdf'], ['d.pdf']]);
    expect(plan.every((p) => p.taille === GO)).toBe(true);
    expect(decouper([...quatre, f('e.pdf', 1)], GO)).toHaveLength(5);
    expect(decouper([...quatre].reverse(), GO)).toEqual(plan);
  });

  it('borne-egale-meme-partie', () => {
    const plan = decouper([f('b', 6), f('a', 4)], 10);
    expect(plan).toEqual([{ nom: 'partie-01.zip', chemins: ['a', 'b'], taille: 10 }]);
    expect(decouper([f('b', 6), f('a', 5)], 10)).toHaveLength(2);
  });

  it('fichier-trop-grand-refuse', () => {
    let erreur: unknown;
    try {
      decouper([f('petit', 1), f('gros-secret.pdf', 11)], 10);
    } catch (e) {
      erreur = e;
    }
    expect(erreur).toBeInstanceOf(ErreurExploitation);
    expect((erreur as ErreurExploitation).code).toBe('fichier_trop_grand');
    expect((erreur as Error).message).toContain('gros-secret.pdf');
  });

  it('liste-vide-une-partie-vide', () => {
    expect(decouper([], 10)).toEqual([{ nom: 'partie-01.zip', chemins: [], taille: 0 }]);
  });

  it('reprise-apres-partie-2-donne-3', () => {
    const plan = decouper(quatre, GO);
    const faites = [faite('partie-01.zip'), faite('partie-02.zip')];
    expect(premierePartieAbsente(plan, faites)).toBe('partie-03.zip');
    expect(premierePartieAbsente(plan, [faite('partie-02.zip')])).toBe('partie-01.zip');
    const trois = decouper([f('a', 1), f('b', 1), f('c', 1)], 1);
    expect(trois.map((p) => p.nom)).toEqual(['partie-01.zip', 'partie-02.zip', 'partie-03.zip']);
    const cent = decouper(Array.from({ length: 100 }, (_, i) => f(String(1000 + i), 1)), 1);
    expect(cent[0]?.nom).toBe('partie-001.zip');
    expect(cent[99]?.nom).toBe('partie-100.zip');
  });

  it('tout-fait-null', () => {
    const plan = decouper(quatre, GO);
    expect(premierePartieAbsente(plan, plan.map((p) => faite(p.nom)))).toBeNull();
    const global = manifesteGlobal(plan.map((p) => faite(p.nom)));
    expect(verifierParties(plan, plan.map((p) => faite(p.nom)), global)).toEqual({
      ok: true,
      manquantes: [],
      modifiees: [],
      enTrop: [],
    });
  });

  it('empreinte-mal-formee-refaite', () => {
    const plan = decouper(quatre, GO);
    const faites = [faite('partie-01.zip'), { nom: 'partie-02.zip', empreinte: 'ABC' }, faite('partie-03.zip')];
    expect(premierePartieAbsente(plan, faites)).toBe('partie-02.zip');
    const majuscules = { nom: 'partie-01.zip', empreinte: empreinteDe('x').toUpperCase() };
    expect(premierePartieAbsente(plan, [majuscules])).toBe('partie-01.zip');
  });

  it('manifeste-global-trie-et-verifie', () => {
    const plan = decouper(quatre, GO);
    const parties = ['partie-03.zip', 'partie-01.zip', 'partie-04.zip', 'partie-02.zip'].map(faite);
    const texte = manifesteGlobal(parties);
    expect(texte.split('\n').filter((l) => l !== '').map((l) => l.slice(66))).toEqual(
      plan.map((p) => p.nom),
    );
    expect(texte.endsWith('\n')).toBe(true);
    expect(verifierParties(plan, parties, texte).ok).toBe(true);
    const alteree = [faite('partie-01.zip'), { nom: 'partie-02.zip', empreinte: empreinteDe('autre') }];
    expect(verifierParties(plan, alteree, texte)).toEqual({
      ok: false,
      manquantes: ['partie-03.zip', 'partie-04.zip'],
      modifiees: ['partie-02.zip'],
      enTrop: [],
    });
    const faux = `partie-01.zip\n${'a'.repeat(64)}  partie-09.zip`;
    for (const nom of ['', faux, 'a/partie-01.zip', 'a\\partie-01.zip', 'partie-01.zip\r', 'x.zip']) {
      expect(code(() => manifesteGlobal([{ nom, empreinte: empreinteDe('x') }]))).toBe('chemin_invalide');
    }
    const planUne = decouper([f('a', 1)], 10);
    const deux = [faite('partie-01.zip'), faite('partie-02.zip')];
    expect(verifierParties(planUne, deux, manifesteGlobal(deux))).toEqual({
      ok: false,
      manquantes: [],
      modifiees: [],
      enTrop: ['partie-02.zip'],
    });
    expect(code(() => manifesteGlobal([{ nom: 'partie-01.zip', empreinte: 'zz' }]))).toBe('empreinte_invalide');
    expect(code(() => manifesteGlobal([faite('partie-01.zip'), faite('partie-01.zip')]))).toBe('doublon');
  });

  it('tailles-invalides-refusees', () => {
    for (const mauvaise of [Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5]) {
      expect(code(() => decouper([f('a', mauvaise)], 10))).toBe('taille_invalide');
      expect(code(() => decouper([f('a', 1)], mauvaise))).toBe('taille_invalide');
    }
    expect(code(() => decouper([f('a', 1)], 0))).toBe('taille_invalide');
    const grand = Number.MAX_SAFE_INTEGER;
    expect(code(() => decouper([f('a', grand), f('b', grand)], grand))).toBe('taille_invalide');
    expect(code(() => decouper([f('a', 1), f('a', 1)], 10))).toBe('chemin_en_double');
    expect(code(() => decouper([f('', 1)], 10))).toBe('chemin_invalide');
  });
});
