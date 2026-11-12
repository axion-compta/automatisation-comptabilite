// Types de documents d'une reprise de dossier : liste fermée, classement par le nom.

export const TYPES_DOCUMENT = [
  'fec', 'balance', 'grand_livre', 'bilan', 'compte_de_resultat', 'liasse', 'releve', 'statuts', 'autre',
] as const;
export type TypeDocument = (typeof TYPES_DOCUMENT)[number];
export type TypeClasse = TypeDocument | 'a_classer';

export const estTypeDocument = (v: unknown): v is TypeDocument => TYPES_DOCUMENT.includes(v as TypeDocument);

// Ordre significatif : « compte de résultat » avant « bilan », « grand livre » avant « livre ».
const MOTIFS: readonly (readonly [TypeDocument, RegExp])[] = [
  ['fec', /(^|[^a-z])fec([^a-z]|$)|fichier des ecritures/],
  ['grand_livre', /grand[ _-]?livre|(^|[^a-z])gl([^a-z]|$)/],
  ['balance', /balance/],
  ['compte_de_resultat', /compte[ _-]?de[ _-]?resultat/],
  ['liasse', /liasse/],
  ['bilan', /bilan/],
  ['releve', /releve/],
  ['statuts', /statuts?([^a-z]|$)/],
];

/** Type d'après le nom (accents et casse ignorés) ; le type MIME n'écarte que les images et vidéos. */
export function classerDocument(nom: string, typeMime: string): TypeClasse {
  if (typeof nom !== 'string' || nom.trim() === '') return 'a_classer';
  if (typeof typeMime === 'string' && /^(image|video|audio)\//.test(typeMime)) return 'a_classer';
  const n = nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  for (const [type, motif] of MOTIFS) if (motif.test(n)) return type;
  return 'a_classer';
}
