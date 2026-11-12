// @vitest-environment jsdom
// Fiche L08-T51 : pages publiques « Informations ». Données fictives, aucun appel réseau.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { pagesPubliques as t } from '../../../../../../packages/textes/src/ecrans/pages-publiques.js';
import { Ecran, type EnvoyerDemandeDroit } from '../Ecran.js';
import { route } from '../route.js';
import { ENTETE_CSV, lignesSousTraitants } from '../sous-traitants.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const CSV = readFileSync(resolve(process.cwd(), 'docs/sous-traitants.csv'), 'utf8');
let racine: Root | null = null;

afterEach(() => {
  act(() => racine?.unmount());
  racine = null;
  document.body.innerHTML = '';
});

function monter(props: Parameters<typeof Ecran>[0] = {}): HTMLElement {
  const hote = document.createElement('div');
  document.body.append(hote);
  racine = createRoot(hote);
  act(() => racine?.render(<Ecran {...props} />));
  return hote;
}

function saisir(hote: HTMLElement, selecteur: string, valeur: string) {
  const el = hote.querySelector(selecteur) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  const proto = Object.getPrototypeOf(el) as object;
  act(() => {
    Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, valeur);
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}

async function soumettre(hote: HTMLElement) {
  await act(async () => {
    (hote.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}

function remplir(hote: HTMLElement, email: string, message: string) {
  saisir(hote, 'select', 'effacement');
  saisir(hote, 'input', email);
  saisir(hote, 'textarea', message);
}

const lignesAffichees = (hote: HTMLElement) => Array.from(hote.querySelectorAll('tbody tr')).map((tr) => tr.textContent ?? '');
const lignesCsv = CSV.split(/\r?\n/).slice(1).filter((l) => l.trim() !== '');

describe('pages publiques', () => {
  it('quatre-sections-ancres', () => {
    const hote = monter();
    const ids = Array.from(hote.querySelectorAll('section')).map((s) => s.id);
    expect(ids).toEqual(['confidentialite', 'mentions', 'sous-traitants', 'droits']);
    expect(route.chemin).toBe('/informations');
  });

  it('sous-traitants-depuis-le-csv', async () => {
    const hote = monter();
    const l = lignesAffichees(hote);
    expect(l).toHaveLength(lignesCsv.length);
    for (const ligne of lignesCsv) expect(l.some((x) => x.includes(ligne.split(',')[1] ?? '?'))).toBe(true);
    const refs = lignesSousTraitants(CSV, {}).map((x) => x.ref);
    expect(refs).toContain('HEB-1');
    expect(refs).toContain('IA-1');
    const garde = (await import(pathToFileURL(resolve(process.cwd(), 'outils/gardes/sous-traitants.mjs')).href)) as { ENTETE: string };
    expect(ENTETE_CSV).toBe(garde.ENTETE);
  });

  it('noms-injectes-seulement', () => {
    const hote = monter({ noms: { 'HEB-1': 'Hébergeur Fictif', 'ZZZ-9': 'Inconnu Fictif' } });
    expect(hote.textContent).toContain('Hébergeur Fictif');
    expect(hote.textContent).not.toContain('Inconnu Fictif');
    const res = lignesSousTraitants(CSV, { 'HEB-1': 'Hébergeur Fictif', 'ZZZ-9': 'Inconnu Fictif' });
    expect(res.filter((x) => x.nom !== undefined).map((x) => x.ref)).toEqual(['HEB-1']);
    expect(res.every((x) => x.etat === 'prevu')).toBe(true);
  });

  it('entete-invalide-refuse', () => {
    expect(() => lignesSousTraitants('ref,role\nHEB-1,x\n', {})).toThrow();
    expect(() => lignesSousTraitants('', {})).toThrow();
    expect(() => lignesSousTraitants(`${ENTETE_CSV}\nHEB-1,x\n`, {})).toThrow();
    expect(lignesSousTraitants(`${ENTETE_CSV}\n`, {})).toEqual([]);
  });

  it.each(['', 'sans-arobase', 'a@exemple', 'a b@exemple.fr'])('formulaire-email-invalide-sans-appel (%j)', async (email) => {
    const envoyer = vi.fn<EnvoyerDemandeDroit>();
    const hote = monter({ envoyer });
    remplir(hote, email, 'Bonjour');
    await soumettre(hote);
    expect(envoyer).not.toHaveBeenCalled();
    expect(hote.textContent).toContain(t.formulaire.erreurs.email);
  });

  it.each(['', '   '])('formulaire-message-vide-sans-appel (%j)', async (message) => {
    const envoyer = vi.fn<EnvoyerDemandeDroit>();
    const hote = monter({ envoyer });
    remplir(hote, 'alice@exemple.fr', message);
    await soumettre(hote);
    expect(envoyer).not.toHaveBeenCalled();
    expect(hote.textContent).toContain(t.formulaire.erreurs.message);
  });

  it('formulaire-envoye-reference', async () => {
    const envoyer = vi.fn<EnvoyerDemandeDroit>().mockResolvedValue({ reference: 'REF-FICTIVE-1' });
    const hote = monter({ envoyer });
    remplir(hote, 'alice@exemple.fr', 'Bonjour');
    await soumettre(hote);
    expect(envoyer).toHaveBeenCalledTimes(1);
    expect(envoyer).toHaveBeenCalledWith({ type: 'effacement', email: 'alice@exemple.fr', message: 'Bonjour' });
    expect(hote.textContent).toContain('REF-FICTIVE-1');
  });

  it('formulaire-echec-garde-la-saisie', async () => {
    const envoyer = vi.fn<EnvoyerDemandeDroit>().mockRejectedValue(new Error('panne'));
    const hote = monter({ envoyer });
    remplir(hote, 'alice@exemple.fr', 'Bonjour');
    await soumettre(hote);
    expect(hote.textContent).toContain(t.formulaire.erreurs.envoi);
    expect((hote.querySelector('input') as HTMLInputElement).value).toBe('alice@exemple.fr');
    expect((hote.querySelector('textarea') as HTMLTextAreaElement).value).toBe('Bonjour');
    expect((hote.querySelector('select') as HTMLSelectElement).value).toBe('effacement');
  });

  it('sans-envoi-bouton-desactive', () => {
    const hote = monter();
    expect((hote.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
    expect(hote.textContent).toContain(t.formulaire.contactIndisponible);
  });
});
