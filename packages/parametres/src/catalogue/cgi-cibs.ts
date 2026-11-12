// Table de correspondance article par article : CGI vers CIBS (spec 09 §03, V3-TVA-024).
// Aucun numéro CIBS n'est tranché ici : un numéro non confirmé reste `null` et la ligne reste `a_verifier`.
// La date de bascule est la date de début de chaque ligne.

export interface CorrespondanceArticle {
  /** Numéro de l'article du CGI, tel qu'on le cite (ex. « 293 B »). */
  articleCgi: string;
  /** Numéro de l'article du CIBS ; null tant qu'il n'est pas confirmé. */
  articleCibs: string | null;
  /** AAAA-MM-JJ, inclus : première date à laquelle on cite le CIBS. */
  debut: string;
  statut: 'non_verifie' | 'a_verifier' | 'valide';
  source: string;
}

const DEBUT = '2027-01-01';
const SOURCE = 'Ordonnance n° 2025-1247 et ordonnance n° 2026-671 art. 49 ; numéros à vérifier (point P2)';

export const CORRESPONDANCE_CGI_CIBS: readonly CorrespondanceArticle[] = [
  {
    articleCgi: '293 B',
    articleCibs: 'L. 233-3',
    debut: DEBUT,
    statut: 'a_verifier',
    source: 'Légifrance retient L. 233-3 ; deux pages impots.gouv.fr divergent (L. 233-3 et L. 223-3) : ne pas trancher',
  },
  { articleCgi: '269', articleCibs: null, debut: DEBUT, statut: 'a_verifier', source: SOURCE },
  { articleCgi: '289 bis', articleCibs: null, debut: DEBUT, statut: 'a_verifier', source: SOURCE },
];
