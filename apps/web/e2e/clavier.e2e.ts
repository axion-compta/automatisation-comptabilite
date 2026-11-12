import { expect, test } from '@playwright/test';

// Fiche L19-T02 : parcours au clavier seul (aucun clic), en mode simulé.
test('parcours-clavier-seul', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible();

  // Palette Ctrl+K, puis Mes documents.
  await page.keyboard.press('Control+k');
  const champ = page.getByRole('dialog').getByRole('textbox');
  await expect(champ).toBeFocused();
  await page.keyboard.type('documents');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Mes documents' })).toBeVisible();

  // Ouvrir une pièce : lien activé par Entrée, puis lien de retour.
  const lien = page.getByRole('table').getByRole('link').first();
  await expect(lien).toBeVisible();
  await lien.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/documents\/piece\?id=/);
  const retour = page.getByRole('link', { name: 'Retour à mes documents' });
  await retour.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Mes documents' })).toBeVisible();

  // Dépôt : le bouton de la zone s'active au clavier et ouvre le sélecteur de fichiers.
  await page.goto('/documents/deposer');
  const bouton = page.getByRole('button', { name: 'Choisir des fichiers' });
  await bouton.focus();
  await expect(bouton).toBeFocused();
  const selecteur = page.waitForEvent('filechooser');
  await page.keyboard.press('Enter');
  const fichier = await selecteur;
  // Deux fichiers : un seul fichier est refusé par le faux serveur (voir le journal).
  const f = (n: string) => ({ name: n, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fictif ' + n) });
  await fichier.setFiles([f('a.pdf'), f('b.pdf')]);
  await expect(page.getByRole('status', { name: 'Résultat de votre dépôt' }).getByRole('link', { name: 'Voir la pièce' })).toHaveCount(2);
});
