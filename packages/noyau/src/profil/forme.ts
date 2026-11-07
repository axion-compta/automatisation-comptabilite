import { ErreurProfil, FORMES, FORMES_REFUSEES_MVP, estDans } from './types.js';

export type Comportement = 'compte_exploitant' | 'compte_courant_associe' | 'compte_capital' | 'dividendes' | 'impot_par_defaut';
export type LigneRegleForme = { forme: string; comportement: Comportement; valeur: string; source: string };
export type Couverture = { couverte: boolean; motif?: 'forme_sans_regle' | 'forme_refusee_mvp' | 'forme_inconnue' };

const PREFIXE_COMPTE = 'compte_';

function lignesDe(matrice: readonly LigneRegleForme[], forme: string): LigneRegleForme[] {
  const lignes = matrice.filter((l) => l.forme === forme);
  if (lignes.some((l) => typeof l.source !== 'string' || l.source.trim() === '')) throw new ErreurProfil('source_absente');
  return lignes;
}

export function regleDeForme(matrice: readonly LigneRegleForme[], forme: string, comportement: Comportement): string | null {
  const lignes = lignesDe(matrice, forme).filter((l) => l.comportement === comportement);
  if (lignes.length > 1) throw new ErreurProfil('regle_forme_ambigue');
  return lignes[0]?.valeur ?? null;
}

export function formeCouverte(matrice: readonly LigneRegleForme[], forme: string): Couverture {
  if (estDans(FORMES_REFUSEES_MVP, forme)) return { couverte: false, motif: 'forme_refusee_mvp' };
  if (!estDans(FORMES, forme)) return { couverte: false, motif: 'forme_inconnue' };
  return lignesDe(matrice, forme).length === 0 ? { couverte: false, motif: 'forme_sans_regle' } : { couverte: true };
}

export function comptesProposes(matrice: readonly LigneRegleForme[], forme: string): string[] {
  const valeurs = lignesDe(matrice, forme)
    .filter((l) => l.comportement.startsWith(PREFIXE_COMPTE))
    .map((l) => l.valeur);
  return [...new Set(valeurs)].sort();
}
