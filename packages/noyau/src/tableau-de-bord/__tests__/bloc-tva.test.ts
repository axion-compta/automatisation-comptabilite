import { describe, expect, it } from 'vitest';
import type { EntreeEcheance } from '../../alertes/calendrier.js';
import { centimes } from '../../argent/index.js';
import type { ParametreLu } from '../../controles/regles/commun.js';
import { blocTvaImpots, type EstimationLue, type SeuilsFranchise } from '../bloc-tva.js';

const PERIODE = { debut: '2026-01-01', fin: '2026-03-31' };
const EST: EstimationLue = { exerciceId: 'ex-1', etat: 'calculee', collecteeCentimes: 120000, deductibleCentimes: 45050 };
const echeance = (id: string, dateLimite: string, faite = false): EntreeEcheance => ({ id, societeId: 'soc-1', exerciceId: 'ex-1', type: 'tva', dateLimite, faite });
const FILTRE = { societeId: 'soc-1', exerciceId: 'ex-1', du: '2026-04-01', au: '2026-12-31', jour: '2026-04-01' };
const param = (cle: string, valeur: string | null, statut: ParametreLu['statut'] = 'valide'): ParametreLu => ({ cle, valeur, statut });
const seuils = (ventes: string, majore: string, statut: ParametreLu['statut'] = 'valide'): SeuilsFranchise => ({
  seuilVentes: param('sv', ventes, statut), majoreVentes: param('mv', majore), seuilServices: param('ss', ventes), majoreServices: param('ms', majore),
});
const base = (surcharge = {}) => ({
  periode: PERIODE, exerciceId: 'ex-1', piecesEnDoute: 0, estimer: () => EST,
  echeances: { entrees: [echeance('b', '2026-07-31'), echeance('a', '2026-05-04')], filtre: FILTRE }, ...surcharge,
});

describe('bloc TVA et impôts', () => {
  it('estimation-egale-ma-tva', () => {
    const appels: string[] = [];
    const r = blocTvaImpots(base({ estimer: (id: string) => { appels.push(id); return EST; } }));
    expect(appels).toEqual(['ex-1']);
    expect(r.etat).toBe('ok');
    expect(r.donnees).toMatchObject({ estimation: EST });
    const nc: EstimationLue = { exerciceId: 'ex-1', etat: 'non_calculee', motif: 'regime_non_traite' };
    expect(blocTvaImpots(base({ estimer: () => nc })).donnees).toMatchObject({ estimation: nc });
    expect(blocTvaImpots(base({ estimer: () => undefined })).etat).toBe('vide');
  });

  it('seuil-lu-dans-parametres-dates', () => {
    const dates: string[] = [];
    const avec = (ventes: string, majore: string, statut: ParametreLu['statut'] = 'valide', ca = 5000000) =>
      blocTvaImpots(base({ franchise: { caVentes: centimes(ca), caServices: centimes(0), alertePdb: 9000, seuilsAu: (d: string) => { dates.push(d); return seuils(ventes, majore, statut); } } })).donnees;
    expect(avec('10000000', '12000000')).toMatchObject({ franchise: 'sous' });
    expect(dates).toEqual(['2026-03-31']);
    expect(avec('4000000', '4500000')).toMatchObject({ franchise: 'depasse_majore' });
    expect(avec('5500000', '9000000')).toMatchObject({ franchise: 'alerte' });
    expect(avec('10000000', '12000000', 'a_verifier')).toMatchObject({ franchise: 'a_verifier' });
    expect(blocTvaImpots(base()).donnees).toMatchObject({ franchise: null });
  });

  it('echeance-la-plus-proche', () => {
    const e = (entrees: EntreeEcheance[]) => blocTvaImpots(base({ echeances: { entrees, filtre: FILTRE } })).donnees;
    expect(e([echeance('b', '2026-07-31'), echeance('a', '2026-05-04')])).toMatchObject({ prochaineEcheance: { id: 'a' } });
    expect(e([echeance('a', '2026-05-04', true), echeance('b', '2026-07-31')])).toMatchObject({ prochaineEcheance: { id: 'b' } });
    expect(e([echeance('z', '2026-03-01'), echeance('b', '2026-04-01')])).toMatchObject({ prochaineEcheance: { id: 'b' } });
    expect(e([])).toMatchObject({ prochaineEcheance: null });
  });

  it('piece-en-doute-aucun-montant', () => {
    let appele = false;
    const r = blocTvaImpots(base({ piecesEnDoute: 2, estimer: () => { appele = true; return EST; } }));
    expect(appele).toBe(false);
    expect(r.etat).toBe('impossible');
    expect(r.donnees).toEqual({ piecesEnDoute: 2 });
    expect(JSON.stringify(r)).not.toContain('120000');
    expect(() => blocTvaImpots(base({ piecesEnDoute: -1 }))).toThrow();
    expect(blocTvaImpots(base({ piecesEnDoute: 1 })).etat).toBe('impossible');
  });
});
