// Lance toutes les vérifications. Tolère l'absence de gardes : lance tous les outils/gardes/*.mjs trouvés.
// Option --gardes : ne lance que les gardes et leurs tests (utilisé par la tâche CI « gardes »).
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';

const seulementGardes = process.argv.includes('--gardes');
const etapes = [];

if (!seulementGardes) {
  etapes.push(['types', 'pnpm', ['-r', 'exec', 'tsc', '--noEmit']]);
  etapes.push(['lint', 'pnpm', ['exec', 'eslint', '.']]);
  etapes.push(['tests', 'pnpm', ['exec', 'vitest', 'run', '--passWithNoTests']]);
}
if (existsSync('outils/gardes/test')) {
  etapes.push(['tests des gardes', 'node', ['--test', '"outils/gardes/test/*.test.mjs"']]);
}
if (existsSync('outils/gardes')) {
  const gardes = readdirSync('outils/gardes', { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.mjs'))
    .map((e) => e.name)
    .sort();
  for (const g of gardes) etapes.push(['garde ' + g, 'node', ['outils/gardes/' + g]]);
}

let echecs = 0;
for (const [nom, cmd, args] of etapes) {
  console.log('\n== ' + nom);
  const r = spawnSync([cmd, ...args].join(' '), { stdio: 'inherit', shell: true });
  if (r.status !== 0) {
    echecs += 1;
    console.error('ECHEC : ' + nom);
  }
}
if (echecs > 0) {
  console.error('\nverifier : ' + echecs + ' étape(s) en échec');
  process.exit(1);
}
console.log('\nverifier : tout est vert (' + etapes.length + ' étapes)');
