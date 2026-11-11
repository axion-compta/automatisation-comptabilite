// Écriture d'une partie d'export : ZIP déterministe et manifeste des chemins (format de L03-T01).
import { strToU8, zipSync } from 'fflate';
import { empreinteSha256 } from '../documents/empreinte.js';
import { ErreurExploitation } from '../exploitation/types.js';

export type FichierPartie = { chemin: string; octets: Uint8Array };

export const NOM_MANIFESTE = 'MANIFESTE.sha256';
// Date locale fixe : les champs date/heure du ZIP ne dépendent ni de l'horloge ni du fuseau.
export const DATE_ZIP_FIXE = new Date(2000, 0, 1, 12, 0, 0);

const ORDRE = (a: string, b: string): number => (a < b ? -1 : 1);

function cheminValide(c: unknown): boolean {
  if (typeof c !== 'string' || c === '' || c.startsWith('/')) return false;
  if (/[\\\n\r]/.test(c)) return false;
  return !c.split('/').some((segment) => segment === '..' || segment === '');
}

export function manifesteChemins(fichiers: readonly FichierPartie[]): string {
  const vus = new Set<string>();
  for (const f of fichiers) {
    if (!cheminValide(f.chemin)) throw new ErreurExploitation('chemin_invalide');
    if (vus.has(f.chemin)) throw new ErreurExploitation('chemin_en_double');
    vus.add(f.chemin);
  }
  return [...fichiers]
    .sort((a, b) => ORDRE(a.chemin, b.chemin))
    .map((f) => `${empreinteSha256(f.octets)}  ${f.chemin}\n`)
    .join('');
}

export function ecrirePartie(fichiers: readonly FichierPartie[]): { octets: Uint8Array; empreinte: string } {
  const texte = manifesteChemins(fichiers);
  const entrees: Record<string, [Uint8Array, { mtime: Date }]> = {};
  const tous = [...fichiers.map((f) => ({ chemin: f.chemin, octets: f.octets })), { chemin: NOM_MANIFESTE, octets: strToU8(texte) }];
  for (const f of tous.sort((a, b) => ORDRE(a.chemin, b.chemin))) entrees[f.chemin] = [f.octets, { mtime: DATE_ZIP_FIXE }];
  const octets = zipSync(entrees);
  return { octets, empreinte: empreinteSha256(octets) };
}
