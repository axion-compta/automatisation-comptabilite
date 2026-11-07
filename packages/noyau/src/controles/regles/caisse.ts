// Contrôle CC-PM02 : caisse négative à une date, même si le solde final est positif.
// Montants en centimes entiers, signés (entrée positive, sortie négative). Règle pure :
// le moteur signale, il ne corrige jamais.
import type { Declencheur, RegleControle, SortieRegle } from '../moteur.js';

export interface MouvementCaisse {
  date: string;
  montant: number;
}

export interface SoldeJour {
  date: string;
  solde: number;
}

export interface EntreeCaisse {
  soldeInitial: number;
  mouvements: readonly MouvementCaisse[];
}

export type CodeErreurCaisse = 'montant_invalide' | 'date_invalide';

export class ErreurCaisse extends Error {
  override name = 'ErreurCaisse';
  readonly code: CodeErreurCaisse;
  constructor(code: CodeErreurCaisse, message: string) {
    super(message);
    this.code = code;
  }
}

function verifierMontant(valeur: number): void {
  if (!Number.isSafeInteger(valeur)) {
    throw new ErreurCaisse('montant_invalide', 'Un montant doit être un entier de centimes.');
  }
}

function dateValide(s: string): boolean {
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s);
  if (m === null) return false;
  const [annee, mois, jour] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(annee, mois - 1, jour));
  // Un jour inexistant fait déborder le mois (ou l'année) : la comparaison suffit.
  return d.getUTCFullYear() === annee && d.getUTCMonth() === mois - 1;
}

/** Soldes de FIN de journée, dates triées, un solde par date. */
export function soldesCaisseParJour(soldeInitial: number, mouvements: readonly MouvementCaisse[]): SoldeJour[] {
  verifierMontant(soldeInitial);
  const parDate = new Map<string, number>();
  for (const mouvement of mouvements) {
    verifierMontant(mouvement.montant);
    if (!dateValide(mouvement.date)) {
      throw new ErreurCaisse('date_invalide', 'Date de mouvement invalide.');
    }
    parDate.set(mouvement.date, (parDate.get(mouvement.date) ?? 0) + mouvement.montant);
  }
  let solde = soldeInitial;
  return [...parDate.keys()].sort().map((date) => {
    solde += parDate.get(date) ?? 0;
    verifierMontant(solde);
    return { date, solde };
  });
}

/** Première date dont le solde de fin de journée est négatif, avec ce solde, ou rien. */
export function premiereCaisseNegative(
  soldeInitial: number,
  mouvements: readonly MouvementCaisse[],
): SoldeJour | undefined {
  return soldesCaisseParJour(soldeInitial, mouvements).find((s) => s.solde < 0);
}

const DECLENCHEURS: Declencheur[] = ['continu', 'avant_cloture'];

/** CC-PM02 : ALERTE avec l'écart égal à la valeur absolue du solde négatif. */
export const regleCaisse: RegleControle<EntreeCaisse> = {
  id: 'CC-PM02',
  version: 1,
  gravite: 'B',
  bloque: ['validation', 'cloture'],
  declencheurs: DECLENCHEURS,
  actif: true,
  evaluer: (entree): SortieRegle => {
    const negative = premiereCaisseNegative(entree.soldeInitial, entree.mouvements);
    if (negative === undefined) return { resultat: 'OK' };
    return { resultat: 'ALERTE', ecartCentimes: Math.abs(negative.solde), valeur: negative.date };
  },
};
