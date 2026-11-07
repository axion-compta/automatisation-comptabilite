import { describe, expect, it } from 'vitest';
import type { RegleConservation, ResultatConservation } from '../../conservation/regles.js';
import { deciderEffacement, evenementEffacement, type EntreeEffacement } from '../effacement.js';
import { ErreurRgpd } from '../types.js';

const AUJ = '2026-06-15';
const regle: RegleConservation = {
  pays: 'AA', categorie: 'pieces', dureeAnnees: 7, pointDepart: 'cloture_exercice', statut: 'valide', source: 'Règle inventée n°1',
};
const dateCons = (date: string, r: RegleConservation = regle): ResultatConservation => ({ etat: 'date', date, regle: r });
const entree = (o: Partial<EntreeEffacement> = {}): EntreeEffacement => ({
  objet: { source: 'pieces', id: 'p1' }, conservation: null, gelActif: false, finSauvegardes: null, ...o,
});
function code(action: () => unknown): string | undefined {
  try {
    action();
  } catch (e) {
    return e instanceof ErreurRgpd ? e.code : 'autre';
  }
  return undefined;
}

describe('effacement', () => {
  it('t-exp-8-facture-exercice-clos-refus-avec-date', () => {
    const d = deciderEffacement(entree({ conservation: dateCons('2032-12-31') }), AUJ);
    expect(d).toEqual({ issue: 'refus_conservation', jusquAu: '2032-12-31', source: 'Règle inventée n°1' });
  });
  it('hors-obligation-a-effacer', () => {
    expect(deciderEffacement(entree(), AUJ)).toEqual({ issue: 'a_effacer', sauvegardesJusquAu: null });
  });
  it('conservation-echue-a-effacer', () => {
    expect(deciderEffacement(entree({ conservation: dateCons('2026-06-14') }), AUJ).issue).toBe('a_effacer');
  });
  it('regle-non-verifiee-on-garde', () => {
    const c: ResultatConservation = { etat: 'a_confirmer', raison: 'non_verifie' };
    expect(deciderEffacement(entree({ conservation: c }), AUJ)).toEqual({
      issue: 'refus_conservation', jusquAu: null, source: null, aConfirmer: true,
    });
  });
  it('gel-avant-tout', () => {
    expect(deciderEffacement(entree({ gelActif: true }), AUJ)).toEqual({ issue: 'refus_gel' });
    expect(deciderEffacement(entree({ gelActif: true, conservation: dateCons('2020-01-01') }), AUJ)).toEqual({ issue: 'refus_gel' });
    const c: ResultatConservation = { etat: 'a_confirmer', raison: 'aucune_regle' };
    expect(deciderEffacement(entree({ gelActif: true, conservation: c }), AUJ)).toEqual({ issue: 'refus_gel' });
  });
  it('fin-des-sauvegardes-rendue', () => {
    expect(deciderEffacement(entree({ finSauvegardes: '2026-09-30' }), AUJ)).toEqual({ issue: 'a_effacer', sauvegardesJusquAu: '2026-09-30' });
    const e = entree({ conservation: dateCons('2025-01-01'), finSauvegardes: '2026-10-01' });
    expect(deciderEffacement(e, AUJ)).toEqual({ issue: 'a_effacer', sauvegardesJusquAu: '2026-10-01' });
    const ev = evenementEffacement(deciderEffacement(entree(), AUJ), 'd1', '2026-06-15T10:00:00Z');
    expect(ev).toEqual({ type: 'personne.marque_a_effacer', horodatage: '2026-06-15T10:00:00Z', demandeId: 'd1', donnees: { issue: 'a_effacer' } });
    const refus = evenementEffacement(deciderEffacement(entree({ conservation: dateCons('2032-12-31') }), AUJ), 'd2', '2026-06-15T10:00:00Z');
    expect(refus.type).toBe('personne.effacement_refuse');
    expect(refus.donnees).toEqual({ issue: 'refus_conservation' });
  });
  it('jour-meme-de-fin-encore-conserve', () => {
    expect(deciderEffacement(entree({ conservation: dateCons(AUJ) }), AUJ).issue).toBe('refus_conservation');
    expect(deciderEffacement(entree({ conservation: dateCons('2026-06-16') }), AUJ).issue).toBe('refus_conservation');
  });
  it('entrees-invalides-refusees', () => {
    for (const mal of ['', '2026-6-15', '2026-02-30', 'hier']) {
      expect(code(() => deciderEffacement(entree(), mal))).toBe('date_invalide');
    }
    expect(code(() => deciderEffacement(entree({ finSauvegardes: '2026-13-01' }), AUJ))).toBe('date_invalide');
    for (const source of ['', '   ']) {
      expect(code(() => deciderEffacement(entree({ conservation: dateCons('2030-01-01', { ...regle, source }) }), AUJ))).toBe('source_manquante');
    }
    expect(code(() => deciderEffacement(entree({ conservation: dateCons('2030-02-31') }), AUJ))).toBe('date_invalide');
    expect(code(() => evenementEffacement({ issue: 'refus_gel' }, 'd1', 'pas une date'))).toBe('horodatage_invalide');
  });
});
