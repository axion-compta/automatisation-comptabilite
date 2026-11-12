import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const RACINE = join(__dirname, '..', '..', '..', '..');
const ECRANS = join(RACINE, 'apps', 'web', 'src', 'ecrans');
const CONTRAT = join(RACINE, 'packages', 'contrat', 'src');

function fichiers(dossier: string, garde: (nom: string) => boolean): string[] {
  const sortie: string[] = [];
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (nom === '__tests__' || nom === 'node_modules') continue;
    if (statSync(chemin).isDirectory()) sortie.push(...fichiers(chemin, garde));
    else if (garde(nom)) sortie.push(chemin);
  }
  return sortie;
}
/** Lignes `chemin:` / `id:` des routes d'écran et `path:` du contrat. */
function declarations(chemins: string[], motif: RegExp): string[] {
  return chemins.flatMap((f) => (readFileSync(f, 'utf8').match(motif) ?? []).map((m) => m.toLowerCase()));
}
const ROUTES = fichiers(ECRANS, (n) => n === 'route.tsx');
const CHEMINS_ECRAN = declarations(ROUTES, /\b(?:id|chemin):\s*'[^']*'/g);
const CHEMINS_CONTRAT = declarations(fichiers(CONTRAT, (n) => n.endsWith('.ts')), /\bpath:\s*'[^']*'/g);
const ECRAN_Q = /'q0[1-3]'|\/q0[1-3](?:\/|'|$)|-q0[1-3]\b/;
const PUBLICATION_PAQUET = /publi\w*[-_/]?paquet|paquet[-_/]?publi|publier-paquet/;

describe('produit client : aucune route interne de veille', () => {
  it('lit bien des routes et des chemins (le parcours n’est pas vide)', () => {
    expect(ROUTES.length).toBeGreaterThan(5);
    expect(CHEMINS_ECRAN.length).toBeGreaterThan(5);
    expect(CHEMINS_CONTRAT.length).toBeGreaterThan(20);
  });
  it('aucune-route-ecran-q-cote-client', () => {
    for (const d of [...CHEMINS_ECRAN, ...CHEMINS_CONTRAT]) expect(d).not.toMatch(ECRAN_Q);
    expect("chemin: '/q02'").toMatch(ECRAN_Q); // le motif détecte bien un écran Q
    expect("id: 'q01'").toMatch(ECRAN_Q);
  });
  it('aucune-route-publication-paquet-cote-client', () => {
    for (const d of [...CHEMINS_ECRAN, ...CHEMINS_CONTRAT]) expect(d).not.toMatch(PUBLICATION_PAQUET);
    expect("path: '/paquets/publication-paquet'").toMatch(PUBLICATION_PAQUET);
  });
});
