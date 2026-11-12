// Version du plan comptable selon la date d'OUVERTURE de l'exercice. Pur : les versions viennent des paramètres.
// Dates AAAA-MM-JJ, début inclus, fin exclue.

export interface VersionPcg {
  id: string;
  debut: string;
  fin: string | null;
  prefixesSupprimes: readonly string[];
  compteSubvention: string;
}

export type CodeErreurVersionPcg = 'version_inconnue' | 'version_ambigue' | 'date_invalide' | 'numero_invalide';

export class ErreurVersionPcg extends Error {
  override name = 'ErreurVersionPcg';
  readonly code: CodeErreurVersionPcg;
  constructor(code: CodeErreurVersionPcg) {
    super(code);
    this.code = code;
  }
}

export type ResultatCompte = { ok: true } | { ok: false; code: 'compte_supprime' };

function dateIso(s: string): void {
  const d = new Date(`${s}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) {
    throw new ErreurVersionPcg('date_invalide');
  }
}

export function versionPcg(debutExercice: string, versions: readonly VersionPcg[]): VersionPcg {
  dateIso(debutExercice);
  const trouvees = versions.filter((v) => v.debut <= debutExercice && (v.fin === null || debutExercice < v.fin));
  const [premiere, ...autres] = trouvees;
  if (premiere === undefined) throw new ErreurVersionPcg('version_inconnue');
  if (autres.length > 0) throw new ErreurVersionPcg('version_ambigue');
  return premiere;
}

export function verifierCompteSelonVersion(numero: string, version: VersionPcg): ResultatCompte {
  if (!/^\d+$/.test(numero)) throw new ErreurVersionPcg('numero_invalide');
  return version.prefixesSupprimes.some((p) => numero.startsWith(p)) ? { ok: false, code: 'compte_supprime' } : { ok: true };
}

export function compteSubvention(version: VersionPcg): string {
  return version.compteSubvention;
}

/** Plan de l'exercice : une version sans compte supprimé garde le plan tel quel (aucun compte retiré ni renommé). */
export function planDeLExercice(
  exercice: { debut: string },
  planFige: { versions: readonly VersionPcg[]; comptes: readonly string[] },
): { version: VersionPcg; comptes: string[] } {
  const version = versionPcg(exercice.debut, planFige.versions);
  const comptes = planFige.comptes.filter((c) => verifierCompteSelonVersion(c, version).ok);
  return { version, comptes };
}
