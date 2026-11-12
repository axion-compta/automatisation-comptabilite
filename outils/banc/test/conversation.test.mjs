import { describe, it, expect } from 'vitest';
import { rejouer, REPONSE_SANS_MODELE } from '../conversation.mjs';

// Modèle simulé : le coût d'un tour est lu dans le message (fictif), jamais calculé d'un tarif.
const modele = () => {
  const appels = [];
  return {
    appels,
    estimer: (m) => m.jetons,
    repondre: (m) => { appels.push(m.texte); return { texte: `Réponse à ${m.texte}`, jetons: m.reel ?? m.jetons }; },
  };
};
const tour = (texte, jetons, reel) => ({ texte, jetons, ...(reel === undefined ? {} : { reel }) });

describe('banc de conversation', () => {
  it('mediane-et-maximum-entiers', async () => {
    const r = await rejouer({ tours: [tour('Bonjour Alice', 10), tour('Suite', 21), tour('Fin', 4), tour('Encore', 7)], modele: modele(), plafonds: { tour: 100 } });
    expect(r.jetons).toEqual([10, 21, 4, 7]);
    expect(r.mediane).toBe(8); // (7 + 10) / 2 = 8,5 -> 8
    expect(r.maximum).toBe(21);
    expect(Number.isInteger(r.mediane) && Number.isInteger(r.maximum)).toBe(true);
    const impair = await rejouer({ tours: [tour('a', 9), tour('b', 1), tour('c', 5)], modele: modele(), plafonds: { tour: 100 } });
    expect(impair.mediane).toBe(5);
    expect(impair.maximum).toBe(9);
    const un = await rejouer({ tours: [tour('a', 0)], modele: modele(), plafonds: { tour: 100 } });
    expect([un.mediane, un.maximum]).toEqual([0, 0]);
  });

  it('plafond-absent-non-mesure', async () => {
    for (const plafonds of [undefined, {}, { tour: undefined, mediane: undefined }]) {
      const r = await rejouer({ tours: [tour('a', 5000000), tour('b', 3)], modele: modele(), plafonds });
      expect(r.verdict).toBe('non_mesure');
      expect(r.mediane).toBe(2500001);
      expect(r.maximum).toBe(5000000);
      expect(r.tours.every((t) => t.etat === 'mesure')).toBe(true);
    }
    const vide = await rejouer({ tours: [], modele: modele(), plafonds: { tour: 10 } });
    expect(vide.verdict).toBe('non_mesure');
    expect([vide.mediane, vide.maximum]).toEqual([null, null]);
  });

  it('tour-au-dessus-signale', async () => {
    // l'estimation passe (40 < 50) mais le tour réel dépasse : signalé, jamais masqué
    const r = await rejouer({ tours: [tour('a', 10), tour('b', 40, 51), tour('c', 49, 49)], modele: modele(), plafonds: { tour: 50 } });
    expect(r.tours.map((t) => t.etat)).toEqual(['dans_le_plafond', 'au_dessus', 'dans_le_plafond']);
    expect(r.verdict).toBe('depasse');
    const egal = await rejouer({ tours: [tour('a', 30, 50)], modele: modele(), plafonds: { tour: 50 } });
    expect(egal.tours[0].etat).toBe('dans_le_plafond');
    expect(egal.verdict).toBe('dans_le_plafond');
    const med = await rejouer({ tours: [tour('a', 10), tour('b', 12)], modele: modele(), plafonds: { mediane: 10 } });
    expect(med.mediane).toBe(11);
    expect(med.verdict).toBe('depasse');
    const medOk = await rejouer({ tours: [tour('a', 10), tour('b', 12)], modele: modele(), plafonds: { mediane: 11 } });
    expect(medOk.verdict).toBe('dans_le_plafond');
  });

  it('au-plafond-reponse-sans-modele', async () => {
    const m = modele();
    const r = await rejouer({ tours: [tour('avant', 49), tour('pile', 50), tour('apres', 80), tour('petit', 1)], modele: m, plafonds: { tour: 50 } });
    expect(m.appels).toEqual(['avant', 'petit']);
    expect(r.tours.map((t) => t.etat)).toEqual(['dans_le_plafond', 'sans_modele', 'sans_modele', 'dans_le_plafond']);
    expect(r.tours[1].reponse).toBe(REPONSE_SANS_MODELE);
    expect(r.tours[1].jetons).toBe(0);
    expect(r.jetons).toEqual([49, 0, 0, 1]);
    expect(r.verdict).toBe('depasse');
  });

  it('parametres-invalides-refuses', async () => {
    for (const tour_ of [0, -1, 1.5, Number.NaN, Infinity, '5'])
      await expect(rejouer({ tours: [tour('a', 1)], modele: modele(), plafonds: { tour: tour_ } })).rejects.toThrow('plafond_invalide');
    await expect(rejouer({ tours: [tour('a', 1)], modele: modele(), plafonds: { mediane: -3 } })).rejects.toThrow('plafond_invalide');
    for (const reel of [-1, 2.5, Number.NaN])
      await expect(rejouer({ tours: [tour('a', 1, reel)], modele: modele(), plafonds: {} })).rejects.toThrow('jetons_invalides');
    // Plafond au-delà de 2^53 : refusé.
    await expect(rejouer({ tours: [tour('a', 1)], modele: modele(), plafonds: { tour: 2 ** 53 } })).rejects.toThrow('plafond_invalide');
    // Estimation invalide : refus avant tout appel du modèle.
    for (const estimation of [Number.NaN, -1, 2.5, undefined]) {
      const m = { ...modele(), estimer: () => estimation };
      await expect(rejouer({ tours: [tour('a', 1)], modele: m, plafonds: { tour: 10 } })).rejects.toThrow('jetons_invalides');
      expect(m.appels).toEqual([]);
    }
  });
});
