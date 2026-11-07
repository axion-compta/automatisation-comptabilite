import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import {
  commercantCompatible,
  lignesCorrespondantes,
  type LigneBanqueSociete,
} from '../correspondance-banque.js';
import { ErreurFrais } from '../types.js';

const c = centimes;
const ligne = (id: string, date: string, montant: number, extra: Partial<LigneBanqueSociete> = {}): LigneBanqueSociete => ({
  id,
  date,
  montant: c(montant),
  sens: 'debit',
  libelle: 'CB Librairie Mistral',
  compte: 'cpt-1',
  ...extra,
});
const ticket = (date: string, montant = 4590, fournisseur?: string) => ({
  montantTtc: c(montant),
  date,
  ...(fournisseur === undefined ? {} : { fournisseur }),
});
const ids = (t: ReturnType<typeof ticket>, l: LigneBanqueSociete[], n: number) =>
  lignesCorrespondantes(t, l, n).map((x) => x.id);

describe('lignesCorrespondantes', () => {
  it('meme-montant-meme-jour', () => {
    expect(ids(ticket('2025-03-10'), [ligne('a', '2025-03-10', 4590)], 0)).toEqual(['a']);
  });

  it('un-centime-d-ecart-refuse', () => {
    expect(ids(ticket('2025-03-10'), [ligne('a', '2025-03-10', 4591), ligne('b', '2025-03-10', 4589)], 3)).toEqual([]);
  });

  it('borne-de-fenetre-incluse', () => {
    const l = [ligne('av', '2025-03-07', 4590), ligne('ap', '2025-03-13', 4590)];
    expect(ids(ticket('2025-03-10'), l, 3)).toEqual(['ap', 'av']);
  });

  it('hors-fenetre-refuse', () => {
    const l = [ligne('av', '2025-03-06', 4590), ligne('ap', '2025-03-14', 4590)];
    expect(ids(ticket('2025-03-10'), l, 3)).toEqual([]);
  });

  it('fenetre-a-cheval-sur-le-mois', () => {
    const l = [ligne('fin', '2025-10-31', 4590), ligne('debut', '2025-11-02', 4590)];
    expect(ids(ticket('2025-11-01'), l, 1)).toEqual(['debut', 'fin']);
    expect(ids(ticket('2025-11-01'), l, 0)).toEqual([]);
  });

  it('credit-ignore', () => {
    expect(ids(ticket('2025-03-10'), [ligne('a', '2025-03-10', 4590, { sens: 'credit' })], 3)).toEqual([]);
  });

  it('commercant-incompatible-ignore', () => {
    expect(ids(ticket('2025-03-10', 4590, 'Garage Dupin'), [ligne('a', '2025-03-10', 4590)], 3)).toEqual([]);
    expect(ids(ticket('2025-03-10', 4590, 'Librairie Mistral'), [ligne('a', '2025-03-10', 4590)], 3)).toEqual(['a']);
  });

  it('fournisseur-absent-compatible', () => {
    expect(commercantCompatible(undefined, 'N importe quoi')).toBe(true);
    expect(commercantCompatible('', 'N importe quoi')).toBe(true);
    expect(commercantCompatible('Café Élysée', 'CB CAFE ELYSEE PARIS')).toBe(true);
    expect(commercantCompatible('Le Bar', 'CB Le Bar')).toBe(false);
    expect(commercantCompatible('Chez Remi', 'CB REMI 75')).toBe(true);
    expect(ids(ticket('2025-03-10', 4590, ''), [ligne('a', '2025-03-10', 4590)], 0)).toEqual(['a']);
  });

  it('tri-par-ecart-de-jours', () => {
    const l = [
      ligne('z', '2025-03-10', 4590),
      ligne('b2', '2025-03-12', 4590),
      ligne('a2', '2025-03-08', 4590),
      ligne('c1', '2025-03-11', 4590),
    ];
    expect(ids(ticket('2025-03-10'), l, 5)).toEqual(['z', 'c1', 'a2', 'b2']);
  });

  it('montant-negatif-en-valeur-absolue', () => {
    expect(ids(ticket('2025-03-10'), [ligne('a', '2025-03-10', -4590)], 0)).toEqual(['a']);
  });

  it('entrees-invalides-refusees', () => {
    const l = [ligne('a', '2025-03-10', 4590)];
    const refus = (fn: () => unknown) => {
      try {
        fn();
      } catch (e) {
        expect(e).toBeInstanceOf(ErreurFrais);
        expect((e as ErreurFrais).code).toBe('entree_invalide');
        return;
      }
      throw new Error('aucun refus');
    };
    for (const n of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      refus(() => lignesCorrespondantes(ticket('2025-03-10'), l, n));
    }
    refus(() => lignesCorrespondantes(ticket('2025-02-30'), l, 1));
    refus(() => lignesCorrespondantes(ticket(''), l, 1));
    refus(() => lignesCorrespondantes({ montantTtc: 45.9 as never, date: '2025-03-10' }, l, 1));
    refus(() => lignesCorrespondantes(ticket('2025-03-10'), [ligne('x', '2025-13-01', 4590)], 1));
  });
});
