// Texte du résumé quotidien (PR-R5, PR-R6). Vouvoiement. Seulement des nombres d'actions par catégorie :
// jamais de montant, jamais de nom de tiers.

export type CategorieResume = 'a_valider' | 'echeance' | 'urgent' | 'cabinet';

export const LIBELLES_RESUME: Record<CategorieResume, { un: string; plusieurs: string }> = {
  a_valider: { un: 'élément à valider', plusieurs: 'éléments à valider' },
  echeance: { un: 'échéance proche', plusieurs: 'échéances proches' },
  urgent: { un: 'point urgent', plusieurs: 'points urgents' },
  cabinet: { un: 'message du cabinet', plusieurs: 'messages du cabinet' },
};

export const SUJET_RESUME = 'Votre résumé du jour';

export interface ValeursResume {
  comptes: Readonly<Partial<Record<CategorieResume, number>>>;
  lienOuverture: string;
  lienDesinscription: string;
}

export function texteResume(v: ValeursResume): string {
  const lignes = (Object.keys(LIBELLES_RESUME) as CategorieResume[])
    .map((c) => ({ c, n: v.comptes[c] ?? 0 }))
    .filter((x) => Number.isSafeInteger(x.n) && x.n > 0)
    .map((x) => `- ${x.n} ${x.n === 1 ? LIBELLES_RESUME[x.c].un : LIBELLES_RESUME[x.c].plusieurs}`);
  return [
    'Bonjour,',
    '',
    'Voici ce qui vous attend aujourd’hui :',
    ...lignes,
    '',
    `Ouvrir l’application : ${v.lienOuverture}`,
    '',
    `Ne plus recevoir ce résumé : ${v.lienDesinscription}`,
  ].join('\n');
}
