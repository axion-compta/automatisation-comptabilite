// Reprise : plan et à-nouveaux reconstruits depuis un FEC ou une balance. Montants en centimes, brouillon seulement.
import { ajouter, centimes, type Centimes } from '../argent/index.js';
import { estDateValide } from '../dates/civiles.js';
import type { Ecriture, LigneEcriture } from '../ecritures/modele.js';
import { ErreurCompte, normaliserCompte, verifierCompteMvp, type CodeErreurCompte } from './comptes.js';

export class ErreurReprise extends Error {
  override name = 'ErreurReprise';
  readonly code: 'desequilibre' | 'date_invalide';
  constructor(code: 'desequilibre' | 'date_invalide') {
    super(code);
    this.code = code;
  }
}

/** Ligne de FEC lue (`LigneFecLue` convient). */
export interface LigneReprise {
  valeurs: { compteNum: string; compteLib: string };
}
export interface CompteRepris {
  numero: string;
  libelle: string;
  libellesDivergents: string[];
  occurrences: number;
}
export interface CompteDouteux {
  numero: string;
  motif: CodeErreurCompte;
}
export interface SoldeBalance {
  compte: string;
  solde: Centimes;
}

/** Numéro normalisé, ou le motif pour lequel le compte est douteux. */
function examiner(saisie: string): { numero: string } | { motif: CodeErreurCompte } {
  try {
    const { numero } = normaliserCompte(saisie);
    verifierCompteMvp(numero);
    return { numero };
  } catch (e) {
    if (e instanceof ErreurCompte) return { motif: e.code };
    throw e;
  }
}

export function reconstruirePlan(lignes: readonly LigneReprise[]): { comptes: CompteRepris[]; douteux: CompteDouteux[] } {
  const libelles = new Map<string, Map<string, number>>();
  const occurrences = new Map<string, number>();
  const douteux = new Map<string, CompteDouteux>();
  for (const { valeurs } of lignes) {
    const r = examiner(valeurs.compteNum);
    if ('motif' in r) {
      if (!douteux.has(valeurs.compteNum)) douteux.set(valeurs.compteNum, { numero: valeurs.compteNum, motif: r.motif });
      continue;
    }
    occurrences.set(r.numero, (occurrences.get(r.numero) ?? 0) + 1);
    const lib = valeurs.compteLib.trim();
    const parLibelle = libelles.get(r.numero) ?? new Map<string, number>();
    if (lib !== '') parLibelle.set(lib, (parLibelle.get(lib) ?? 0) + 1);
    libelles.set(r.numero, parLibelle);
  }
  const comptes = [...occurrences.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([numero, nb]) => {
      // Le plus fréquent d'abord ; à égalité, l'ordre alphabétique.
      const tries = [...(libelles.get(numero) ?? new Map<string, number>()).entries()].sort(
        ([la, na], [lb, nbb]) => nbb - na || (la < lb ? -1 : la > lb ? 1 : 0),
      );
      return {
        numero,
        libelle: tries[0]?.[0] ?? '',
        libellesDivergents: tries.slice(1).map(([l]) => l),
        occurrences: nb,
      };
    });
  return { comptes, douteux: [...douteux.values()] };
}

/** Écriture d'à-nouveaux en brouillon, refusée si elle n'est pas équilibrée au centime. Soldes nuls omis. */
export function reconstruireANouveaux(
  balance: readonly SoldeBalance[],
  date: string,
  journal = 'AN',
): { ecriture: Ecriture | null; douteux: CompteDouteux[] } {
  if (!estDateValide(date)) throw new ErreurReprise('date_invalide');
  const douteux: CompteDouteux[] = [];
  const retenus: { numero: string; solde: Centimes }[] = [];
  for (const { compte, solde } of balance) {
    const r = examiner(compte);
    if ('motif' in r) douteux.push({ numero: compte, motif: r.motif });
    else if (solde !== 0) retenus.push({ numero: r.numero, solde });
  }
  const total = retenus.reduce((s, l) => ajouter(s, l.solde), centimes(0));
  if (total !== 0) throw new ErreurReprise('desequilibre');
  if (retenus.length === 0) return { ecriture: null, douteux };
  retenus.sort((a, b) => (a.numero < b.numero ? -1 : a.numero > b.numero ? 1 : 0));
  const lignes: LigneEcriture[] = retenus.map((l) => ({
    compte: l.numero,
    libelle: 'À-nouveaux',
    debit: centimes(Math.max(l.solde, 0)),
    credit: centimes(Math.max(-l.solde, 0)),
  }));
  return { ecriture: { id: `an-${date}`, journal, date, statut: 'brouillon', lignes }, douteux };
}
