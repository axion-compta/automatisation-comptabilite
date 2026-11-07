import { ErreurChat } from '../chat/types.js';

// Curateur de mémoire : chaque correction humaine devient un exemple, par société. Une règle est seulement PROPOSÉE (niveau M).
export type Correction = { societe: string; fournisseur: string; compte: string; par: 'personne' | 'piece'; le: string };
export type Exemple = Correction;
export type RegleProposee = { fournisseur: string; compte: string; niveau: 'M'; etat: 'proposee' };

const memeCorrection = (a: Correction, b: Correction): boolean =>
  a.societe === b.societe && a.fournisseur === b.fournisseur && a.compte === b.compte && a.par === b.par && a.le === b.le;

export function ajouterCorrection(exemples: readonly Exemple[], correction: Correction): Exemple[] {
  if (correction.par !== 'personne') throw new ErreurChat('parametre_invalide');
  return exemples.some((e) => memeCorrection(e, correction)) ? [...exemples] : [...exemples, { ...correction }];
}

export function exemplesDe(exemples: readonly Exemple[], societe: string): Exemple[] {
  return exemples.filter((e) => e.societe === societe);
}

export function reglesAProposer(exemples: readonly Exemple[], societe: string, reglages: { concordantes: number }): RegleProposee[] {
  const n = reglages.concordantes;
  if (!Number.isSafeInteger(n) || n < 1) throw new ErreurChat('parametre_invalide');
  const miens = exemplesDe(exemples, societe);
  const regles: RegleProposee[] = [];
  for (const { fournisseur, compte } of miens) {
    if (regles.some((r) => r.fournisseur === fournisseur && r.compte === compte)) continue;
    const memeFournisseur = miens.filter((e) => e.fournisseur === fournisseur);
    const vers = memeFournisseur.filter((e) => e.compte === compte);
    const derniere = vers.reduce((max, e) => (e.le > max ? e.le : max), '');
    const contraire = memeFournisseur.some((e) => e.compte !== compte && e.le >= derniere);
    if (vers.length >= n && !contraire) regles.push({ fournisseur, compte, niveau: 'M', etat: 'proposee' });
  }
  return regles;
}
