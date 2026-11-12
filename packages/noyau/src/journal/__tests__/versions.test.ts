import { describe, expect, it } from 'vitest';
import { ajouterEntree, ajouterLot, teteInitiale, type Brouillon, type EntreeJournal } from '../chaine.js';
import { comparerVersions, ErreurVersions, versionsObjet } from '../versions.js';

// Journal FICTIF : acteurs en @exemple.fr, objets inventés.
const T0 = '2026-01-05T08:00:00.000Z';
const params = { societeId: 'A', creeLe: T0 };
const b = (evenement: string, acteur: string, h: string, apres: unknown, avant?: unknown, societeId = 'A'): Brouillon => ({
  societeId,
  horodatage: `2026-02-0${h}T09:00:00.000Z`,
  acteur,
  canal: 'clic',
  evenement,
  apres,
  ...(avant === undefined ? {} : { avant }),
});
const journalA: EntreeJournal[] = ajouterLot(teteInitiale('A', T0), [
  b('ecriture.creee', 'marie@exemple.fr', '1', { id: 'e1', libelle: 'Achat', montant: 1000 }),
  b('piece.deposee', 'paul@exemple.fr', '2', { id: 'p1', nom: 'facture' }),
  b('ecriture.modifiee', 'paul@exemple.fr', '3', { id: 'e1', libelle: 'Achat papier', montant: 1000, note: 'ok' }, { id: 'e1', libelle: 'Achat', montant: 1000 }),
  b('ecriture.creee', 'marie@exemple.fr', '4', { id: 'e2', libelle: 'Autre', montant: 5 }),
  b('ecriture.modifiee', 'lea@exemple.fr', '5', { id: 'e1', libelle: 'Achat papier', montant: 1200 }, { id: 'e1', libelle: 'Achat papier', montant: 1000, note: 'ok' }),
]).entrees;
const code = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurVersions ? e.code : 'autre';
  }
  return undefined;
};

describe('versions reconstruites depuis le journal', () => {
  it('toute-version-anterieure-consultable', () => {
    const v = versionsObjet(journalA, { typeObjet: 'ecriture', objetId: 'e1' }, params);
    expect(v.map((x) => x.numero)).toEqual([1, 2, 3]);
    expect(v.map((x) => x.sequence)).toEqual([1, 3, 5]);
    expect(v[0]?.etat).toEqual({ id: 'e1', libelle: 'Achat', montant: 1000 });
    expect(v[2]?.etat).toEqual({ id: 'e1', libelle: 'Achat papier', montant: 1200 });
    expect(versionsObjet(journalA, { typeObjet: 'piece', objetId: 'p1' }, params)).toHaveLength(1);
    expect(versionsObjet(journalA, { typeObjet: 'ecriture', objetId: 'inconnu' }, params)).toEqual([]);
  });

  it('comparaison-champ-modifie', () => {
    const v = versionsObjet(journalA, { typeObjet: 'ecriture', objetId: 'e1' }, params);
    expect(comparerVersions(v[0]!, v[1]!)).toEqual({
      ajoutes: ['note'],
      retires: [],
      modifies: [{ champ: 'libelle', avant: 'Achat', apres: 'Achat papier' }],
    });
    expect(comparerVersions(v[1]!, v[2]!)).toEqual({
      ajoutes: [],
      retires: ['note'],
      modifies: [{ champ: 'montant', avant: 1000, apres: 1200 }],
    });
    expect(comparerVersions(v[2]!, v[2]!)).toEqual({ ajoutes: [], retires: [], modifies: [] });
  });

  it('auteur-de-chaque-version', () => {
    const v = versionsObjet(journalA, { typeObjet: 'ecriture', objetId: 'e1' }, params);
    expect(v.map((x) => x.auteur)).toEqual(['marie@exemple.fr', 'paul@exemple.fr', 'lea@exemple.fr']);
    expect(v[1]?.horodatage).toBe('2026-02-03T09:00:00.000Z');
  });

  it('autre-societe-invisible', () => {
    const autre = ajouterEntree(teteInitiale('B', T0), b('ecriture.creee', 'zoe@exemple.fr', '1', { id: 'e1', libelle: 'Secret B' }, undefined, 'B')).entree;
    expect(versionsObjet([autre], { typeObjet: 'ecriture', objetId: 'e1' }, { societeId: 'B', creeLe: T0 }).map((x) => x.auteur)).toEqual(['zoe@exemple.fr']);
    const vuesA = versionsObjet(journalA, { typeObjet: 'ecriture', objetId: 'e1' }, params);
    expect(JSON.stringify(vuesA)).not.toContain('Secret B');
    // Une entrée d'une autre société glissée dans le journal : refus, jamais d'historique.
    expect(code(() => versionsObjet([...journalA, autre], { typeObjet: 'ecriture', objetId: 'e1' }, params))).toBe('journal_non_verifie');
  });

  it('chaine-cassee-refusee', () => {
    const casse = structuredClone(journalA);
    casse[2] = { ...casse[2]!, acteur: 'intrus@exemple.fr' };
    expect(code(() => versionsObjet(casse, { typeObjet: 'ecriture', objetId: 'e1' }, params))).toBe('journal_non_verifie');
    const trou = journalA.filter((e) => e.sequence !== 2);
    expect(code(() => versionsObjet(trou, { typeObjet: 'ecriture', objetId: 'e1' }, params))).toBe('journal_non_verifie');
  });
});
