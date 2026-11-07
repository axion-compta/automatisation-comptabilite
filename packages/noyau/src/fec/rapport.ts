// Rapport de contrôle du FEC : codes et nombres seulement, aucun texte affiché.
import { empreinteSha256 } from '../documents/empreinte.js';
import type { Centimes } from '../argent/index.js';
import type { EcartFec } from './controles-structure.js';

export class ErreurRapportFec extends Error {
  override name = 'ErreurRapportFec';
  readonly code = 'nombre_invalide';
  constructor() {
    super('nombre_invalide');
  }
}

export interface EntreeRapportFec {
  octets: Uint8Array;
  ecarts: readonly EcartFec[];
  reglesVerifiees: number;
  reglesNonExecutees: readonly string[];
  totalDebit: Centimes;
  totalCredit: Centimes;
  nombreLignes: number;
  versionLogiciel: string;
  versionPaquet: string;
}

export interface RapportFec {
  mention: 'prepare_par_ia';
  reglesVerifiees: number;
  totalDebit: Centimes;
  totalCredit: Centimes;
  nombreLignes: number;
  sha256: string;
  versionLogiciel: string;
  versionPaquet: string;
  ecartsParRegle: { regleId: string; nombre: number; premiers: EcartFec[] }[];
  telechargementAutorise: boolean;
}

function entierPositif(n: number): boolean {
  return Number.isSafeInteger(n) && n >= 0;
}

export function rapportFec(entree: EntreeRapportFec, limiteParRegle: number): RapportFec {
  if (!entierPositif(entree.reglesVerifiees) || !entierPositif(limiteParRegle)) throw new ErreurRapportFec();
  const groupes = new Map<string, EcartFec[]>();
  for (const e of entree.ecarts) groupes.set(e.regleId, [...(groupes.get(e.regleId) ?? []), e]);
  const ecartsParRegle = [...groupes.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([regleId, liste]) => ({ regleId, nombre: liste.length, premiers: liste.slice(0, limiteParRegle) }));
  return {
    mention: 'prepare_par_ia',
    reglesVerifiees: entree.reglesVerifiees,
    totalDebit: entree.totalDebit,
    totalCredit: entree.totalCredit,
    nombreLignes: entree.nombreLignes,
    sha256: empreinteSha256(entree.octets),
    versionLogiciel: entree.versionLogiciel,
    versionPaquet: entree.versionPaquet,
    ecartsParRegle,
    telechargementAutorise: entree.ecarts.length === 0 && entree.reglesNonExecutees.length === 0,
  };
}
