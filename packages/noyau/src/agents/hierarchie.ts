import { ErreurChat, GRAVITES_CONSTAT, POLES, estDans, type GraviteConstat, type Pole } from '../chat/types.js';

// Directeur de conformité : consolide les constats des pôles, escalade les critiques, ne produit aucun effet.
export type Constat = { id: string; type: string; gravite: GraviteConstat; pole?: Pole; refusParChef?: boolean };
export type Escalade = { id: string; pole: Pole; vers: 'utilisateur' };
export type Consolidation = {
  constats: Constat[];
  escalades: Escalade[];
  a_verifier: string[];
  effets: readonly never[];
};
export type Propriete = { sansProprietaire: string[]; poleInconnu: string[] };

const GRAVITE_BLOQUANTE: GraviteConstat = 'critique';
const parId = (a: { id: string }, b: { id: string }): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const proprietaire = (table: Record<string, Pole>, type: string): unknown =>
  Object.hasOwn(table, type) ? table[type] : undefined;

export function verifierPropriete(typesConnus: readonly string[], table: Record<string, Pole>): Propriete {
  const sansProprietaire = typesConnus.filter((t) => !Object.hasOwn(table, t));
  const poleInconnu = Object.keys(table).filter((t) => !estDans(POLES, table[t]));
  return { sansProprietaire, poleInconnu };
}

export function consolider(constats: readonly Constat[], table: Record<string, Pole>): Consolidation {
  const vus = new Set<string>();
  const poles = new Map<string, Pole>();
  for (const c of constats) {
    if (vus.has(c.id)) throw new ErreurChat('parametre_invalide');
    vus.add(c.id);
    const pole = proprietaire(table, c.type);
    if (!estDans(POLES, pole) || !estDans(GRAVITES_CONSTAT, c.gravite)) throw new ErreurChat('parametre_invalide');
    if (c.pole !== undefined && c.pole !== pole) throw new ErreurChat('parametre_invalide');
    poles.set(c.id, pole);
  }
  const tries = [...constats].sort(
    (a, b) => GRAVITES_CONSTAT.indexOf(a.gravite) - GRAVITES_CONSTAT.indexOf(b.gravite) || parId(a, b),
  );
  const escalades = tries
    .filter((c) => c.gravite === GRAVITE_BLOQUANTE)
    .map((c): Escalade => ({ id: c.id, pole: poles.get(c.id) as Pole, vers: 'utilisateur' }));
  const a_verifier = tries.filter((c) => c.refusParChef === true).map((c) => c.id).sort();
  return { constats: tries, escalades, a_verifier, effets: [] };
}
