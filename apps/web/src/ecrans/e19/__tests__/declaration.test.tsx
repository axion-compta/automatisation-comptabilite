// @vitest-environment jsdom
// Fiche L03-T45 : détail d'une déclaration préparée.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { demarrerNoeud } from '../../../../../../packages/faux-serveur/src/noeud.js';
import { e19 } from '../../../../../../packages/textes/src/ecrans/e19.js';
import { FournisseurDonnees, creerClient } from '../../../donnees/lecture.js';
import { VueDeclaration, type DeclarationVue } from '../Declaration.js';
import { Ecran } from '../Ecran.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let serveur: { fermer: () => void };
beforeAll(() => void (serveur = demarrerNoeud()));
afterAll(() => serveur.fermer());
let racine: Root | null = null;
afterEach(() => {
  act(() => racine?.unmount());
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});
const attendre = () => act(async () => void (await new Promise((r) => setTimeout(r, 250))));
async function monter(): Promise<void> {
  const client = creerClient();
  client.setDefaultOptions({ queries: { retry: false } });
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => racine?.render(<FournisseurDonnees client={client}><Ecran /></FournisseurDonnees>));
  await attendre();
}
const boutons = () => [...document.querySelectorAll('button')].filter((b) => b.textContent === e19.declaration.ouvrir);
async function ouvrir(i: number): Promise<void> {
  await act(async () => boutons()[i]?.click());
  await attendre();
}
const base: DeclarationVue = {
  id: 'DECX', periodeId: 'PERX', formulaire: 'FORM_A', millesime: 2026, mention: 'prepare_par_ia', versionPaquet: 1,
  statut: 'validee', validePar: null, valideLe: null, cases: [], controles: [],
};
function rendre(d: DeclarationVue): void {
  racine = createRoot(document.body.appendChild(document.createElement('div')));
  act(() => racine?.render(<VueDeclaration declaration={d} />));
}

describe('E19 déclaration', () => {
  it('ouvre-la-declaration', async () => {
    await monter();
    expect(boutons().length).toBe(1);
    await ouvrir(0);
    expect(document.querySelector('#e19-decl-titre')?.textContent).toBe(e19.declaration.titre);
    expect(document.querySelectorAll('[data-case]').length).toBeGreaterThan(0);
    expect(document.querySelector('tbody')).toBeNull();
  });
  it('mention-et-filigrane-a-valider', () => {
    rendre(base);
    expect(document.querySelector('[data-filigrane]')?.getAttribute('data-filigrane')).toBe('a_valider');
    expect(document.body.textContent).toContain('Préparé par IA, à valider');
    expect(document.body.textContent).toContain(e19.declaration.filigrane);
    expect(document.body.textContent).not.toContain('Validé par');
  });
  it('validee-affiche-le-validateur', async () => {
    rendre({ ...base, validePar: 'Camille Exemple', valideLe: '2026-01-15' });
    expect(document.querySelector('[data-filigrane]')?.getAttribute('data-filigrane')).toBe('aucun');
    expect(document.body.textContent).toContain('Validé par Camille Exemple le 15/01/2026');
    act(() => racine?.unmount());
    const reel = fetch;
    vi.stubGlobal('fetch', (u: string) => {
      const url = String(u);
      if (!url.includes('/tva/periodes')) return reel(u);
      const p = { id: 'PER2025T4', exerciceId: 'EX2026', debut: '2025-10-01', fin: '2025-12-31', statut: 'validee', formulaire: 'FORM_A' };
      return Promise.resolve(Response.json({ body: [p], decalage: 0, total: 1 }));
    });
    await monter();
    await ouvrir(0);
    expect(document.body.textContent).toMatch(/Validé par .+ le \d\d\/\d\d\/\d{4}/);
    expect(document.querySelector('[data-filigrane]')?.getAttribute('data-filigrane')).toBe('aucun');
  });
  it('provenance-liste-les-ecritures', () => {
    rendre({ ...base, cases: [
      { code: 'X01', montantCentimes: 1500, baseCentimes: null, sources: [{ ecritureId: 'ECR1', ligneIndex: 0 }, { ecritureId: 'ECR2', ligneIndex: 1 }] },
      { code: 'ZZZ', montantCentimes: 0, baseCentimes: null, sources: [] },
      { code: 'Y99', montantCentimes: 200, baseCentimes: null, sources: [] },
    ] });
    expect(document.querySelectorAll('[data-case]')).toHaveLength(2);
    const x01 = document.querySelector('[data-case=X01]')!;
    expect(x01.textContent).toContain(e19.declaration.libellesCases['X01']);
    expect(x01.querySelectorAll('.axion-provenance__source')).toHaveLength(2);
    expect(x01.textContent).toContain(e19.declaration.ecriture + ' ECR1');
    const total = x01.querySelector('span:nth-of-type(2)')?.textContent ?? '';
    expect(total).toMatch(/15/);
    expect(x01.textContent?.split(total).length).toBe(2);
    for (const s of x01.querySelectorAll('.axion-provenance__source')) expect(s.textContent).not.toContain(total);
    const y = document.querySelector('[data-case=Y99]')!;
    expect(y.querySelector('span')?.textContent).toBe('Y99');
    expect(y.textContent).toContain(e19.declaration.provenanceVide);
  });
  it('impossible-jamais-affiche-ok', () => {
    rendre({ ...base, controles: [{ regleId: 'R1', resultat: 'ok' }, { regleId: 'R2', resultat: 'ecart' }, { regleId: 'R3', resultat: 'IMPOSSIBLE' }, { regleId: 'R4', resultat: '' }] });
    const ligne = (id: string) => [...document.querySelectorAll('li')].find((l) => l.textContent?.startsWith(id))?.textContent ?? '';
    expect(ligne('R1')).toContain(e19.declaration.resultats.ok);
    expect(ligne('R2')).toContain(e19.declaration.resultats.ecart);
    for (const id of ['R3', 'R4']) {
      expect(ligne(id)).toContain(e19.declaration.resultats.inconnu);
      expect(ligne(id)).not.toContain(e19.declaration.resultats.ok);
    }
    act(() => racine?.unmount());
    rendre(base);
    expect(document.body.textContent).toContain(e19.declaration.neant);
    expect(document.body.textContent).toContain(e19.declaration.controlesVide);
  });
  it('retour-a-la-liste', async () => {
    await monter();
    await ouvrir(0);
    expect(document.querySelector('#e19-decl-titre')).not.toBeNull();
    const retour = [...document.querySelectorAll('button')].find((b) => b.textContent === e19.declaration.retour)!;
    await act(async () => retour.click());
    await attendre();
    expect(document.querySelector('#e19-decl-titre')).toBeNull();
    expect(document.querySelectorAll('tbody tr').length).toBeGreaterThan(0);
  });
});
