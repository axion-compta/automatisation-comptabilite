import { describe, expect, it } from 'vitest';
import { CANAUX, ErreurBrouillon, reponseModification, statutCreationAutorise, type Canal } from '../brouillon.js';

const ouvert = { statut: 'ouvert' } as const;
const cloture = { statut: 'cloture' } as const;

describe('statutCreationAutorise', () => {
  it('creation-validee-refusee-422', () => {
    expect(statutCreationAutorise('valide')).toStrictEqual({
      ok: false,
      statutHttp: 422,
      code: 'statut_initial_interdit',
    });
  });
  it('creation-brouillon-et-propose-acceptees', () => {
    expect(statutCreationAutorise('brouillon')).toStrictEqual({ ok: true });
    expect(statutCreationAutorise('propose')).toStrictEqual({ ok: true });
  });
  it('statut inconnu ou vide : erreur', () => {
    for (const s of ['archive', '', 'VALIDE']) {
      expect(() => statutCreationAutorise(s as 'valide')).toThrow(ErreurBrouillon);
    }
  });
});

describe('reponseModification', () => {
  it('validee-409-meme-reponse-sur-tous-les-canaux', () => {
    expect(CANAUX).toStrictEqual(['clic', 'chat', 'voix', 'import', 'assistant', 'expert', 'api']);
    const attendu = {
      ok: false,
      statutHttp: 409,
      code: 'ecriture_validee',
      proposition: 'contre_passation',
      route: '/ecritures/e1/corriger',
    };
    const reponses = CANAUX.map((c) => reponseModification({ id: 'e1', statut: 'valide' }, ouvert, c));
    expect(reponses).toHaveLength(7);
    for (const r of reponses) expect(r).toStrictEqual(attendu);
    for (const r of reponses) expect(r).toStrictEqual(reponses[0]);
  });
  it('cloture-423-prioritaire', () => {
    const attendu = {
      ok: false,
      statutHttp: 423,
      code: 'periode_cloturee',
      proposition: 'contre_passation_periode_ouverte',
    };
    for (const c of CANAUX) {
      expect(reponseModification({ id: 'e1', statut: 'valide' }, cloture, c)).toStrictEqual(attendu);
    }
  });
  it('brouillon-modifiable', () => {
    for (const statut of ['brouillon', 'propose'] as const) {
      for (const ex of [ouvert, cloture]) {
        expect(reponseModification({ id: 'e1', statut }, ex, 'clic')).toStrictEqual({ ok: true });
      }
    }
  });
  it('identifiant-encode-dans-la-route', () => {
    const r = reponseModification({ id: 'a/b', statut: 'valide' }, ouvert, 'api');
    expect(r).toMatchObject({ route: '/ecritures/a%2Fb/corriger' });
    const e = reponseModification({ id: 'é ?#', statut: 'valide' }, ouvert, 'api');
    expect(e).toMatchObject({ route: '/ecritures/%C3%A9%20%3F%23/corriger' });
  });
  it('entrees-invalides', () => {
    const ok = { id: 'e1', statut: 'valide' } as const;
    expect(() => reponseModification({ ...ok, id: '' }, ouvert, 'clic')).toThrow(ErreurBrouillon);
    expect(() => reponseModification({ ...ok, statut: 'archive' as 'valide' }, ouvert, 'clic')).toThrow(
      ErreurBrouillon,
    );
    expect(() => reponseModification(ok, ouvert, 'fax' as Canal)).toThrow(ErreurBrouillon);
    expect(() => reponseModification(ok, { statut: 'archive' as 'ouvert' }, 'clic')).toThrow(ErreurBrouillon);
    // L'entrée invalide est refusée même sur un brouillon ou un exercice clos.
    expect(() => reponseModification({ id: '', statut: 'brouillon' }, cloture, 'clic')).toThrow(ErreurBrouillon);
    expect(() => reponseModification({ id: 'e1', statut: 'brouillon' }, ouvert, '' as Canal)).toThrow(ErreurBrouillon);
  });
});
