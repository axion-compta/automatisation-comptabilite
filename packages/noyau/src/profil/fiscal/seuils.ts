import type { Centimes } from '../../argent/index.js';
import { ErreurProfil, exigerDate, type Confiance } from '../types.js';

export type NiveauSeuil = 'sous' | 'alerte' | 'depasse';
export type NiveauFranchise = 'sous' | 'alerte' | 'base_depasse' | 'majore_depasse';
export type EtatFranchise = { niveau: NiveauFranchise; aVerifier: boolean };
export type PropositionRegime = {
  type: 'nouvelle_ligne_regime_tva';
  motif: 'depassement_seuil';
  statut: 'propose';
  societeId: string;
  effetDebut: string;
  aVerifier: boolean;
};

const PDB_PLEIN = 10000;
const PDB_MIN = 1;

const positif = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n > 0;

function invalide(): never {
  throw new ErreurProfil('entree_invalide');
}

function verifier(ca: number, seuil: number, alertePdb: number): void {
  if (typeof ca !== 'number' || !Number.isSafeInteger(ca) || ca < 0) invalide();
  if (!positif(seuil)) invalide();
  if (!Number.isSafeInteger(alertePdb) || alertePdb < PDB_MIN || alertePdb > PDB_PLEIN) invalide();
}

/** Niveau du CA face à un seuil ; seuil et pourcentage d'alerte viennent des paramètres. */
export function niveauSeuil(
  caCentimes: Centimes,
  p: { seuilCentimes: Centimes; alertePdb: number },
): NiveauSeuil {
  verifier(caCentimes, p.seuilCentimes, p.alertePdb);
  if (caCentimes > p.seuilCentimes) return 'depasse';
  if (BigInt(caCentimes) * BigInt(PDB_PLEIN) >= BigInt(p.seuilCentimes) * BigInt(p.alertePdb)) return 'alerte';
  return 'sous';
}

export function etatFranchise(
  caCentimes: Centimes,
  p: { seuilBase: Centimes; seuilMajore: Centimes; alertePdb: number; statutParametre: Confiance },
): EtatFranchise {
  verifier(caCentimes, p.seuilBase, p.alertePdb);
  if (!positif(p.seuilMajore)) invalide();
  if (p.seuilMajore < p.seuilBase) throw new ErreurProfil('seuils_inverses');
  const aVerifier = p.statutParametre !== 'sur';
  if (caCentimes > p.seuilMajore) return { niveau: 'majore_depasse', aVerifier };
  if (caCentimes > p.seuilBase) return { niveau: 'base_depasse', aVerifier };
  const n = niveauSeuil(caCentimes, { seuilCentimes: p.seuilBase, alertePdb: p.alertePdb });
  return { niveau: n === 'alerte' ? 'alerte' : 'sous', aVerifier };
}

/** Propose (sans jamais appliquer) une nouvelle ligne de régime au dépassement du seuil majoré. */
export function propositionChangementRegime(
  etat: Readonly<EtatFranchise>,
  p: { societeId: string; dateEffet: string },
): PropositionRegime | null {
  if (etat.niveau !== 'majore_depasse') return null;
  return {
    type: 'nouvelle_ligne_regime_tva',
    motif: 'depassement_seuil',
    statut: 'propose',
    societeId: p.societeId,
    effetDebut: exigerDate(p.dateEffet, 'dateEffet'),
    aVerifier: etat.aVerifier,
  };
}
