// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { Anneau, type AnneauProps } from '../Anneau.js';

const textes: AnneauProps['textes'] = {
  titre: 'Santé fictive',
  arcs: { pieces: 'Pièces', banque: 'Banque', tva: 'TVA' },
  couleurs: { vert: 'Bon', orange: 'À surveiller', rouge: 'Bloqué', pointille: 'Inconnu' },
  centre: 'sur',
  colonnes: ['Arc', 'État', 'Nombre'],
};

const arc = (code: 'pieces' | 'banque' | 'tva', couleur: 'vert' | 'orange' | 'rouge' | 'pointille') => ({ code, couleur, sous: [] });
const normal: AnneauProps['anneau'] = {
  arcs: [arc('pieces', 'vert'), arc('banque', 'orange'), arc('tva', 'rouge')],
  global: 'rouge',
  centre: { mot: 'rouge', nombre: 7, sur: 12 },
};
const absent: AnneauProps['anneau'] = {
  arcs: [arc('pieces', 'pointille'), arc('banque', 'vert'), arc('tva', 'pointille')],
  global: 'vert',
  centre: { mot: 'vert', nombre: 3, sur: 4 },
};

async function monter(props: Partial<AnneauProps> = {}): Promise<HTMLElement> {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const conteneur = document.createElement('div');
  document.body.appendChild(conteneur);
  const racine = createRoot(conteneur);
  await act(async () => {
    racine.render(<Anneau anneau={normal} textes={textes} {...props} />);
  });
  return conteneur;
}

describe('Anneau de santé', () => {
  it('trois-arcs', async () => {
    const c = await monter();
    expect(c.querySelectorAll('svg [data-arc]')).toHaveLength(3);
    expect([...c.querySelectorAll('svg [data-arc]')].map((a) => a.getAttribute('data-arc'))).toEqual(['pieces', 'banque', 'tva']);
    expect(c.querySelector('svg')?.getAttribute('role')).toBe('img');
    expect(c.querySelector('svg')?.getAttribute('aria-label')).toContain('Santé fictive');
  });
  it('pointille-si-absent', async () => {
    const c = await monter({ anneau: absent });
    const trait = (code: string) => c.querySelector(`[data-arc="${code}"]`)?.getAttribute('stroke-dasharray');
    expect(trait('pieces')).toBeTruthy();
    expect(trait('tva')).toBeTruthy();
    expect(trait('banque')).toBeNull();
    expect(c.querySelector('[data-arc="pieces"]')?.getAttribute('data-etat')).toBe('pointille');
  });
  it('centre-mot-et-nombre', async () => {
    const c = await monter();
    const centre = c.querySelector('[data-centre]')?.textContent ?? '';
    expect(centre).toContain('Bloqué');
    expect(centre).toContain('7 sur 12');
    const vide = await monter({ anneau: { ...normal, global: 'pointille', centre: { mot: 'donnees_absentes' } } });
    expect(vide.querySelector('[data-centre]')?.textContent).toBe('Inconnu');
  });
  it('aucun-signe-pourcent-dans-le-rendu', async () => {
    for (const anneau of [normal, absent]) {
      const c = await monter({ anneau });
      expect(c.innerHTML).not.toContain('%');
    }
  });
  it('tableau-equivalent-present', async () => {
    const c = await monter();
    const lignes = c.querySelectorAll('table tbody tr');
    expect(lignes).toHaveLength(3);
    expect([...c.querySelectorAll('table th[scope="col"]')].map((t) => t.textContent)).toEqual(['Arc', 'État', 'Nombre']);
    expect(c.querySelector('table')?.className).toContain('axion-anneau__tableau');
    expect(lignes[0]?.textContent).toContain('Pièces');
  });
  it('etat-en-mot-pas-seulement-couleur', async () => {
    const c = await monter();
    const cellules = [...c.querySelectorAll('table tbody tr')].map((l) => l.querySelectorAll('td')[0]?.textContent);
    expect(cellules).toEqual(['Bon', 'À surveiller', 'Bloqué']);
    const sansDonnee = await monter({ anneau: absent });
    expect(sansDonnee.querySelectorAll('table tbody tr')[0]?.textContent).toContain('Inconnu');
  });
  it('textes-venus-des-props', async () => {
    const a = await monter();
    const b = await monter({ textes: { ...textes, titre: 'Autre titre', centre: 'parmi', arcs: { ...textes.arcs, tva: 'Taxe' } } });
    expect(a.innerHTML).not.toBe(b.innerHTML);
    expect(b.innerHTML).toContain('Autre titre');
    expect(b.innerHTML).toContain('Taxe');
    expect(b.querySelector('[data-centre]')?.textContent).toContain('7 parmi 12');
  });
});
