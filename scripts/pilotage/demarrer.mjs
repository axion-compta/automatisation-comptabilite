// Pilotage sans IA : démarrage d'une routine. Fichier ARRET présent sur origin/main = code 3 (arrêt d'urgence).
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const CODE_ARRET = 3;

// git : (args) => { status } ; renvoie le code de sortie de la routine.
export function demarrer(git) {
  if (git(['fetch', 'origin']).status !== 0) return 1;
  if (git(['rev-parse', '--verify', '--quiet', 'origin/main^{commit}']).status !== 0) return 1;
  return git(['cat-file', '-e', 'origin/main:pilotage/ARRET']).status === 0 ? CODE_ARRET : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const code = demarrer((args) => spawnSync('git', args, { encoding: 'utf8' }));
  if (code === CODE_ARRET) console.log('ARRET présent : la routine s’arrête sans rien écrire.');
  process.exit(code);
}
