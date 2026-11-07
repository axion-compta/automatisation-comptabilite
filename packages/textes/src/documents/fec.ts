// Textes du FEC (V3-FEC-010, V3-FEC-012, V3-QUA-028, V3-IMP-032). Convention : objets de chaînes, vouvoiement.
// Les choix techniques (séparateur, encodage, marque d'ordre) sont à confirmer : la notice les reçoit en
// paramètre et ne les affirme pas. Aucune phrase ne dit que le fichier est accepté par l'administration.

export interface JournalFec {
  code: string;
  libelle: string;
}

export interface ParametresNoticeFec {
  journaux: JournalFec[];
  numerotation: 'par_journal' | 'continue';
  journalANouveaux: string;
  conventionSansPiece: string;
  separateurNom: string;
  encodageNom: string;
  marqueOrdre: boolean;
}

export interface NoticeFec {
  titre: string;
  rubriques: { titre: string; texte: string }[];
}

export function encadreFec(nombreRegles: number): string {
  if (!Number.isInteger(nombreRegles) || nombreRegles < 0) {
    throw new RangeError('nombreRegles doit être un entier positif ou nul');
  }
  const regles = nombreRegles <= 1 ? `${nombreRegles} règle vérifiée` : `${nombreRegles} règles vérifiées`;
  return `Préparé par IA à partir de vos opérations validées. Contrôle de structure : ${regles}. À faire vérifier par votre expert-comptable avant toute remise à l'administration. Conservez vos justificatifs originaux.`;
}

export function noticeFec(p: ParametresNoticeFec): NoticeFec {
  const journaux = p.journaux.length === 0 ? 'Aucun journal dans ce fichier.' : p.journaux.map((j) => `${j.code} : ${j.libelle}`).join(' ; ');
  const numerotation = p.numerotation === 'par_journal' ? 'La numérotation des écritures repart à chaque journal.' : 'La numérotation des écritures est continue sur tout le fichier.';
  const marque = p.marqueOrdre ? 'Une marque d’ordre est ajoutée à chaque écriture.' : 'Aucune marque d’ordre n’est ajoutée.';
  return {
    titre: 'Notice du fichier des écritures comptables',
    rubriques: [
      { titre: 'Journaux', texte: journaux },
      { titre: 'Mode de numérotation', texte: `${numerotation} ${marque}` },
      { titre: 'Repérage des à-nouveaux', texte: `Les à-nouveaux sont repérés par le journal ${p.journalANouveaux}.` },
      { titre: 'Opérations sans pièce', texte: p.conventionSansPiece },
      { titre: 'Sens de ValidDate', texte: 'La colonne ValidDate indique la date de validation de l’écriture dans votre espace.' },
      { titre: 'Encodage', texte: `Le fichier est écrit en ${p.encodageNom}.` },
      { titre: 'Séparateur', texte: `Les colonnes sont séparées par ${p.separateurNom}.` },
    ],
  };
}

export const rapportFec = {
  titre: 'Rapport de contrôle du fichier',
  prepareParIa: 'Préparé par IA',
  totaux: 'Totaux',
  totalDebit: 'Total des débits',
  totalCredit: 'Total des crédits',
  nombreLignes: 'Nombre de lignes',
  empreinte: 'Empreinte du fichier',
  versions: 'Versions du fichier',
  versionActuelle: 'Version actuelle',
  versionRemplacee: 'Version remplacée',
} as const;
