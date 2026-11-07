import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const ETIQUETTES = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];
const NAVIGATION = 'Navigation principale';

async function violations(page: Page) {
  const resultat = await new AxeBuilder({ page }).withTags(ETIQUETTES).analyze();
  return resultat.violations.map((v) => v.id + ' : ' + v.nodes.length + ' élément(s)');
}

test('axe-accueil-bureau', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: NAVIGATION })).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

test('axe-accueil-telephone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Discuter' })).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

test('axe-annees-comptables', async ({ page }) => {
  await page.goto('/reglages/entreprise/annees');
  await expect(page.getByRole('table')).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

test('menu-selon-largeur', async ({ page }) => {
  const menu = page.getByRole('navigation', { name: NAVIGATION });
  const discuter = page.getByRole('button', { name: 'Discuter' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(menu).toHaveCount(1);
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('button', { name: 'Plus' })).toHaveCount(0);
  await expect(discuter).toHaveCount(0);
  await page.setViewportSize({ width: 375, height: 700 });
  await expect(menu).toHaveCount(1);
  await expect(menu.getByRole('button', { name: 'Plus' })).toBeVisible();
  await expect(discuter).toBeVisible();
});
