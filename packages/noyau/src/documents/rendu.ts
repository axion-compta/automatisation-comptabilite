// Codes seulement : les phrases affichées vivent dans packages/textes.
import type { etatMention } from './mention.js';

type Mention = ReturnType<typeof etatMention>;

export const FAMILLES_DOCUMENT = [
  'bilan',
  'compte_resultat',
  'annexe',
  'balance',
  'grand_livre',
  'journaux',
  'declaration_preparee',
  'pv',
  'etat_rapprochement',
  'rapport_controles',
] as const;

export type FamilleDocument = (typeof FAMILLES_DOCUMENT)[number];
export type CodeErreurRendu = 'famille_inconnue' | 'collision_compagnon' | 'paquet_vide';

export class ErreurRendu extends Error {
  readonly code: CodeErreurRendu;
  constructor(code: CodeErreurRendu, message: string) {
    super(message);
    this.name = 'ErreurRendu';
    this.code = code;
  }
}

export type DocumentRendu = {
  famille: FamilleDocument;
  entete: { mention: Mention['mention'] };
  pied: { mention: Mention['mention']; validation?: { par: string; le: string } };
  filigrane: Mention['filigrane'];
  corps: string;
};

export function rendreDocument(entree: {
  famille: FamilleDocument;
  corps: string;
  mention: Mention;
}): DocumentRendu {
  if (!FAMILLES_DOCUMENT.includes(entree.famille)) {
    throw new ErreurRendu('famille_inconnue', 'Famille de document inconnue.');
  }
  const { mention, validation, filigrane } = entree.mention;
  return {
    famille: entree.famille,
    entete: { mention },
    pied: validation === undefined ? { mention } : { mention, validation },
    filigrane,
    corps: entree.corps,
  };
}

export type FichierExport = { nom: string; contenu: Uint8Array };

export function paquetSansZoneLibre(entree: {
  format: 'fec' | 'csv';
  fichiers: FichierExport[];
  mention: Mention;
}): {
  fichiers: FichierExport[];
  compagnon: { nom: 'LISEZMOI.txt'; mention: Mention };
  manifeste: { mention: Mention };
} {
  if (entree.fichiers.length === 0) throw new ErreurRendu('paquet_vide', 'Paquet vide.');
  if (entree.fichiers.some((f) => f.nom.toLowerCase() === 'lisezmoi.txt')) {
    throw new ErreurRendu('collision_compagnon', 'Nom réservé au fichier compagnon.');
  }
  return {
    fichiers: [...entree.fichiers],
    compagnon: { nom: 'LISEZMOI.txt', mention: entree.mention },
    manifeste: { mention: entree.mention },
  };
}
