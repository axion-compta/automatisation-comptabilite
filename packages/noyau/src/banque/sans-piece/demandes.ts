// Un fait = une demande : regroupe les lignes sans pièce par contrepartie et type. Aucun texte affiché.
import { ajouter, centimes, type Centimes } from '../../argent/index.js';

export class ErreurDemandes extends Error {
  constructor(readonly code: 'montant_invalide' | 'maximum_invalide') {
    super(code);
    this.name = 'ErreurDemandes';
  }
}

export type LigneSansPiece = {
  readonly id: string;
  readonly montant: Centimes;
  readonly contrepartieId?: string | undefined;
  readonly libelleNormalise: string;
  readonly type: string;
  readonly etat: string;
};
export type Reponse = 'je_les_depose' | 'ou_les_trouver' | 'pas_de_facture' | 'c_est_personnel';
export type Demande = {
  readonly cle: string;
  readonly ligneIds: readonly string[];
  readonly impact: Centimes;
  readonly nombre: number;
  readonly type: string;
  readonly codeQuestion: 'factures_manquantes' | 'a_qualifier';
  readonly reponsesPretes: readonly Reponse[];
};

const REPONSES: readonly Reponse[] = ['je_les_depose', 'ou_les_trouver', 'pas_de_facture', 'c_est_personnel'];
const comparer = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const cleDe = (x: LigneSansPiece): string =>
  (x.contrepartieId !== undefined && x.contrepartieId !== '' ? 'c:' + x.contrepartieId : 'l:' + x.libelleNormalise) + '|' + x.type;

export function regrouper(lignes: readonly LigneSansPiece[]): Demande[] {
  const groupes = new Map<string, LigneSansPiece[]>();
  for (const x of lignes) {
    if (x.etat !== 'SANS_PIECE' && x.etat !== 'A_QUALIFIER') continue;
    if (!Number.isSafeInteger(x.montant)) throw new ErreurDemandes('montant_invalide');
    const cle = cleDe(x);
    groupes.set(cle, [...(groupes.get(cle) ?? []), x]);
  }
  const demandes = [...groupes].map(([cle, membres]): Demande => {
    let impact = centimes(0);
    for (const m of membres) impact = ajouter(impact, centimes(Math.abs(m.montant)));
    return {
      cle,
      ligneIds: membres.map((m) => m.id).sort(comparer),
      impact,
      nombre: membres.length,
      type: membres[0]?.type ?? '',
      codeQuestion: membres.every((m) => m.etat === 'SANS_PIECE') ? 'factures_manquantes' : 'a_qualifier',
      reponsesPretes: REPONSES,
    };
  });
  return demandes.sort((a, b) => b.impact - a.impact || comparer(a.cle, b.cle));
}

export function cartesAccueil(demandes: readonly Demande[], maximum: number): Demande[] {
  if (!Number.isSafeInteger(maximum) || maximum < 0) throw new ErreurDemandes('maximum_invalide');
  return demandes.slice(0, maximum);
}
