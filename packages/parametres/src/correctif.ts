// Paquet correctif (spec 09 §03 règle 7) : la ligne fausse passe à `retire`, jamais modifiée ; une ligne corrigée est ajoutée.
// Fonctions pures. Aucune valeur légale ici.
import type { ParametreSource } from './source.js';

export type CodeErreurCorrectif =
  | 'ligne_introuvable'
  | 'retrait_sans_remplacement'
  | 'validateur_absent'
  | 'motif_vide'
  | 'version_deja_appliquee';

export class ErreurCorrectif extends Error {
  readonly code: CodeErreurCorrectif;
  constructor(code: CodeErreurCorrectif, detail = '') {
    super(detail === '' ? code : `${code} : ${detail}`);
    this.name = 'ErreurCorrectif';
    this.code = code;
  }
}

export interface PaquetCorrectif {
  version: string;
  date: string;
  motif: string;
  validateur: { id: string; type: 'personne' };
  retraits: { cle: string; effet_debut: string }[];
  ajouts: ParametreSource[];
}

/** Nouveau catalogue ; l'entrée n'est jamais modifiée. `versionsAppliquees` : registre des versions déjà passées. */
export function appliquerPaquet(
  catalogue: readonly ParametreSource[],
  paquet: PaquetCorrectif,
  versionsAppliquees: readonly string[],
): ParametreSource[] {
  const v = paquet.validateur as Partial<PaquetCorrectif['validateur']> | undefined;
  if (v === undefined || v === null || typeof v.id !== 'string' || v.id.trim() === '' || v.type !== 'personne') {
    throw new ErreurCorrectif('validateur_absent');
  }
  if (paquet.motif.trim() === '') throw new ErreurCorrectif('motif_vide');
  if (versionsAppliquees.includes(paquet.version)) throw new ErreurCorrectif('version_deja_appliquee', paquet.version);
  const vise = (l: ParametreSource, r: { cle: string; effet_debut: string }): boolean =>
    l.cle === r.cle && l.effet_debut === r.effet_debut;
  for (const r of paquet.retraits) {
    const cible = `${r.cle} ${r.effet_debut}`;
    if (!catalogue.some((l) => l.statut !== 'retire' && vise(l, r))) throw new ErreurCorrectif('ligne_introuvable', cible);
    if (!paquet.ajouts.some((a) => vise(a, r))) throw new ErreurCorrectif('retrait_sans_remplacement', cible);
  }
  const sortie = catalogue.map((l) =>
    paquet.retraits.some((r) => vise(l, r)) ? { ...l, statut: 'retire' as const } : { ...l },
  );
  return [...sortie, ...paquet.ajouts.map((a) => ({ ...a }))];
}

export interface ObjetSociete {
  type: 'brouillon' | 'declaration_non_deposee' | 'ecriture_validee' | 'periode_deposee';
  date: string;
  periode?: string;
  cle?: string;
}
export interface ImpactSociete {
  brouillons: number;
  declarationsNonDeposees: string[];
  ecrituresValideesTouchees: number;
  periodesDeposeesTouchees: string[];
  regularisationProposee: boolean;
  carte: boolean;
}

const idLigne = (l: ParametreSource): string => `${l.cle}|${l.pays}|${l.effet_debut}`;

/** Impact par société (clé = id). Seules les dates à partir de l'effet comptent ; rien n'est modifié, une régularisation est proposée. */
export function rapportImpact(
  ancien: readonly ParametreSource[],
  nouveau: readonly ParametreSource[],
  societes: readonly { id: string; objets: readonly ObjetSociete[] }[],
): Record<string, ImpactSociete> {
  const avant = new Map(ancien.map((l) => [idLigne(l), l.statut]));
  const effets = nouveau
    .filter((l) => l.statut === 'retire' && avant.get(idLigne(l)) !== 'retire')
    .map((l) => ({ cle: l.cle, debut: l.effet_debut }));
  const touche = (o: ObjetSociete): boolean =>
    effets.some((e) => (o.cle === undefined || o.cle === e.cle) && o.date >= e.debut);
  const rapport: Record<string, ImpactSociete> = {};
  for (const s of societes) {
    const t = s.objets.filter(touche);
    const periodes = (type: ObjetSociete['type']): string[] =>
      t.filter((o) => o.type === type).map((o) => o.periode ?? o.date);
    const ecritures = t.filter((o) => o.type === 'ecriture_validee').length;
    const deposees = periodes('periode_deposee');
    rapport[s.id] = {
      brouillons: t.filter((o) => o.type === 'brouillon').length,
      declarationsNonDeposees: periodes('declaration_non_deposee'),
      ecrituresValideesTouchees: ecritures,
      periodesDeposeesTouchees: deposees,
      regularisationProposee: ecritures > 0 || deposees.length > 0,
      carte: t.length > 0,
    };
  }
  return rapport;
}
