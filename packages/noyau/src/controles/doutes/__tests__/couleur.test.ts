import { describe, expect, it } from 'vitest';
import { centimes } from '../../../argent/index.js';
import { ErreurControle } from '../../regles/commun.js';
import { plafonnerCouleur, type EntreeCouleur } from '../couleur.js';

const SEUIL = centimes(50000);
const NOUVEAU = 3;
const base: EntreeCouleur = {
  couleurLue: 'VERT',
  ttc: centimes(10000),
  immobilisationPossible: false,
  manuscrite: false,
  rangChezFournisseur: 4,
  seuilTtc: SEUIL,
  piecesFournisseurNouveau: NOUVEAU,
};
const avec = (o: Partial<EntreeCouleur>): EntreeCouleur => ({ ...base, ...o });

describe('plafonnerCouleur (C1)', () => {
  it('CT-35', () => {
    const gros = plafonnerCouleur(avec({ ttc: centimes(52000) }));
    expect(gros).toEqual({ couleur: 'JAUNE', raisons: ['montant_eleve'] });
    const r3 = plafonnerCouleur(avec({ rangChezFournisseur: 3 }));
    expect(r3).toEqual({ couleur: 'JAUNE', raisons: ['fournisseur_nouveau'] });
    expect(plafonnerCouleur(avec({ rangChezFournisseur: 1 })).couleur).toBe('JAUNE');
    expect(plafonnerCouleur(avec({ rangChezFournisseur: 4 }))).toEqual({ couleur: 'VERT', raisons: [] });
  });

  it('seuil-exact-jaune', () => {
    expect(plafonnerCouleur(avec({ ttc: SEUIL })).couleur).toBe('JAUNE');
    expect(plafonnerCouleur(avec({ ttc: centimes(SEUIL + 1) })).couleur).toBe('JAUNE');
  });

  it('seuil-moins-un-vert', () => {
    expect(plafonnerCouleur(avec({ ttc: centimes(SEUIL - 1) }))).toEqual({ couleur: 'VERT', raisons: [] });
  });

  it('rouge-reste-rouge', () => {
    const r = plafonnerCouleur(avec({ couleurLue: 'ROUGE', manuscrite: true }));
    expect(r.couleur).toBe('ROUGE');
    expect(plafonnerCouleur(avec({ couleurLue: 'ROUGE' })).couleur).toBe('ROUGE');
  });

  it('jaune-reste-jaune', () => {
    expect(plafonnerCouleur(avec({ couleurLue: 'JAUNE' }))).toEqual({ couleur: 'JAUNE', raisons: [] });
  });

  it('manuscrite-jaune', () => {
    expect(plafonnerCouleur(avec({ manuscrite: true }))).toEqual({ couleur: 'JAUNE', raisons: ['manuscrite'] });
  });

  it('immobilisation-jaune', () => {
    expect(plafonnerCouleur(avec({ immobilisationPossible: true }))).toEqual({
      couleur: 'JAUNE',
      raisons: ['immobilisation_possible'],
    });
  });

  it('plusieurs-raisons-triees', () => {
    const r = plafonnerCouleur(
      avec({ ttc: SEUIL, immobilisationPossible: true, manuscrite: true, rangChezFournisseur: 1 }),
    );
    expect(r.raisons).toEqual(['fournisseur_nouveau', 'immobilisation_possible', 'manuscrite', 'montant_eleve']);
  });

  it('entrees-invalides', () => {
    const code = (o: Partial<EntreeCouleur>) => {
      try {
        plafonnerCouleur(avec(o));
      } catch (e) {
        expect(e).toBeInstanceOf(ErreurControle);
        return (e as ErreurControle).code;
      }
      return 'aucune';
    };
    expect(code({ rangChezFournisseur: 0 })).toBe('entree_invalide');
    expect(code({ rangChezFournisseur: 1.5 })).toBe('entree_invalide');
    expect(code({ rangChezFournisseur: NaN })).toBe('entree_invalide');
    expect(code({ ttc: NaN as never })).toBe('entree_invalide');
    expect(code({ ttc: 1.5 as never })).toBe('entree_invalide');
    expect(code({ ttc: Infinity as never })).toBe('entree_invalide');
    expect(code({ seuilTtc: centimes(-1) })).toBe('parametre_invalide');
    expect(code({ seuilTtc: NaN as never })).toBe('parametre_invalide');
    expect(code({ piecesFournisseurNouveau: -1 })).toBe('parametre_invalide');
    expect(code({ piecesFournisseurNouveau: 1.5 })).toBe('parametre_invalide');
    expect(code({ seuilTtc: centimes(0) })).toBe('aucune');
    expect(code({ piecesFournisseurNouveau: 0 })).toBe('aucune');
  });
});
