// Règles ALR-08 à ALR-11 : constats pour `evaluer`. Le logiciel signale, il ne relance jamais (D26).
// Délai d'avance passé en paramètre : rien de légal écrit ici. Codes seulement, aucun texte affiché.
import { comparerDates, joursEntre } from '../../interface/dates.js';
import type { Constat } from '../moteur.js';

export class ErreurTiersBanque extends Error {
  override name = 'ErreurTiersBanque';
  readonly code = 'entree_invalide';
  constructor() {
    super('entree_invalide');
  }
}

interface Facture<S extends string> {
  id: string;
  sens: S;
  resteCentimes: number;
  echeance: string;
}

const entierPositif = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;

function reste(f: Facture<string>, sens: string): number {
  if (f.sens !== sens || !entierPositif(f.resteCentimes)) throw new ErreurTiersBanque();
  return f.resteCentimes;
}

const constat = (regle: string, objetType: string, objetId: string, gravite: Constat['gravite'], echeanceLe?: string): Constat =>
  echeanceLe === undefined ? { regle, objetType, objetId, gravite } : { regle, objetType, objetId, gravite, echeanceLe };

export function alr08(factures: readonly Facture<'a_recevoir'>[], jour: string): Constat[] {
  return factures
    .filter((f) => reste(f, 'a_recevoir') > 0 && comparerDates(f.echeance, jour) < 0)
    .map((f) => constat('ALR-08', 'facture', f.id, 'a_faire', f.echeance));
}

export function alr09(factures: readonly Facture<'a_payer'>[], jour: string, parametres: { joursAvant: number }): Constat[] {
  if (!entierPositif(parametres.joursAvant)) throw new ErreurTiersBanque();
  return factures
    .filter((f) => reste(f, 'a_payer') > 0 && joursEntre(jour, f.echeance) <= parametres.joursAvant)
    .map((f) => constat('ALR-09', 'facture', f.id, 'urgent', f.echeance));
}

export function alr10(comptes: readonly { id: string; ecart: 'OK' | 'ECART' | 'IMPOSSIBLE' }[]): Constat[] {
  const r: Constat[] = [];
  for (const c of comptes) {
    if (c.ecart === 'ECART') r.push(constat('ALR-10', 'compte', c.id, 'a_faire'));
    else if (c.ecart === 'IMPOSSIBLE') r.push(constat('ALR-10', 'compte', c.id, 'urgent'));
    else if (c.ecart !== 'OK') throw new ErreurTiersBanque();
  }
  return r;
}

export function alr11(commentaires: readonly { id: string; lu: boolean; auteur: 'cabinet' | 'client' }[]): Constat[] {
  for (const c of commentaires) if (c.auteur !== 'cabinet' && c.auteur !== 'client') throw new ErreurTiersBanque();
  return commentaires.filter((c) => c.auteur === 'cabinet' && !c.lu).map((c) => constat('ALR-11', 'commentaire', c.id, 'a_faire'));
}
