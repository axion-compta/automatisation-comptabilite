import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Écran de test' })).toBeVisible();
});

test('sans panne : enregistre une écriture', async ({ page }) => {
  await page.getByRole('button', { name: 'Envoyer' }).click();
  await expect(page.getByTestId('resultat')).toHaveText('200 Écriture enregistrée.');
  await expect(page.getByTestId('total')).toHaveText('1 écriture(s)');
});

test('rejouer la même clé ne crée pas de doublon', async ({ page }) => {
  const envoyer = page.getByRole('button', { name: 'Envoyer' });
  await envoyer.click();
  await expect(page.getByTestId('total')).toHaveText('1 écriture(s)');
  await envoyer.click();
  await expect(page.getByTestId('resultat')).toHaveText('200 Écriture enregistrée.');
  await expect(page.getByTestId('total')).toHaveText('1 écriture(s)');
});

for (const [code, texte] of [
  ['403', 'Accès refusé.'],
  ['423', 'Ressource verrouillée.'],
] as const) {
  test('panne ' + code + ' : message affiché, aucune écriture créée', async ({ page }) => {
    await page.getByLabel('Panne').selectOption(code);
    await page.getByRole('button', { name: 'Envoyer' }).click();
    await expect(page.getByTestId('resultat')).toHaveText(code + ' ' + texte);
    await expect(page.getByTestId('total')).toHaveText('0 écriture(s)');
  });
}

test('panne 409 : la création ne la déclare pas, elle est ignorée', async ({ page }) => {
  await page.getByLabel('Panne').selectOption('409');
  await page.getByRole('button', { name: 'Envoyer' }).click();
  await expect(page.getByTestId('resultat')).toHaveText('200 Écriture enregistrée.');
});

test('panne 409 sur la modification : conflit de version affiché', async ({ page }) => {
  await page.getByRole('button', { name: 'Envoyer' }).click();
  await expect(page.getByTestId('resultat')).toHaveText('200 Écriture enregistrée.');
  await page.getByLabel('Panne').selectOption('409');
  await page.getByRole('button', { name: 'Modifier' }).click();
  await expect(page.getByTestId('resultat')).toHaveText('409 Conflit de version.');
});

test('vrai conflit sans panne : deux modifications avec la même version', async ({ page }) => {
  await page.getByRole('button', { name: 'Envoyer' }).click();
  await expect(page.getByTestId('total')).toHaveText('1 écriture(s)');
  await page.getByRole('button', { name: 'Modifier' }).click();
  await expect(page.getByTestId('resultat')).toHaveText('200 Écriture enregistrée.');
  await page.getByRole('button', { name: 'Modifier' }).click();
  await expect(page.getByTestId('resultat')).toHaveText('409 Conflit de version.');
});
