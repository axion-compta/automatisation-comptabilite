// Relevé d'une plateforme d'encaissement : reconnu à ses colonnes brut, frais et net, puis refusé avec une explication.
// Aucune ligne n'est importée : la décomposition est prévue plus tard. Le relevé bancaire reste la source des écritures.

export type RefusPlateforme = {
  code: 'releve_plateforme';
  explication: string;
  marcheASuivre: string[];
};

export type ResultatPlateforme =
  | { reconnu: false }
  | { reconnu: true; refus: RefusPlateforme; lignesImportees: never[]; lignesIgnorees: number };

const EXPLICATION =
  'Ce fichier ressemble à un relevé de plateforme d’encaissement (montants bruts, frais et nets). Il ne peut pas être importé comme un relevé bancaire : aucune ligne n’a été créée.';
const MARCHE = [
  'Importez le relevé bancaire du compte où les versements de la plateforme arrivent.',
  'Gardez le relevé de la plateforme comme pièce justificative.',
];

function mots(entete: string): string[] {
  return entete
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((m) => m !== '');
}

export function detecterPlateforme(entetes: readonly string[], lignes: readonly (readonly string[])[]): ResultatPlateforme {
  const tous = new Set(entetes.flatMap(mots));
  if (!(tous.has('brut') && tous.has('frais') && tous.has('net'))) return { reconnu: false };
  return {
    reconnu: true,
    refus: { code: 'releve_plateforme', explication: EXPLICATION, marcheASuivre: [...MARCHE] },
    lignesImportees: [],
    lignesIgnorees: lignes.length,
  };
}
