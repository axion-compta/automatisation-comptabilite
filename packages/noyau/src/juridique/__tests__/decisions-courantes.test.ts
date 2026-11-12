import { describe, expect, it } from 'vitest';
import {
  apresActeDepose,
  deposerActe,
  ErreurDecisionCourante,
  preparerDecision,
  type DonneesDecision,
  type ModeleDecision,
} from '../decisions-courantes.js';
import { controlerRemuneration } from '../remuneration.js';

// Données INVENTÉES pour les tests.
const DONNEES: DonneesDecision = {
  id: 'dec-1',
  debut: '2026-01-01',
  fin: '2026-12-31',
  montantMaxCentimes: 300_000,
  forme: 'assemblee',
};

function modele(parties: Partial<ModeleDecision> = {}): ModeleDecision {
  return { type: 'remuneration_dirigeant', version: 'v1', dateModele: '2026-06-01', approuve: true, ...parties };
}

function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurDecisionCourante ? e.code : 'autre';
  }
  return undefined;
}

describe('decisions courantes', () => {
  it('modele-sans-piece-jamais-signe', () => {
    for (const type of ['remuneration_dirigeant', 'mandat', 'convention_compte_courant'] as const) {
      const d = preparerDecision(type, modele({ type }), DONNEES);
      expect(d.statut).toBe('brouillon');
      expect(d.mention).toBe('prepare_par_ia_a_faire_valider');
      expect(d.versionModele).toBe('v1');
      expect(d.dateModele).toBe('2026-06-01');
      expect(d.pieceId).toBeUndefined();
      expect(code(() => deposerActe(d, { pieceId: '' }))).toBe('piece_absente');
      expect(code(() => deposerActe(d, {} as { pieceId: string }))).toBe('piece_absente');
      expect(JSON.stringify(d)).not.toContain('signe');
    }
  });

  it('modele-non-approuve-refuse', () => {
    const invalide = (parties: Partial<DonneesDecision>) =>
      code(() => preparerDecision('mandat', modele({ type: 'mandat' }), { ...DONNEES, ...parties }));
    expect(invalide({ debut: '2026-12-31', fin: '2026-01-01' })).toBe('donnees_invalides');
    expect(invalide({ id: ' ' })).toBe('donnees_invalides');
    for (const montantMaxCentimes of [Number.NaN, Infinity, -1, 1.5]) {
      expect(invalide({ montantMaxCentimes })).toBe('donnees_invalides');
    }
    expect(invalide({ montantMaxCentimes: null })).toBeUndefined();
    expect(invalide({ montantMaxCentimes: 0 })).toBeUndefined();
    expect(invalide({ debut: 'abc', fin: 'abd' })).toBe('donnees_invalides');
    expect(invalide({ fin: '2026-02-31' })).toBe('donnees_invalides');
    expect(invalide({ debut: '2026-1-01' })).toBe('donnees_invalides');
    expect(code(() => preparerDecision('mandat', modele({ type: 'mandat', approuve: false }), DONNEES))).toBe(
      'modele_a_faire_valider',
    );
    expect(code(() => preparerDecision('mandat', { type: 'mandat', dateModele: '2026-06-01', approuve: true }, DONNEES))).toBe(
      'modele_a_faire_valider',
    );
    expect(code(() => preparerDecision('mandat', modele({ type: 'mandat', dateModele: ' ' }), DONNEES))).toBe(
      'modele_a_faire_valider',
    );
    expect(code(() => preparerDecision('mandat', modele({ type: 'remuneration_dirigeant' }), DONNEES))).toBe(
      'modele_a_faire_valider',
    );
  });

  it('depot-avec-piece-passe-deposee', () => {
    const brouillon = preparerDecision('mandat', modele({ type: 'mandat' }), DONNEES);
    const deposee = deposerActe(brouillon, { pieceId: 'piece-1' });
    expect(deposee.statut).toBe('deposee');
    expect(deposee.pieceId).toBe('piece-1');
    expect(brouillon.statut).toBe('brouillon');
    expect(code(() => deposerActe(deposee, { pieceId: 'piece-2' }))).toBe('deja_deposee');
  });

  it('apres-acte-remuneration-carte-levee', () => {
    const ecriture = { date: '2026-03-15', montantCentimes: 250_000 };
    expect(controlerRemuneration(ecriture, [], ['assemblee'])).toEqual({
      etat: 'brouillon',
      carte: 'decision_absente',
    });
    const brouillon = preparerDecision('remuneration_dirigeant', modele(), DONNEES);
    expect(code(() => apresActeDepose(brouillon))).toBe('acte_non_depose');
    const suite = apresActeDepose(deposerActe(brouillon, { pieceId: 'piece-1' }));
    if (suite.suite !== 'carte_remuneration_levee') throw new Error('suite inattendue');
    expect(suite.decisionOrgane.statut).toBe('deposee');
    expect(controlerRemuneration(ecriture, [suite.decisionOrgane], ['assemblee'])).toEqual({
      etat: 'proposable',
      decisionId: 'dec-1',
    });
  });

  it('apres-acte-convention-prete', () => {
    const type = 'convention_compte_courant';
    const deposee = deposerActe(preparerDecision(type, modele({ type }), DONNEES), { pieceId: 'piece-9' });
    expect(apresActeDepose(deposee)).toEqual({
      suite: 'convention_prete_archivage',
      decisionId: 'dec-1',
      pieceId: 'piece-9',
    });
    const mandat = deposerActe(preparerDecision('mandat', modele({ type: 'mandat' }), DONNEES), {
      pieceId: 'piece-3',
    });
    expect(apresActeDepose(mandat)).toEqual({ suite: 'date_fin_a_suivre', decisionId: 'dec-1', dateFin: '2026-12-31' });
  });
});
