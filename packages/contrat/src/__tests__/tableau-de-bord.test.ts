import { describe, expect, it } from 'vitest';
import { genererOpenapi } from '../index.js';
import { BLOCS, QueryTableau, ReponseBloc, ReponseTableauDeBord } from '../domaines/tableau-de-bord.js';
import { creerServiceTableauDeBord } from '../domaines/tableau-de-bord-service.js';

const s = creerServiceTableauDeBord();
const tableau = (profil?: 'pleine' | 'vide', exercice = 'EX2026') => {
  const r = s.lire(exercice, { profil });
  if (!r) throw new Error('exercice');
  return r;
};

describe('tableau de bord', () => {
  it('huit-blocs-dans-l-ordre', () => {
    const t = tableau();
    expect(t.blocs.map((b) => b.code)).toEqual([...BLOCS]);
    expect(ReponseTableauDeBord.safeParse({ body: t }).success).toBe(true);
    expect(t.chiffres.ca.devise).toBe('EUR');
    expect(Number.isInteger(t.chiffres.ca.centimes)).toBe(true);
    expect(t.blocs.find((b) => b.code === 'tresorerie')?.etat).toBe('ok');
    const b = s.lireBloc('EX2026', 'resultat');
    expect(ReponseBloc.safeParse({ body: b }).success).toBe(true);
  });

  it('vue-invalide-400', () => {
    for (const vue of ['semaine', '', 'MOIS', 1]) expect(QueryTableau.safeParse({ vue }).success).toBe(false);
    for (const vue of ['mois', 'exercice', 'depuis_debut']) expect(QueryTableau.safeParse({ vue }).success).toBe(true);
  });

  it('champ-inconnu-400', () => {
    expect(QueryTableau.safeParse({ vue: 'mois', pourcentage: '1' }).success).toBe(false);
    expect(QueryTableau.safeParse({ profil: 'autre' }).success).toBe(false);
  });

  it('exercice-inconnu-404', () => {
    expect(s.lire('EX1999')).toBeUndefined();
    expect(s.lireBloc('EX1999', 'resultat')).toBeUndefined();
    expect(s.lireBloc('EX1999', 'nimporte')).toBeUndefined();
  });

  it('bloc-inconnu-404', () => {
    expect(s.lireBloc('EX2026', 'inconnu')).toBe('bloc_inconnu');
    expect(s.lireBloc('EX2026', 'constructor')).toBe('bloc_inconnu');
  });

  it('profil-vide-tout-vide-anneau-pointille', () => {
    const t = tableau('vide');
    expect(t.blocs.map((b) => b.etat)).toEqual(Array(BLOCS.length).fill('vide'));
    expect(t.anneau.global).toBe('pointille');
    expect(t.anneau.arcs.every((a) => a.couleur === 'pointille')).toBe(true);
    expect(t.anneau.centre).toEqual({ mot: 'donnees_absentes' });
    expect(t.chiffres.ca.centimes).toBe(0);
  });

  it('aucun-pourcentage-dans-la-reponse', () => {
    for (const p of ['pleine', 'vide'] as const) expect(JSON.stringify(tableau(p)).toLowerCase()).not.toContain('pourcent');
    expect(JSON.stringify(tableau())).not.toContain('%');
  });

  it('openapi-contient-les-routes', () => {
    const paths = (genererOpenapi() as { paths: Record<string, Record<string, { parameters: { name: string }[] }>> }).paths;
    expect(paths['/exercices/{exercice}/tableau-de-bord']?.['get']?.parameters.map((p) => p.name)).toEqual(expect.arrayContaining(['vue', 'profil', 'exercice']));
    expect(paths['/exercices/{exercice}/tableau-de-bord/{bloc}']?.['get']).toBeDefined();
  });
});
