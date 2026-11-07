// Rapport de gestion annuel de la SCI prérempli : six rubriques, chaque chiffre relié à ses écritures (V3-JUR-014).
// Aucun numéro de compte ici : les comptes de chaque rubrique arrivent dans la table.
import { type Centimes, ajouter, centimes, soustraire } from '../argent/index.js';
import { type Ecriture, verifierEquilibre } from '../ecritures/modele.js';

export type CodeRapportSci = 'compte_dans_deux_postes' | 'ecriture_desequilibree' | 'prefixe_vide';

export class ErreurRapportSci extends Error {
  override name = 'ErreurRapportSci';
  readonly code: CodeRapportSci;
  constructor(code: CodeRapportSci, message: string) {
    super(message);
    this.code = code;
  }
}

export interface PosteRubrique {
  code: string;
  prefixes: readonly string[];
  exclus: readonly string[];
  sens: 'debit' | 'credit';
}

export interface TableRubriques {
  loyers: PosteRubrique;
  charges: PosteRubrique;
  interets: PosteRubrique;
  capitalRestantDu: PosteRubrique;
  comptesCourants: PosteRubrique;
}

export interface SourceMontant {
  ecritureId: string;
  ligneIndex: number;
}
export interface MontantRapport {
  poste: string;
  centimes: Centimes;
  sources: readonly SourceMontant[];
}
export interface RubriqueRapport {
  code: 'activite' | 'loyers' | 'charges' | 'emprunts' | 'resultat' | 'comptes_courants';
  texte: string | null;
  montants: readonly MontantRapport[];
}
export interface RapportSci {
  rubriques: readonly RubriqueRapport[];
  mentions: readonly ['pas_de_depot_greffe'];
  pv: null;
  statut: 'brouillon';
  mention: 'prepare_par_ia';
}

const POSTES = ['loyers', 'charges', 'interets', 'capitalRestantDu', 'comptesCourants'] as const;
type Poste = (typeof POSTES)[number];

const correspond = (p: PosteRubrique, compte: string): boolean =>
  p.prefixes.some((x) => compte.startsWith(x)) && !p.exclus.some((x) => compte.startsWith(x));

const comparer = (a: SourceMontant, b: SourceMontant): number =>
  a.ecritureId === b.ecritureId ? a.ligneIndex - b.ligneIndex : a.ecritureId < b.ecritureId ? 0 - 1 : 1;

/** Prépare le brouillon de rapport à partir des seules écritures validées. Rien n'est déposé. */
export function preparerRapportSci(
  ecritures: readonly Ecriture[],
  table: TableRubriques,
  options: { activite: string | null },
): RapportSci {
  for (const poste of POSTES) {
    if ([...table[poste].prefixes, ...table[poste].exclus].includes('')) {
      throw new ErreurRapportSci('prefixe_vide', 'Un préfixe de compte vide est refusé');
    }
  }
  const totaux = new Map<Poste, { total: Centimes; sources: SourceMontant[] }>();
  for (const poste of POSTES) totaux.set(poste, { total: centimes(0), sources: [] });
  for (const e of ecritures.filter((x) => x.statut === 'valide')) {
    if (!verifierEquilibre(e).equilibree) {
      throw new ErreurRapportSci('ecriture_desequilibree', `Écriture déséquilibrée : ${e.id}`);
    }
    e.lignes.forEach((l, ligneIndex) => {
      const trouves = POSTES.filter((p) => correspond(table[p], l.compte));
      if (trouves.length > 1) {
        throw new ErreurRapportSci('compte_dans_deux_postes', `Compte dans deux postes : ${l.compte}`);
      }
      const poste = trouves[0];
      if (poste === undefined) return;
      const cible = totaux.get(poste)!;
      const delta = table[poste].sens === 'debit' ? soustraire(l.debit, l.credit) : soustraire(l.credit, l.debit);
      cible.total = ajouter(cible.total, delta);
      cible.sources.push({ ecritureId: e.id, ligneIndex });
    });
  }
  const montant = (poste: Poste): MontantRapport => {
    const { total, sources } = totaux.get(poste)!;
    return { poste: table[poste].code, centimes: total, sources: [...sources].sort(comparer) };
  };
  const [loyers, charges, interets] = [montant('loyers'), montant('charges'), montant('interets')];
  const resultat: MontantRapport = {
    poste: 'resultat',
    centimes: soustraire(soustraire(loyers.centimes, charges.centimes), interets.centimes),
    sources: [...loyers.sources, ...charges.sources, ...interets.sources].sort(comparer),
  };
  const texte = options.activite === null || options.activite.trim() === '' ? null : options.activite;
  return {
    rubriques: [
      { code: 'activite', texte, montants: [] },
      { code: 'loyers', texte: null, montants: [loyers] },
      { code: 'charges', texte: null, montants: [charges] },
      { code: 'emprunts', texte: null, montants: [montant('capitalRestantDu'), interets] },
      { code: 'resultat', texte: null, montants: [resultat] },
      { code: 'comptes_courants', texte: null, montants: [montant('comptesCourants')] },
    ],
    mentions: ['pas_de_depot_greffe'],
    pv: null,
    statut: 'brouillon',
    mention: 'prepare_par_ia',
  };
}
