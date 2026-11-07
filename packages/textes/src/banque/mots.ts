// Textes du bloc banque : mots simples, vouvoiement. Montants et dates arrivent DÉJÀ formatés : aucun calcul ici.
export type EtatLigne =
  | 'RAPPROCHEE'
  | 'PROPOSEE'
  | 'DOUTEUSE'
  | 'SANS_PIECE'
  | 'A_QUALIFIER'
  | 'SANS_PIECE_REQUISE'
  | 'NEUTRALISEE'
  | 'PERSO'
  | 'IGNOREE';
export type CodeExplication =
  | 'rattache'
  | 'propose'
  | 'hesite'
  | 'sans_piece'
  | 'a_qualifier'
  | 'neutralisee'
  | 'ignoree';
export interface ValeursExplication {
  objet?: string;
  piece?: string;
  autrePiece?: string;
  tiers?: string;
  montant?: string;
}

const LIBELLES: Record<EtatLigne, string> = {
  RAPPROCHEE: 'Rattachée',
  PROPOSEE: 'Proposée',
  DOUTEUSE: 'À vérifier',
  SANS_PIECE: 'Sans facture',
  A_QUALIFIER: 'À préciser',
  SANS_PIECE_REQUISE: 'Aucune facture nécessaire',
  NEUTRALISEE: 'Neutralisée',
  PERSO: 'Dépense personnelle',
  IGNOREE: 'Ignorée',
};
export const ETATS_LIGNE = Object.keys(LIBELLES) as EtatLigne[];
export const etatLigne = (etat: EtatLigne): string => LIBELLES[etat];

const nomPropre = (t?: string): string => (t ?? '').trim();
const de = (t?: string): string => {
  const n = nomPropre(t);
  return n === '' ? '' : /^[aeiouyhàâéèêîôù]/i.test(n) ? ` d'${n}` : ` de ${n}`;
};
const maj = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);
const pluriel = (n: number, un: string, plusieurs: string): string => (n === 0 || n === 1 ? un : plusieurs);

export function explication(code: CodeExplication, v: ValeursExplication = {}): string {
  const objet = v.objet ?? 'cette ligne';
  const facture = `la facture ${v.piece ?? ''}${de(v.tiers)}`;
  switch (code) {
    case 'rattache':
      return `Je rattache ${objet} à ${facture}.`;
    case 'propose':
      return `Je vous propose de rattacher ${objet} à ${facture}.`;
    case 'hesite': {
      const somme = v.montant ? ` de ${v.montant}` : '';
      return `${maj(objet)}${somme}${de(v.tiers)} paie-t-il la facture ${v.piece ?? ''} ou ${v.autrePiece ?? ''} ?`;
    }
    case 'sans_piece':
      return `Je ne trouve aucune facture pour ${objet}.`;
    case 'a_qualifier':
      return `Indiquez-moi à quoi correspond ${objet}.`;
    case 'neutralisee':
      return `Vous avez neutralisé ${objet} : il ne compte plus.`;
    case 'ignoree':
      return `Vous avez choisi d'ignorer ${objet}.`;
  }
}

export function facteur(nom: string, v: Record<string, string | number> = {}): string {
  const jours = Number(v.jours);
  switch (nom) {
    case 'montant':
      return `${v.montant ?? ''} des deux côtés`;
    case 'delai':
      return `payé ${jours} ${pluriel(jours, 'jour', 'jours')} après la facture`;
    case 'reference':
      return `la référence ${v.reference ?? ''} figure dans le libellé`;
    case 'alias':
      return `le nom ${v.alias ?? ''} est reconnu`;
    default:
      return nom;
  }
}

export type CodeQuestionImport = 'format_date' | 'quel_compte' | 'profil_a_choisir';
const QUESTIONS: Record<CodeQuestionImport, { question: string; reponses: string[] }> = {
  format_date: {
    question: 'Les dates de ce fichier sont-elles écrites jour, mois, année ?',
    reponses: ['Oui, jour puis mois', 'Non, mois puis jour'],
  },
  quel_compte: { question: 'À quel compte bancaire ce fichier correspond-il ?', reponses: [] },
  profil_a_choisir: { question: 'Quel modèle de fichier votre banque utilise-t-elle ?', reponses: [] },
};
export const questionImport = (code: CodeQuestionImport): { question: string; reponses: string[] } => QUESTIONS[code];

export const alerteReleveManquant = (nomMois: string, banque?: string): string =>
  `Il manque le relevé de ${nomMois}${nomPropre(banque) === '' ? '' : ` (${nomPropre(banque)})`}.`;

export function controleSolde(etat: 'verifie' | 'ecart' | 'impossible', ecartTexte?: string): string {
  if (etat === 'verifie') return 'Le solde de ce relevé est vérifié.';
  if (etat === 'impossible') return 'Je ne peux pas vérifier le solde de ce relevé';
  return ecartTexte
    ? `Le solde de ce relevé ne correspond pas : écart de ${ecartTexte}.`
    : 'Le solde de ce relevé ne correspond pas.';
}

export const dejaImporte = (dateTexte: string): string => `Ce relevé est déjà importé (le ${dateTexte})`;

export function demandeFacturesManquantes(nombre: number, fournisseur: string, totalTexte: string): string {
  const chez = de(fournisseur);
  if (nombre === 0) return `Il ne manque aucune facture${chez}.`;
  return `Il manque ${nombre} ${pluriel(nombre, 'facture', 'factures')}${chez} (${totalTexte} au total).`;
}

export const reponsesPretes = [
  "Oui, c'est bien cela",
  "Non, ce n'est pas cela",
  'Je ne sais pas',
  'Plus tard',
] as const;
export const estimation = 'estimation';
export const ribChange = (fournisseur: string): string =>
  `Le RIB${nomPropre(fournisseur) === '' ? ' de ce fournisseur' : ` de ${nomPropre(fournisseur)}`} a changé : confirmez par téléphone au numéro habituel avant de payer.`;
