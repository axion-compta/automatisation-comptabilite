import { describe, expect, it } from 'vitest';
import {
  effacementPrevuLe,
  enregistrerAccuse,
  enregistrerRemise,
  peutDemanderEffacement,
  rappelDu,
  relancesDues,
  verifierParametres,
} from '../fin-contrat.js';
import type { ParametresFinContrat } from '../fin-contrat.js';
import { ErreurAbonnement, ajouterJours } from '../types.js';
import type { FinContrat } from '../types.js';

const P: ParametresFinContrat = { joursAvantEffacement: 30, joursRappelAvantEffacement: 23, joursRelancesSansAccuse: [7, 14, 30] };
const MANIFESTE = 'a'.repeat(64);
const VIDE: FinContrat = {
  dateFin: null, remisLe: null, manifesteEmpreinte: null, accuseLe: null, accusePar: null,
  gelModule: { actif: false, motif: null, posePar: null, poseLe: null }, gelConsole: false,
};
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurAbonnement ? e.code : 'autre';
  }
  return undefined;
};
const remis = (h = '2030-02-20T09:00:00Z'): FinContrat => enregistrerRemise(VIDE, { manifesteEmpreinte: MANIFESTE, horodatage: h }).fin;
const accuse = (h = '2030-03-01T10:00:00Z'): FinContrat =>
  enregistrerAccuse(remis(), { empreinteRecue: MANIFESTE, auteur: 'Alice Test', horodatage: h }).fin;
const gel = (actif: boolean): FinContrat['gelModule'] => ({ actif, motif: 'litige fictif', posePar: 'Bob Test', poseLe: '2030-03-20' });

describe('fin de contrat', () => {
  it('accuse-premier-mars-efface-trente-et-un-pas-avant', () => {
    const r = enregistrerAccuse(remis(), { empreinteRecue: MANIFESTE, auteur: 'Alice Test', horodatage: '2030-03-01T10:00:00Z' });
    expect(r.evenements.map((e) => e.type)).toEqual(['fin_contrat.accuse', 'fin_contrat.effacement_planifie']);
    expect(effacementPrevuLe(r.fin, P)).toBe('2030-03-31');
    expect(peutDemanderEffacement(r.fin, '2030-03-30', P)).toEqual({ permis: false, raison: 'trop_tot' });
    expect(peutDemanderEffacement(r.fin, '2030-03-31', P)).toEqual({ permis: true, raison: null });
    expect(peutDemanderEffacement(r.fin, '2030-04-15', P).permis).toBe(true);
    expect(effacementPrevuLe(remis(), P)).toBeNull();
    expect(enregistrerRemise(VIDE, { manifesteEmpreinte: MANIFESTE, horodatage: '2030-02-20T09:00:00Z' }).evenement.type).toBe('fin_contrat.export_remis');
  });

  it('gel-pose-puis-leve-apres-echeance', () => {
    const gele = { ...accuse(), gelModule: gel(true) };
    expect(peutDemanderEffacement(gele, '2030-03-31', P)).toEqual({ permis: false, raison: 'gel_actif' });
    expect(peutDemanderEffacement(gele, '2030-04-09', P).raison).toBe('gel_actif');
    const leve = { ...gele, gelModule: gel(false) };
    expect(peutDemanderEffacement(leve, '2030-04-10', P)).toEqual({ permis: true, raison: null });
    expect(effacementPrevuLe(leve, P)).toBe('2030-03-31');
  });

  it('sans-accuse-jamais-d-effacement', () => {
    const fin = remis('2030-02-01T00:00:00Z');
    const jour = ajouterJours('2030-02-01', 60);
    expect(peutDemanderEffacement(fin, jour, P)).toEqual({ permis: false, raison: 'pas_d_accuse' });
    expect(relancesDues(fin, jour, P, [])).toEqual({ relances: [7, 14, 30], transmettreAAxion: true });
    expect(relancesDues(fin, '2030-02-10', P, [])).toEqual({ relances: [7], transmettreAAxion: false });
    expect(peutDemanderEffacement(VIDE, jour, P)).toEqual({ permis: false, raison: 'pas_de_remise' });
    expect(relancesDues(accuse(), jour, P, [])).toEqual({ relances: [], transmettreAAxion: false });
    expect(relancesDues(VIDE, jour, P, []).relances).toEqual([]);
  });

  it('gel-console-seul-bloque', () => {
    const fin = { ...accuse(), gelConsole: true };
    expect(peutDemanderEffacement(fin, '2030-05-01', P).raison).toBe('gel_actif');
    expect(rappelDu(fin, '2030-03-08', P)).toBe(false);
  });

  it('accuse-sans-remise-refuse', () => {
    expect(code(() => enregistrerAccuse(VIDE, { empreinteRecue: MANIFESTE, auteur: 'Alice Test', horodatage: '2030-03-01T10:00:00Z' }))).toBe('pas_de_remise');
  });

  it('accuse-double-refuse', () => {
    expect(code(() => enregistrerAccuse(accuse(), { empreinteRecue: MANIFESTE, auteur: 'Alice Test', horodatage: '2030-03-02T10:00:00Z' }))).toBe('deja_accuse');
  });

  it('empreinte-differente-refusee', () => {
    const h = '2030-03-01T10:00:00Z';
    expect(code(() => enregistrerAccuse(remis(), { empreinteRecue: 'b'.repeat(64), auteur: 'Alice Test', horodatage: h }))).toBe('empreinte_differente');
    expect(code(() => enregistrerAccuse(remis(), { empreinteRecue: 'zz', auteur: 'Alice Test', horodatage: h }))).toBe('empreinte_invalide');
    expect(code(() => enregistrerAccuse(remis(), { empreinteRecue: MANIFESTE, auteur: '', horodatage: h }))).toBe('auteur_manquant');
    expect(code(() => enregistrerAccuse(remis(), { empreinteRecue: MANIFESTE, auteur: 'Alice Test', horodatage: 'hier' }))).toBe('horodatage_invalide');
    expect(code(() => enregistrerRemise(VIDE, { manifesteEmpreinte: 'zz', horodatage: h }))).toBe('empreinte_invalide');
  });

  it('rappel-un-seul-jour', () => {
    const fin = accuse();
    expect(rappelDu(fin, '2030-03-08', P)).toBe(true);
    expect(rappelDu(fin, '2030-03-07', P)).toBe(false);
    expect(rappelDu(fin, '2030-03-09', P)).toBe(false);
    expect(rappelDu(remis(), '2030-03-08', P)).toBe(false);
    expect(rappelDu({ ...fin, gelModule: gel(true) }, '2030-03-08', P)).toBe(false);
  });

  it('relances-deja-envoyees-pas-renvoyees', () => {
    const fin = remis('2030-02-01T00:00:00Z');
    const inverse = { ...P, joursRelancesSansAccuse: [30, 14, 7, 14] };
    expect(relancesDues(fin, '2030-03-15', inverse, [7])).toEqual({ relances: [14, 30], transmettreAAxion: true });
    expect(relancesDues(fin, '2030-03-15', inverse, [7, 14, 30])).toEqual({ relances: [], transmettreAAxion: true });
    expect(relancesDues(fin, '2030-02-15', inverse, [7]).relances).toEqual([14]);
    expect(verifierParametres(inverse).joursRelancesSansAccuse).toEqual([7, 14, 30]);
  });

  it('parametres-invalides-refuses', () => {
    for (const mauvais of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      expect(code(() => verifierParametres({ ...P, joursAvantEffacement: mauvais }))).toBe('parametre_invalide');
      expect(code(() => verifierParametres({ ...P, joursRappelAvantEffacement: mauvais }))).toBe('parametre_invalide');
      expect(code(() => verifierParametres({ ...P, joursRelancesSansAccuse: [7, mauvais] }))).toBe('parametre_invalide');
    }
    expect(code(() => verifierParametres({ ...P, joursRappelAvantEffacement: 30 }))).toBe('parametre_invalide');
    expect(code(() => verifierParametres({ ...P, joursRappelAvantEffacement: 31 }))).toBe('parametre_invalide');
    expect(code(() => verifierParametres({ ...P, joursRelancesSansAccuse: [] }))).toBe('parametre_invalide');
    expect(code(() => effacementPrevuLe(accuse(), { ...P, joursAvantEffacement: 0 }))).toBe('parametre_invalide');
    expect(verifierParametres(P)).toEqual(P);
  });
});
