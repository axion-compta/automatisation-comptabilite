// Alertes ALR-02, ALR-05, ALR-06, ALR-07 (AL-R2) : constats pour `evaluer`. Borne en argument, rien de légal écrit ici.
import { joursEntre } from '../../interface/dates.js';
import type { Constat } from '../moteur.js';

export class ErreurRegle extends Error {
  override name = 'ErreurRegle';
  readonly code = 'parametre_invalide';
  constructor() {
    super('parametre_invalide');
  }
}

/** ALR-02 : ligne bancaire sans pièce depuis au moins `joursSansPiece` jours. */
export function alr02(
  lignesBancaires: readonly { id: string; date: string; pieceId?: string }[],
  jour: string,
  parametres: { joursSansPiece: number },
): Constat[] {
  const n = parametres.joursSansPiece;
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 0) throw new ErreurRegle();
  return lignesBancaires
    .filter((l) => l.pieceId === undefined && joursEntre(l.date, jour) >= n)
    .map((l) => ({ regle: 'ALR-02', objetType: 'ligne_bancaire', objetId: l.id, gravite: 'a_faire' }));
}

/** ALR-05 : lecture douteuse, bloquant dès qu'une période de TVA est touchée (D4). */
export function alr05(pieces: readonly { id: string; lectureDouteuse: boolean; periodeTva?: string }[]): Constat[] {
  return pieces
    .filter((p) => p.lectureDouteuse)
    .map((p) =>
      p.periodeTva === undefined
        ? { regle: 'ALR-05', objetType: 'piece', objetId: p.id, gravite: 'a_faire' }
        : { regle: 'ALR-05', objetType: 'piece', objetId: p.id, periode: p.periodeTva, gravite: 'bloquant' },
    );
}

/** ALR-06 : taux ou nature manquant, toujours bloquant. */
export function alr06(pieces: readonly { id: string; tauxConnu: boolean; natureConnue: boolean }[]): Constat[] {
  return pieces
    .filter((p) => !p.tauxConnu || !p.natureConnue)
    .map((p) => ({ regle: 'ALR-06', objetType: 'piece', objetId: p.id, gravite: 'bloquant' }));
}

/** ALR-07 : capitaux propres sous la moitié du capital ; donnée absente = aucun constat. */
export function alr07(capitauxPropresSousMoitie: boolean | undefined, societeId: string): Constat[] {
  if (capitauxPropresSousMoitie !== true) return [];
  return [{ regle: 'ALR-07', objetType: 'societe', objetId: societeId, gravite: 'bloquant' }];
}
