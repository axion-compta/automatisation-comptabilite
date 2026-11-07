// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { RenduCarte, type LibellesRenduCarte } from '../RenduCarte.js';

const L: LibellesRenduCarte = {
  indisponible: 'Affichage indisponible', vide: 'Aucun élément', voirTout: 'Voir tout', telecharger: 'Télécharger',
  types: { ecriture: 'Écriture', piece: 'Pièce', liste: 'Liste', proposition: 'Proposition', rapprochement: 'Rapprochement', tva: 'TVA', telechargement: 'Fichier' },
};
const base = { id: 'x1', titre_code: 'carte.essai', source: { type: 'objet', id: 'o1' } };
const avecMontant = { libelle: 'Achat fictif', montant_centimes: 12345, devise: 'EUR' };
const CARTES: Array<[string, Record<string, unknown>, string]> = [
  ['ecriture', avecMontant, 'Achat fictif'],
  ['piece', avecMontant, 'Achat fictif'],
  ['liste', { elements: [{ libelle: 'Premier' }, { libelle: 'Second' }] }, 'Second'],
  ['proposition', avecMontant, '123,45'],
  ['rapprochement', avecMontant, '123,45'],
  ['tva', { montant_centimes: 12345, devise: 'EUR' }, '123,45'],
  ['telechargement', { lien_interne: '/fichiers/a1', expire_le: '2026-12-01T10:00:00Z' }, 'Télécharger'],
];

async function monter(brut: unknown, onOuvrir = vi.fn()): Promise<HTMLElement> {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const c = document.createElement('div');
  document.body.appendChild(c);
  await act(async () => { createRoot(c).render(<RenduCarte brut={brut} libelles={L} onOuvrir={onOuvrir} />); });
  return c;
}
const carte = (type: string, champs: Record<string, unknown>) => ({ ...base, type, ...champs });
const indispo = (c: HTMLElement) => c.textContent === L.indisponible && c.querySelector('[role=alert]') !== null;

describe('rendu carte', () => {
  it.each(CARTES)('sept-types-rendus : %s', async (type, champs, texte) => {
    const c = await monter(carte(type, champs));
    expect(c.querySelector(`[data-type=${type}]`)).not.toBeNull();
    expect(c.textContent).toContain(texte);
    expect(c.textContent).not.toContain(L.indisponible);
  });

  it('json-invalide-indisponible', async () => {
    for (const brut of ['{"type":', 42, [], {}, { type: 'inconnu' }]) expect(indispo(await monter(brut))).toBe(true);
  });

  it('html-dans-un-champ-indisponible', async () => {
    const c = await monter(carte('ecriture', { ...avecMontant, libelle: '<img src=x onerror=alert(1)>' }));
    expect(indispo(c)).toBe(true);
    expect(c.querySelector('img')).toBeNull();
  });

  it('lien-externe-indisponible', async () => {
    for (const lien of ['https://exemple.fr/a', '//exemple.fr/a', 'javascript:alert(1)']) {
      expect(indispo(await monter(carte('telechargement', { lien_interne: lien, expire_le: '2026-12-01T10:00:00Z' })))).toBe(true);
    }
    expect(indispo(await monter(carte('liste', { elements: [{ libelle: 'voir https://exemple.fr' }] })))).toBe(true);
  });

  it('aucun-lien-href-externe', async () => {
    for (const [type, champs] of CARTES) {
      const c = await monter(carte(type, champs));
      expect(c.querySelector('a[href^=http]')).toBeNull();
      expect(c.querySelector('a')).toBeNull();
    }
    const onOuvrir = vi.fn();
    const c = await monter(carte('telechargement', CARTES[6]![1]), onOuvrir);
    await act(async () => { c.querySelector('button')!.click(); });
    expect(onOuvrir).toHaveBeenCalledWith(base.source);
  });

  it('liste-vide', async () => {
    const c = await monter(carte('liste', { elements: [] }));
    expect(c.textContent).toContain(L.vide);
  });

  it('liste-longue-pagination', async () => {
    const elements = Array.from({ length: 51 }, (_, i) => ({ libelle: `Ligne ${i + 1}` }));
    const c = await monter(carte('liste', { elements }));
    expect(c.querySelectorAll('li')).toHaveLength(50);
    const bouton = [...c.querySelectorAll('button')].find((b) => b.textContent === L.voirTout)!;
    await act(async () => { bouton.click(); });
    expect(c.querySelectorAll('li')).toHaveLength(51);
  });

  it('montant-zero-affiche', async () => {
    const c = await monter(carte('tva', { montant_centimes: 0, devise: 'EUR' }));
    expect(c.textContent).toContain('0,00');
    expect(c.textContent).not.toContain('NaN');
  });

  it('brut-null-ou-undefined', async () => {
    expect(indispo(await monter(null))).toBe(true);
    expect(indispo(await monter(undefined))).toBe(true);
  });

  it('champ-manquant-indisponible', async () => {
    const sans: Record<string, unknown> = { ...avecMontant };
    delete sans.devise;
    expect(indispo(await monter(carte('ecriture', sans)))).toBe(true);
    expect(indispo(await monter(carte('ecriture', { ...avecMontant, montant_centimes: Number.NaN })))).toBe(true);
    expect(indispo(await monter(carte('ecriture', { ...avecMontant, extra: 'x' })))).toBe(true);
  });
});
