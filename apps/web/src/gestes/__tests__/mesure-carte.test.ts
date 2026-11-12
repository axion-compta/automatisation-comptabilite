import { describe, expect, it } from 'vitest';
import { DUREE_MAX_MS, demarrerMesure, type EvenementCarte } from '../mesure-carte.js';

function banc(actif = true) {
  const emis: EvenementCarte[] = [];
  let t = 1_000;
  const options = { mesureActive: () => actif, envoyer: async (e: EvenementCarte) => void emis.push(e) };
  return { emis, avancer: (ms: number) => (t += ms), horloge: () => t, options };
}

describe('mesure du temps humain par carte', () => {
  it('carte-resolue-emise-avec-duree', async () => {
    const b = banc();
    const m = demarrerMesure('e17', b.horloge, b.options);
    b.avancer(4_200);
    await m.resoudre();
    expect(b.emis).toEqual([{ type: 'carte_resolue', ecran_code: 'e17', duree_ms: 4_200 }]);
    await m.resoudre();
    expect(b.emis).toHaveLength(1);
  });

  it('aucun-contenu-dans-l-evenement', async () => {
    const b = banc();
    const m = demarrerMesure('e17', b.horloge, b.options);
    b.avancer(10);
    await m.resoudre();
    expect(Object.keys(b.emis[0]!).sort()).toEqual(['duree_ms', 'ecran_code', 'type']);
    expect(() => demarrerMesure('Facture 42 / alice@exemple.fr', b.horloge, b.options)).toThrow(RangeError);
    for (const c of ['e', 'e123456']) expect(() => demarrerMesure(c, b.horloge, b.options), c).toThrow(RangeError);
    expect(() => demarrerMesure('e12345', b.horloge, b.options)).not.toThrow();
  });

  it('mesure-desactivee-rien-emis', async () => {
    const b = banc(false);
    const m = demarrerMesure('e17', b.horloge, b.options);
    b.avancer(500);
    await m.resoudre();
    await demarrerMesure('e17', b.horloge, { envoyer: b.options.envoyer }).resoudre(); // défaut : désactivée
    expect(b.emis).toEqual([]);
  });

  it('duree-hors-bornes-non-emise', async () => {
    for (const delta of [-1, DUREE_MAX_MS + 1, NaN, Infinity]) {
      const b = banc();
      const m = demarrerMesure('e17', () => (b.horloge() === 1_000 ? 1_000 : 1_000 + delta), b.options);
      b.avancer(1);
      await m.resoudre();
      expect(b.emis, String(delta)).toEqual([]);
    }
    for (const delta of [0, DUREE_MAX_MS]) {
      const b = banc();
      const m = demarrerMesure('e17', b.horloge, b.options);
      b.avancer(delta);
      await m.resoudre();
      expect(b.emis.map((e) => e.duree_ms)).toEqual([delta]);
    }
  });
});
