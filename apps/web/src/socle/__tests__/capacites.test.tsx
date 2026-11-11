// @vitest-environment jsdom
// Fiche L06-T33 : useCapacites lit /moi/capacites une seule fois et refuse par défaut.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demarrerNoeud } from '../../../../../packages/faux-serveur/src/noeud.js';
import { securite } from '../../../../../packages/textes/src/ecrans/securite.js';
import { FournisseurDonnees } from '../../donnees/lecture.js';
import { useCapacites, type EtatCapacites } from '../capacites.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const URL_COMPLETE = '/api/compta/v1/societes/soc-a/moi/capacites';
let serveur: { fermer: () => void };
let racine: Root | null = null;
beforeEach(() => void (serveur = demarrerNoeud()));
afterEach(() => (serveur.fermer(), act(() => racine?.unmount()), (racine = null), (document.body.innerHTML = ''), vi.unstubAllGlobals()));

type Options = { role?: string; panne?: boolean; attente?: number; composants?: number };
/** Le faux fetch redirige /moi/capacites vers le faux serveur avec le rôle du scénario et compte les appels. */
async function monter(o: Options = {}): Promise<{ sorties: EtatCapacites[][]; appels: number }> {
  const vrai = globalThis.fetch;
  const compte = { appels: 0 };
  vi.stubGlobal('fetch', async (u: string, init: RequestInit = {}) => {
    if (!String(u).includes('/moi/capacites')) return vrai(u, init);
    compte.appels += 1;
    if (o.panne) return new Response('{}', { status: 500 });
    const url = new URL(URL_COMPLETE, location.origin).toString();
    return vrai(url, { ...init, headers: o.role ? { 'x-scenario-role': o.role } : {} });
  });
  const n = o.composants ?? 1;
  const sorties: EtatCapacites[][] = Array.from({ length: n }, () => []);
  const Sonde = ({ i }: { i: number }) => (sorties[i]?.push(useCapacites()), null);
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () =>
    racine?.render(
      <FournisseurDonnees>
        {sorties.map((_, i) => (
          <Sonde key={i} i={i} />
        ))}
      </FournisseurDonnees>,
    ),
  );
  await act(async () => void (await new Promise((r) => setTimeout(r, o.attente ?? 300))));
  return { sorties, get appels() { return compte.appels; } };
}
const dernier = (s: EtatCapacites[]): EtatCapacites => s[s.length - 1] as EtatCapacites;

describe('useCapacites', () => {
  it('lecture-refus-avec-phrase-du-serveur', async () => {
    const { sorties } = await monter({ role: 'lec-a' });
    const d = dernier(sorties[0] as EtatCapacites[]);
    expect(d.etat).toBe('pret');
    expect(d.capacite('saisir')).toEqual({ permis: false, raison_texte: securite.raisons.role_lecture });
    expect(d.capacite('lire')).toEqual({ permis: true });
  });

  it('administrateur-permis', async () => {
    const { sorties } = await monter({ role: 'adms-a' });
    const d = dernier(sorties[0] as EtatCapacites[]);
    expect(d.etat).toBe('pret');
    for (const a of ['lire', 'saisir', 'parametrer']) expect(d.capacite(a)).toEqual({ permis: true });
  });

  it('chargement-refuse-par-defaut', async () => {
    const { sorties } = await monter({ role: 'adms-a' });
    const premier = (sorties[0] as EtatCapacites[])[0] as EtatCapacites;
    expect(premier.etat).toBe('chargement');
    expect(premier.capacite('lire')).toEqual({ permis: false, raison_texte: securite.capaciteInconnue });
  });

  it('erreur-serveur-refuse', async () => {
    const { sorties } = await monter({ panne: true, attente: 600 });
    const d = dernier(sorties[0] as EtatCapacites[]);
    expect(d.etat).toBe('erreur');
    expect(d.capacite('lire')).toEqual({ permis: false, raison_texte: securite.capaciteInconnue });
  });

  it('action-inconnue-refusee', async () => {
    const { sorties } = await monter({ role: 'adms-a' });
    const d = dernier(sorties[0] as EtatCapacites[]);
    for (const a of ['', 'action_qui_n_existe_pas', 'x'.repeat(5000), '<script>&"\'']) {
      expect(d.capacite(a)).toEqual({ permis: false, raison_texte: securite.capaciteInconnue });
    }
  });

  it('un-seul-appel-pour-deux-composants', async () => {
    const m = await monter({ role: 'adms-a', composants: 2 });
    expect(m.appels).toBe(1);
    for (const s of m.sorties) expect(dernier(s).etat).toBe('pret');
  });
});
