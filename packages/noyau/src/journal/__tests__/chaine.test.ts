import { describe, expect, it } from 'vitest';
import { CANAUX } from '../../securite/types.js';
import { empreinteChainee, empreinteInitiale, FORMAT_CANONIQUE } from '../canonique.js';
import { ajouterEntree, ajouterLot, ErreurJournal, teteInitiale, type Brouillon } from '../chaine.js';

const T0 = '2026-01-05T08:00:00.000Z';
const brouillon = (o: Partial<Brouillon> = {}): Brouillon => ({
  societeId: 'A',
  horodatage: T0,
  acteur: 'marie@exemple.fr',
  canal: 'clic',
  evenement: 'ecriture.creee',
  ...o,
});
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurJournal ? e.code : 'autre';
  }
  return undefined;
};

describe('journal : ajout d une entrée', () => {
  it('cinquante-ajouts-sequences-1-a-50', () => {
    let tete = teteInitiale('A', T0);
    const vues: number[] = [];
    for (let i = 0; i < 50; i += 1) {
      const r = ajouterEntree(tete, brouillon());
      vues.push(r.entree.sequence);
      tete = r.tete;
    }
    expect(vues).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
    expect(new Set(vues).size).toBe(50);
    expect(tete.sequence).toBe(50);
  });

  it('premiere-entree-part-de-l-initiale', () => {
    const t = teteInitiale('A', T0);
    expect(t).toEqual({ societeId: 'A', sequence: 0, empreinte: empreinteInitiale('A', T0) });
    const { entree } = ajouterEntree(t, brouillon());
    expect(entree.empreintePrecedente).toBe(empreinteInitiale('A', T0));
    expect(entree.formatCanonique).toBe(FORMAT_CANONIQUE);
  });

  it('empreinte-chainee-a-la-precedente', () => {
    const t0 = teteInitiale('A', T0);
    const r1 = ajouterEntree(t0, brouillon({ motif: 'saisie', avant: { a: 1 }, apres: { a: 2 } }));
    const r2 = ajouterEntree(r1.tete, brouillon());
    expect(r2.entree.empreintePrecedente).toBe(r1.entree.empreinte);
    expect(r2.tete).toEqual({ societeId: 'A', sequence: 2, empreinte: r2.entree.empreinte });
    const { empreinte, ...contenu } = r1.entree;
    expect(empreinte).toBe(empreinteChainee(t0.empreinte, contenu));
    const autre = ajouterEntree(t0, brouillon({ motif: 'autre' }));
    expect(autre.entree.empreinte).not.toBe(empreinte);
    expect(r1.entree).toMatchObject({ motif: 'saisie', avant: { a: 1 }, apres: { a: 2 } });
    expect('motif' in r2.entree).toBe(false);
  });

  it('autre-societe-refusee', () => {
    expect(code(() => ajouterEntree(teteInitiale('A', T0), brouillon({ societeId: 'B' })))).toBe('societe_differente');
    expect(code(() => ajouterEntree(teteInitiale('A', T0), brouillon({ societeId: '' })))).toBe('societe_differente');
  });

  it('canal-inconnu-refuse', () => {
    const t = teteInitiale('A', T0);
    for (const canal of ['', 'Clic', 'mail', undefined, 3]) {
      expect(code(() => ajouterEntree(t, brouillon({ canal } as never)))).toBe('canal_invalide');
    }
    for (const canal of CANAUX) expect(code(() => ajouterEntree(t, brouillon({ canal })))).toBeUndefined();
  });

  it('evenement-mal-forme-refuse', () => {
    const t = teteInitiale('A', T0);
    for (const evenement of ['', 'ecriture', 'Ecriture.creee', 'a.b.c', '.creee', 'ecriture.', 'a b.c', undefined, 7]) {
      expect(code(() => ajouterEntree(t, brouillon({ evenement } as never)))).toBe('evenement_invalide');
    }
    expect(code(() => ajouterEntree(t, brouillon({ evenement: 'audit.tete_signee' })))).toBeUndefined();
  });

  it('acteur-et-horodatage-valides', () => {
    const t = teteInitiale('A', T0);
    for (const acteur of ['', undefined, 5]) {
      expect(code(() => ajouterEntree(t, brouillon({ acteur } as never)))).toBe('acteur_absent');
    }
    for (const horodatage of ['', 'pas une date', undefined, NaN]) {
      expect(code(() => ajouterEntree(t, brouillon({ horodatage } as never)))).toBe('horodatage_invalide');
    }
    for (const sequence of [-1, 1.5, NaN, Infinity]) {
      expect(code(() => ajouterEntree({ ...t, sequence }, brouillon()))).toBe('tete_invalide');
    }
    expect(code(() => ajouterEntree(undefined as never, brouillon()))).toBe('tete_invalide');
  });

  it('secret-refuse-avec-chemin', () => {
    const t = teteInitiale('A', T0);
    const iban = ['FR76', '1234', '5678', '9012', '3456', '7890', '123'].join(' ');
    const essai = brouillon({ avant: { password: 'x' }, apres: { liste: [{ note: iban }] } });
    try {
      ajouterEntree(t, essai);
      expect.unreachable();
    } catch (e) {
      expect((e as ErreurJournal).code).toBe('secret_dans_le_journal');
      expect((e as ErreurJournal).chemins).toEqual(['avant.password', 'apres.liste[0].note']);
    }
    expect(code(() => ajouterEntree(t, brouillon({ motif: iban })))).toBe('secret_dans_le_journal');
    expect(code(() => ajouterEntree(t, brouillon({ acteur: iban })))).toBe('secret_dans_le_journal');
  });

  it('contenu-non-canonique-refuse', () => {
    const t = teteInitiale('A', T0);
    for (const avant of [{ m: 1.5 }, { m: NaN }, { m: Infinity }, { m: undefined }]) {
      expect(code(() => ajouterEntree(t, brouillon({ avant })))).toBe('contenu_invalide');
    }
  });

  it('lot-tout-ou-rien', () => {
    const t = teteInitiale('A', T0);
    const ok = ajouterLot(t, [brouillon(), brouillon(), brouillon()]);
    expect(ok.entrees.map((e) => e.sequence)).toEqual([1, 2, 3]);
    expect(ok.tete.sequence).toBe(3);
    expect(ok.entrees[2]?.empreintePrecedente).toBe(ok.entrees[1]?.empreinte);
    expect(ajouterLot(t, [])).toEqual({ entrees: [], tete: t });
    expect(code(() => ajouterLot(t, [brouillon(), brouillon({ canal: 'x' as never }), brouillon()]))).toBe('canal_invalide');
    expect(code(() => ajouterLot(t, 'x' as never))).toBe('lot_invalide');
    expect(t.sequence).toBe(0);
  });

  it('tete-d-entree-non-modifiee', () => {
    const t = teteInitiale('A', T0);
    const b = brouillon({ avant: { a: 1 }, apres: { a: 2 } });
    const copieT = structuredClone(t);
    const copieB = structuredClone(b);
    const r = ajouterEntree(t, b);
    expect(t).toEqual(copieT);
    expect(b).toEqual(copieB);
    expect(r.entree).not.toBe(b);
    expect(r.tete).not.toBe(t);
  });
});
