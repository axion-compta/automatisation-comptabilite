// @vitest-environment jsdom
// Fiche L01-T34 : useLecture et ses états.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { FournisseurDonnees, useLecture, type EtatLecture } from '../lecture.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Env = { total: number; elements: Array<{ id: string }> };
const schema = z.object({ total: z.number(), elements: z.array(z.object({ id: z.string() })) });
let racine: Root | null = null;
afterEach(() => {
  act(() => racine?.unmount());
  racine = null;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

function Sonde({ sortie }: { sortie: EtatLecture<Env>[] }) {
  sortie.push(useLecture<Env>('/ecritures', schema));
  return null;
}
async function monter(corps: Env): Promise<EtatLecture<Env>[]> {
  vi.stubGlobal('fetch', () => Promise.resolve(Response.json(corps)));
  const sortie: EtatLecture<Env>[] = [];
  const hote = document.createElement('div');
  document.body.append(hote);
  racine = createRoot(hote);
  await act(async () => {
    racine?.render(
      <FournisseurDonnees>
        <Sonde sortie={sortie} />
      </FournisseurDonnees>,
    );
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });
  return sortie;
}

describe('useLecture', () => {
  it('use-lecture-etats-successifs', async () => {
    const sortie = await monter({ total: 1, elements: [{ id: 'E1' }] });
    expect(sortie[0]?.etat).toBe('chargement');
    const dernier = sortie[sortie.length - 1];
    expect(dernier?.etat).toBe('pret');
    expect(dernier?.donnees?.elements).toEqual([{ id: 'E1' }]);
  });
  it('use-lecture-vide', async () => {
    const sortie = await monter({ total: 0, elements: [] });
    expect(sortie[sortie.length - 1]?.etat).toBe('vide');
  });
});
