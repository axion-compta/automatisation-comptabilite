// Lance la chaîne de captures dans l'image Playwright épinglée par empreinte (image.txt).
// Usage : node outils/captures/lancer.mjs [--deux-passages] [dossier-sortie]
import { mkdtempSync, mkdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = fileURLToPath(new URL('../../', import.meta.url));
const FORMAT_IMAGE = /^[^\s@]+@sha256:[0-9a-f]{64}$/;

/** Refuse toute référence d'image qui n'est pas figée par une empreinte @sha256: de 64 caractères hexadécimaux. */
export function validerImage(contenu) {
  if (typeof contenu !== 'string') throw new Error('image illisible');
  const ligne = contenu.replace(/\r?\n$/, '');
  if (!FORMAT_IMAGE.test(ligne)) throw new Error('image sans empreinte @sha256: valide (valeur à fournir par Will dans image.txt)');
  return ligne;
}

function passage(image, sortie) {
  mkdirSync(sortie, { recursive: true });
  const commande = 'corepack pnpm install --frozen-lockfile && corepack pnpm --filter @axion/web exec playwright test -c playwright.captures.config.ts --trace off';
  const r = spawnSync(
    'docker',
    ['run', '--rm', '--ipc=host', '-v', `${RACINE}:/travail`, '-v', `${sortie}:/captures`, '-w', '/travail', '-e', 'CAPTURES_DIR=/captures', image, 'sh', '-c', commande],
    { stdio: 'inherit' },
  );
  return r.status === 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const deux = args.includes('--deux-passages');
  try {
    const image = validerImage(readFileSync(join(RACINE, 'outils/captures/image.txt'), 'utf8'));
    const base = resolve(args.find((a) => !a.startsWith('--')) ?? mkdtempSync(join(tmpdir(), 'captures-')));
    const dossiers = deux ? [join(base, 'passage-1'), join(base, 'passage-2')] : [base];
    for (const d of dossiers) if (!passage(image, d)) throw new Error('passage de captures en échec');
    if (deux) {
      const r = spawnSync(process.execPath, [join(RACINE, 'outils/captures/comparer.mjs'), ...dossiers], { stdio: 'inherit' });
      if (r.status !== 0) process.exit(1);
    }
    console.log('captures produites dans ' + base);
  } catch (e) {
    console.error('captures ' + e.message);
    process.exit(1);
  }
}
