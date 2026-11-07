// Dirigeants et associés : répartition des parts en points de base (entiers), part des personnes physiques.
import { ErreurProfil } from './types.js';

const TOTAL_PDB = 10000;

export type Associe = {
  id: string; nature: 'physique' | 'morale'; roles: ('gerant' | 'president' | 'associe')[]; partPdb: number;
};
export type MotifRepartition = 'somme_differente' | 'aucun_associe' | 'part_invalide' | 'associe_en_double';
export type Repartition = { valide: boolean; sommePdb: number; motif?: MotifRepartition };

const partValide = (p: unknown): p is number => typeof p === 'number' && Number.isSafeInteger(p) && p >= 0;

export function verifierRepartition(associes: readonly Associe[]): Repartition {
  if (!Array.isArray(associes) || associes.length === 0) return { valide: false, sommePdb: 0, motif: 'aucun_associe' };
  const sommePdb = associes.reduce((s, a) => (partValide(a.partPdb) ? s + a.partPdb : s), 0);
  if (!associes.every((a) => partValide(a.partPdb)) || !Number.isSafeInteger(sommePdb)) {
    return { valide: false, sommePdb, motif: 'part_invalide' };
  }
  if (new Set(associes.map((a) => a.id)).size !== associes.length) return { valide: false, sommePdb, motif: 'associe_en_double' };
  if (sommePdb !== TOTAL_PDB) return { valide: false, sommePdb, motif: 'somme_differente' };
  return { valide: true, sommePdb };
}

export function partPersonnesPhysiquesPdb(associes: readonly Associe[]): number {
  if (!verifierRepartition(associes).valide) throw new ErreurProfil('repartition_invalide');
  return associes.filter((a) => a.nature === 'physique').reduce((s, a) => s + a.partPdb, 0);
}

export function detentionAuMoins(associes: readonly Associe[], seuilPdb: number): boolean {
  if (typeof seuilPdb !== 'number' || !Number.isSafeInteger(seuilPdb) || seuilPdb < 0 || seuilPdb > TOTAL_PDB) {
    throw new ErreurProfil('seuil_invalide');
  }
  return partPersonnesPhysiquesPdb(associes) >= seuilPdb;
}
