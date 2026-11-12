import { describe, expect, it } from 'vitest';
import { differences } from '../../../../../packages/noyau/src/principes/parite.js';
import { CANAUX } from '../../../../../packages/noyau/src/principes/brouillon.js';
import { creerDepotActionHistoriqueMemoire, ErreurHistorique, ligneDepuisAction, type EntreeAction } from '../depot-action-historique.js';

const action = (o: Partial<EntreeAction> = {}): EntreeAction => ({
  canal: 'clic', auteurId: 'p-alice', objet: { type: 'ecriture', id: 'e-1' },
  avant: { compte: '606100' }, apres: { compte: '606300' }, le: '2026-03-01T10:00:00.000Z', ...o,
});
const neuf = () => { let n = 0; return creerDepotActionHistoriqueMemoire({ nouvelId: () => `h-${String(++n)}` }); };

describe('depot-action-historique', () => {
  it('trois-canaux-meme-forme', () => {
    const [a, b, c] = (['clic', 'chat', 'voix'] as const).map((canal) => ligneDepuisAction(action({ canal })));
    expect(a?.canal).toBe('clic');
    expect(differences(a, b)).toEqual([]);
    expect(differences(a, c)).toEqual([]);
    expect(Object.keys(a ?? {}).sort()).toEqual(['apres', 'auteurId', 'avant', 'canal', 'le', 'objetId', 'objetType']);
    // la parité voit bien une vraie différence
    expect(differences(a, ligneDepuisAction(action({ apres: { compte: '999999' } })))).toEqual(['apres.compte']);
  });

  it('filtre-canal-exact', () => {
    const d = neuf();
    for (const canal of ['chat', 'voix', 'assistant', 'chat'] as const) d.ajouter('s1', ligneDepuisAction(action({ canal })));
    expect(d.lister({ societeId: 's1', canal: 'chat' }).map((l) => l.canal)).toEqual(['chat', 'chat']);
    expect(d.lister({ societeId: 's1', canal: 'voix' })).toHaveLength(1);
    expect(d.lister({ societeId: 's1' })).toHaveLength(4);
    expect(() => d.lister({ societeId: 's1', canal: 'Chat' as never })).toThrow(ErreurHistorique);
  });

  it('ajout-seul', () => {
    const d = neuf();
    d.ajouter('s1', ligneDepuisAction(action()));
    expect(() => d.modifier('s1', 'h-1', {})).toThrow(expect.objectContaining({ code: 'ajout_seul' }) as Error);
    expect(() => d.supprimer('s1', 'h-1')).toThrow(expect.objectContaining({ code: 'ajout_seul' }) as Error);
    const [l] = d.lister({ societeId: 's1' });
    expect(Object.isFrozen(l)).toBe(true);
    expect(d.lister({ societeId: 's1' })[0]?.apres).toEqual({ compte: '606300' });
    for (const canal of ['', 'Clic', 'mail'])
      expect(() => d.ajouter('s1', { ...ligneDepuisAction(action()), canal } as never)).toThrow(expect.objectContaining({ code: 'canal_inconnu' }) as Error);
    for (const c of CANAUX) d.ajouter('s1', ligneDepuisAction(action({ canal: c })));
    for (const mauvais of ['texte', null, [1], 3])
      expect(() => d.ajouter('s1', { ...ligneDepuisAction(action()), avant: mauvais } as never)).toThrow(expect.objectContaining({ code: 'forme_invalide' }) as Error);
    expect(() => d.ajouter('s1', { ...ligneDepuisAction(action()), apres: 'x' } as never)).toThrow(ErreurHistorique);
    expect(() => d.ajouter('', ligneDepuisAction(action()))).toThrow(expect.objectContaining({ code: 'forme_invalide' }) as Error);
    expect(() => d.ajouter('s1', ligneDepuisAction(action({ le: 'pas-une-date' })))).toThrow(expect.objectContaining({ code: 'forme_invalide' }) as Error);
    expect(d.lister({ societeId: 's1' })).toHaveLength(1 + CANAUX.length);
  });

  it('autre-societe-invisible', () => {
    const d = neuf();
    d.ajouter('s1', ligneDepuisAction(action()));
    expect(d.lister({ societeId: 's2' })).toEqual([]);
    expect(d.lister({ societeId: 's2', canal: 'clic' })).toEqual([]);
    expect(d.lister({ societeId: 's1' })).toHaveLength(1);
  });

  it('ordre-chronologique', () => {
    const d = neuf();
    const dates = ['2026-03-03T00:00:00.000Z', '2026-03-01T00:00:00.000Z', '2026-03-02T00:00:00.000Z', '2026-03-02T00:00:00.000Z'];
    dates.forEach((le, i) => { d.ajouter('s1', ligneDepuisAction(action({ le, objet: { type: 'ecriture', id: `e-${String(i)}` } }))); });
    expect(d.lister({ societeId: 's1' }).map((l) => l.objetId)).toEqual(['e-1', 'e-2', 'e-3', 'e-0']);
    const bornes = (depuis?: string, jusqua?: string) => d.lister({ societeId: 's1', ...(depuis ? { depuis } : {}), ...(jusqua ? { jusqua } : {}) }).map((l) => l.objetId);
    expect(bornes('2026-03-02T00:00:00.000Z')).toEqual(['e-2', 'e-3', 'e-0']);
    expect(bornes(undefined, '2026-03-02T00:00:00.000Z')).toEqual(['e-1', 'e-2', 'e-3']);
    expect(bornes('2026-03-02T00:00:00.001Z', '2026-03-02T23:59:59.000Z')).toEqual([]);
    expect(() => d.lister({ societeId: 's1', depuis: 'x' })).toThrow(ErreurHistorique);
  });
});
