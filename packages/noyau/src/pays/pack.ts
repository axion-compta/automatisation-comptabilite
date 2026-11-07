// Le modèle est prêt pour plusieurs pays ; le traitement reste France seule.
// Aucune liste de pays ici : elle vient des packs actifs reçus.

export interface PackPays {
  pays: string;
  fichierAudit: 'fec' | 'autre';
  declarations: readonly string[];
  regles: readonly { cle: string; validateur?: string }[];
  bancVert: boolean;
}

export class ErreurPays extends Error {
  readonly code = 'pays_en_double';
  constructor(message: string) {
    super(message);
    this.name = 'ErreurPays';
  }
}

export type ResultatPack =
  | { ok: true; pack: PackPays }
  | { ok: false; code: 'pays_invalide' | 'pays_non_disponible' };

export type ResultatActivation =
  | { ok: true }
  | { ok: false; reglesSansValidateur: string[]; bancVert: boolean };

const CODE_PAYS = /^[A-Z]{2}$/;

function sansDoublon(packs: readonly PackPays[]): void {
  const vus = new Set<string>();
  for (const p of packs) {
    if (vus.has(p.pays)) throw new ErreurPays('Deux packs pour le même pays.');
    vus.add(p.pays);
  }
}

export function packPour(paysFiscal: string, packsActifs: readonly PackPays[]): ResultatPack {
  if (!CODE_PAYS.test(paysFiscal)) return { ok: false, code: 'pays_invalide' };
  sansDoublon(packsActifs);
  const pack = packsActifs.find((p) => p.pays === paysFiscal);
  return pack === undefined ? { ok: false, code: 'pays_non_disponible' } : { ok: true, pack };
}

export function activable(pack: PackPays): ResultatActivation {
  const reglesSansValidateur = pack.regles
    .filter((r) => r.validateur === undefined || r.validateur.trim() === '')
    .map((r) => r.cle);
  if (reglesSansValidateur.length === 0 && pack.bancVert) return { ok: true };
  return { ok: false, reglesSansValidateur, bancVert: pack.bancVert };
}

export function paysDisponibles(packsActifs: readonly PackPays[]): string[] {
  sansDoublon(packsActifs);
  return packsActifs.map((p) => p.pays).sort();
}
