// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { Jauge } from '../Jauge.js';

type Props = React.ComponentProps<typeof Jauge>;

async function monter(props: Partial<Props>): Promise<HTMLElement> {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const conteneur = document.createElement('div');
  document.body.appendChild(conteneur);
  const racine = createRoot(conteneur);
  await act(async () => {
    racine.render(<Jauge valeur={1} maximum={10} libelle="Pièces" texteValeur="1 sur 10" {...props} />);
  });
  return conteneur;
}

function largeur(c: HTMLElement): string {
  const barre = c.querySelector('[data-barre]') as HTMLElement | null;
  if (!barre) throw new Error('barre absente');
  return barre.style.width;
}

describe('jauge', () => {
  it('role-meter-et-valeurs-aria', async () => {
    const c = await monter({ valeur: 30, maximum: 100, libelle: 'Volume', texteValeur: '30 sur 100' });
    const m = c.querySelector('[role="meter"]') as HTMLElement;
    expect(m.getAttribute('aria-label')).toBe('Volume');
    expect(m.getAttribute('aria-valuemin')).toBe('0');
    expect(m.getAttribute('aria-valuemax')).toBe('100');
    expect(m.getAttribute('aria-valuenow')).toBe('30');
    expect(m.getAttribute('aria-valuetext')).toBe('30 sur 100');
    expect(m.hasAttribute('data-depasse')).toBe(false);
  });

  it('largeur-entiere-arrondie-inferieure', async () => {
    expect(largeur(await monter({ valeur: 72, maximum: 100 }))).toBe('72%');
    expect(largeur(await monter({ valeur: 2, maximum: 3 }))).toBe('66%');
    expect(largeur(await monter({ valeur: 0, maximum: 3 }))).toBe('0%');
  });

  it('depassement-borne-a-cent-et-marque', async () => {
    const c = await monter({ valeur: 120, maximum: 100 });
    const m = c.querySelector('[role="meter"]') as HTMLElement;
    expect(largeur(c)).toBe('100%');
    expect(m.getAttribute('aria-valuenow')).toBe('100');
    expect(m.getAttribute('data-depasse')).toBe('oui');
    const egal = await monter({ valeur: 100, maximum: 100 });
    expect(egal.querySelector('[role="meter"]')!.hasAttribute('data-depasse')).toBe(false);
  });

  it('estimation-optionnelle', async () => {
    const avec = await monter({ estimation: 'Estimation : 90 sur 100' });
    expect(avec.textContent).toContain('Estimation : 90 sur 100');
    const sans = await monter({});
    expect(sans.querySelector('[data-estimation]')).toBeNull();
    const vide = await monter({ estimation: '' });
    expect(vide.querySelector('[data-estimation]')).toBeNull();
  });

  it('maximum-zero-ou-negatif-sans-barre', async () => {
    for (const maximum of [0, -5]) {
      const c = await monter({ valeur: 3, maximum, texteValeur: 'texte seul' });
      expect(c.querySelector('[role="meter"]')).toBeNull();
      expect(c.querySelector('[data-barre]')).toBeNull();
      expect(c.textContent).toContain('texte seul');
    }
  });

  it('nan-infinity-decimal-sans-barre', async () => {
    const cas: Array<[number, number]> = [
      [Number.NaN, 10],
      [Number.POSITIVE_INFINITY, 10],
      [-1, 10],
      [1.5, 10],
      [1, Number.NaN],
      [1, Number.POSITIVE_INFINITY],
      [1, 10.5],
    ];
    for (const [valeur, maximum] of cas) {
      const c = await monter({ valeur, maximum, texteValeur: 'repli' });
      expect(c.querySelector('[role="meter"]')).toBeNull();
      expect(c.querySelector('[data-barre]')).toBeNull();
      expect(c.textContent).toContain('repli');
      expect(c.textContent).not.toMatch(/NaN|Infinity/);
    }
  });

  it('texte-valeur-toujours-rendu', async () => {
    const c = await monter({ valeur: 5, maximum: 10, texteValeur: 'cinq sur dix' });
    expect(c.textContent).toContain('cinq sur dix');
  });

  it('css-sans-couleur-en-dur', () => {
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'jauge.css'), 'utf-8');
    expect(css.length).toBeGreaterThan(0);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\b(rgb|rgba|hsl|hsla)\(/);
    expect(css).toMatch(/var\(--couleur-/);
    const vars = [...css.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]);
    const jetons = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'jetons.css'), 'utf-8');
    for (const v of vars) expect(jetons).toContain(`${v}:`);
  });
});
