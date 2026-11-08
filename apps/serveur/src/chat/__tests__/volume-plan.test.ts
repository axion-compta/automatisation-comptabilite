import { describe, expect, it } from 'vitest';
import { deciderVolume, repondreSelonVolume, type LectureVolume, type PortVolume } from '../volume-plan.js';

const faux = (l: LectureVolume | Error): PortVolume => ({ lire: () => (l instanceof Error ? Promise.reject(l) : Promise.resolve(l)) });
const lecture = (utilise: number, inclus: number, seuilPdb: number): LectureVolume => ({ utilise, inclus, seuilPdb });

const fauxModele = () => { let n = 0; return { modele: { repondre: async () => { n++; return 'ok'; } }, appels: () => n }; };

describe('volume de chat du plan', () => {
  it('sous-le-seuil', async () => {
    expect(await deciderVolume(faux(lecture(7, 10, 8000)))).toBe('normal');
    expect(await deciderVolume(faux(lecture(0, 10, 8000)))).toBe('normal');
  });
  it('au-seuil-avertissement', async () => {
    expect(await deciderVolume(faux(lecture(8, 10, 8000)))).toBe('avertissement');
    expect(await deciderVolume(faux(lecture(9, 10, 8000)))).toBe('avertissement');
  });
  it('a-cent-pour-cent-sans-modele', async () => {
    expect(await deciderVolume(faux(lecture(10, 10, 8000)))).toBe('sans_modele');
    expect(await deciderVolume(faux(lecture(25, 10, 8000)))).toBe('sans_modele');
    for (const l of [lecture(10, 10, 8000), lecture(25, 10, 8000)]) {
      const { modele, appels } = fauxModele();
      expect(await repondreSelonVolume(faux(l), modele, 'bonjour')).toEqual({ decision: 'sans_modele', reponse: null });
      expect(appels()).toBe(0);
    }
    const { modele, appels } = fauxModele();
    expect((await repondreSelonVolume(faux(lecture(7, 10, 8000)), modele, 'bonjour')).reponse).toBe('ok');
    expect(appels()).toBe(1);
  });
  it('volume-illisible-sans-modele', async () => {
    expect(await deciderVolume(faux(new Error('console absente')))).toBe('sans_modele');
    const illisible = fauxModele();
    expect((await repondreSelonVolume(faux(new Error('console absente')), illisible.modele, 'bonjour')).reponse).toBeNull();
    expect(illisible.appels()).toBe(0);
    const mauvaises = [
      lecture(NaN, 10, 8000), lecture(1, NaN, 8000), lecture(Infinity, 10, 8000), lecture(1, Infinity, 8000),
      lecture(-1, 10, 8000), lecture(1.5, 10, 8000), lecture(1, 0, 8000), lecture(1, 10, NaN), lecture(1, 10, -1),
      lecture(1, 10, 0.5), lecture(1, 10, 10001),
    ];
    for (const m of mauvaises) expect(await deciderVolume(faux(m))).toBe('sans_modele');
    expect(await deciderVolume(faux(undefined as unknown as LectureVolume))).toBe('sans_modele');
  });
});
