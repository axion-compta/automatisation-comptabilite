import { describe, expect, it } from 'vitest';
import { analyserSortie, avecUnNouvelEssai } from '../sortie-modele.js';

const permis = ['exercices.lister', 'plan.lister', 'vue.ouvrir'];
const appel = { outil: 'plan.lister', arguments: { exercice_id: 'ex_a1' } };
const json = JSON.stringify(appel);
const rejet = (code: string) => ({ sorte: 'rejet', code });
const file = (...r: string[]) => {
  let n = 0;
  return { appeler: async () => r[Math.min(n++, r.length - 1)] as string, appels: () => n };
};

describe('sortie du modèle', () => {
  it('outil-valide', () => {
    expect(analyserSortie(json, permis)).toEqual({ sorte: 'outil', outil: 'plan.lister', arguments: appel.arguments });
    expect(analyserSortie(`  ${json}\n`, permis).sorte).toBe('outil');
  });

  it('json-entre-balises', () => {
    const fence = '`'.repeat(3);
    for (const t of [`${fence}json\n${json}\n${fence}`, `${fence}\n${json}\n${fence}`, `Voici :\n${fence}json\n${json}\n${fence}`]) {
      expect(analyserSortie(t, permis)).toEqual({ sorte: 'outil', outil: 'plan.lister', arguments: appel.arguments });
    }
  });

  it('texte-simple', () => {
    expect(analyserSortie('Bonjour, voici votre réponse.', permis)).toEqual({ sorte: 'texte', texte: 'Bonjour, voici votre réponse.' });
    expect(analyserSortie('Un ensemble {a} cité', permis).sorte).toBe('texte');
  });

  it('json-casse-hors-schema', () => {
    for (const t of ['{"outil": "plan.lister"', '{"outil": 3, "arguments": {}}', '{"outil": "plan.lister"}', `{"outil":"vue.ouvrir","arguments":{},"x":1}`]) {
      expect(analyserSortie(t, permis)).toEqual(rejet('hors_schema'));
    }
  });

  it('outil-hors-liste', () => {
    expect(analyserSortie('{"outil":"appliquer","arguments":{}}', permis)).toEqual(rejet('outil_hors_liste'));
    expect(analyserSortie(json, ['exercices.lister'])).toEqual(rejet('outil_hors_liste'));
    expect(analyserSortie(json, [])).toEqual(rejet('outil_hors_liste'));
    expect(analyserSortie('{"outil":"constructor","arguments":{}}', ['constructor'])).toEqual(rejet('outil_hors_liste'));
  });

  it('arguments-invalides', () => {
    expect(analyserSortie('{"outil":"plan.lister","arguments":{}}', permis)).toEqual(rejet('parametre_invalide'));
    expect(analyserSortie('{"outil":"plan.lister","arguments":{"exercice_id":"a","en_plus":1}}', permis)).toEqual(rejet('parametre_invalide'));
    expect(analyserSortie('{"outil":"plan.lister","arguments":null}', permis)).toEqual(rejet('parametre_invalide'));
  });

  it('un-seul-nouvel-essai', async () => {
    const f = file('{casse', '{encore casse');
    expect(await avecUnNouvelEssai(f.appeler, permis)).toEqual({ sorte: 'sans_modele' });
    expect(f.appels()).toBe(2);
    const g = file('', '[]', json);
    expect(await avecUnNouvelEssai(g.appeler, permis)).toEqual({ sorte: 'sans_modele' });
    expect(g.appels()).toBe(2);
  });

  it('succes-au-second-essai', async () => {
    const f = file('{casse', json);
    expect(await avecUnNouvelEssai(f.appeler, permis)).toEqual({ sorte: 'outil', outil: 'plan.lister', arguments: appel.arguments });
    expect(f.appels()).toBe(2);
    const g = file(json);
    expect((await avecUnNouvelEssai(g.appeler, permis)).sorte).toBe('outil');
    expect(g.appels()).toBe(1);
    for (const r of ['Bonjour', '{"outil":"appliquer","arguments":{}}', '{"outil":"plan.lister","arguments":{}}']) {
      const h = file(r);
      await avecUnNouvelEssai(h.appeler, permis);
      expect(h.appels()).toBe(1);
    }
  });

  it('entrees-bizarres', () => {
    const geant = JSON.stringify({ outil: 'plan.lister', arguments: { exercice_id: 'x'.repeat(1_000_000) } });
    expect(analyserSortie(geant, permis).sorte).toBe('outil');
    expect(analyserSortie(JSON.stringify({ x: 'y'.repeat(1_000_000) }), permis)).toEqual(rejet('hors_schema'));
    for (const t of ['', '   ', 'null', '[]', `[${json}]`, '42', '"texte"', `${json}${json}`, `${json}\n${json}`]) {
      expect(analyserSortie(t, permis)).toEqual(rejet('hors_schema'));
    }
  });
});
