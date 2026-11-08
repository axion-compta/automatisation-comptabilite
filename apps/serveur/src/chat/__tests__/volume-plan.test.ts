import { describe, expect, it } from 'vitest';
import { deciderVolume, type LectureVolume, type PortVolume } from '../volume-plan.js';

const faux = (l: LectureVolume | Error): PortVolume => ({ lire: () => (l instanceof Error ? Promise.reject(l) : Promise.resolve(l)) });
const lecture = (utilise: number, inclus: number, seuilPdb: number): LectureVolume => ({ utilise, inclus, seuilPdb });

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
    let appelsModele = 0;
    const decision = await deciderVolume(faux(lecture(10, 10, 8000)));
    if (decision !== 'sans_modele') appelsModele++;
    expect(appelsModele).toBe(0);
  });
  it('volume-illisible-sans-modele', async () => {
    expect(await deciderVolume(faux(new Error('console absente')))).toBe('sans_modele');
    const mauvaises = [
      lecture(NaN, 10, 8000), lecture(1, NaN, 8000), lecture(Infinity, 10, 8000), lecture(1, Infinity, 8000),
      lecture(-1, 10, 8000), lecture(1.5, 10, 8000), lecture(1, 0, 8000), lecture(1, 10, NaN), lecture(1, 10, -1),
      lecture(1, 10, 0.5), lecture(1, 10, 10001),
    ];
    for (const m of mauvaises) expect(await deciderVolume(faux(m))).toBe('sans_modele');
    expect(await deciderVolume(faux(undefined as unknown as LectureVolume))).toBe('sans_modele');
  });
});
