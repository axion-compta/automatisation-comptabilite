// Choix de la référence légale à citer selon la date de l'opération (CGI avant la bascule, CIBS ensuite).
// Fonction pure : la table et ses dates viennent du catalogue des paramètres, aucune date ici.

/** Même forme que la table du catalogue (copie simple, le paquet des paramètres n'est pas importé). */
export interface LigneCorrespondance {
  articleCgi: string;
  articleCibs: string | null;
  /** AAAA-MM-JJ, inclus */
  debut: string;
  statut: 'non_verifie' | 'a_verifier' | 'valide';
}

export type Citation =
  | { texte: string; statut: LigneCorrespondance['statut'] }
  | { code: 'reference_inconnue' };

const FORME_DATE = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/;

function exigerDate(s: string): void {
  const m = FORME_DATE.exec(s);
  const d = m === null ? null : new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (m === null || d === null || d.toISOString().slice(0, 10) !== s) throw new Error('entree_invalide');
}

/**
 * Cite l'article du CGI avant la date de bascule de sa ligne, l'article du CIBS à partir d'elle.
 * Article absent de la table, ou numéro CIBS non confirmé après la bascule : `reference_inconnue`, jamais de citation inventée.
 */
export function citerReference(
  articleCgi: string,
  dateOperation: string,
  table: readonly LigneCorrespondance[],
): Citation {
  exigerDate(dateOperation);
  const ligne = table.find((l) => l.articleCgi === articleCgi);
  if (ligne === undefined) return { code: 'reference_inconnue' };
  if (dateOperation < ligne.debut) return { texte: `art. ${ligne.articleCgi} du CGI`, statut: ligne.statut };
  if (ligne.articleCibs === null) return { code: 'reference_inconnue' };
  return { texte: `art. ${ligne.articleCibs} du CIBS`, statut: ligne.statut };
}
