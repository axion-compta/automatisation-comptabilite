// Lecture d'un relevé CAMT.053 déjà analysé en arbre XML : un relevé par `Stmt`. Montants signés par `CdtDbtInd`.
// Un statut inconnu ne donne jamais `completee`. Aucune erreur ne contient l'IBAN ni un extrait du fichier.
import type { Centimes } from '../../argent/index.js';
import type { EtatTechnique, LigneLue, ReleveLu } from '../types.js';
import { ErreurDate, lireDate } from './dates.js';
import { ErreurMontant, lireMontant } from './montants.js';
import { trouver, trouverTous, type NoeudXml } from './xml.js';

type CodeCamt = 'pas_un_camt053' | 'montant_illisible' | 'devise_absente' | 'date_invalide' | 'solde_ambigu';

export class ErreurCamt extends Error {
  override name = 'ErreurCamt';
  readonly code: CodeCamt;
  /** Rang de la ligne en cause (1 = première ligne du relevé), 0 pour un solde ou le relevé entier. */
  readonly rang: number;
  constructor(code: CodeCamt, rang = 0) {
    super(code);
    this.code = code;
    this.rang = rang;
  }
}

const FORMAT = { decimal: '.', milliers: '' } as const;
const ETATS: Record<string, EtatTechnique> = { BOOK: 'completee', PDNG: 'en_attente', RJCT: 'rejetee' };
const texte = (n: NoeudXml, chemin: string[]): string => trouver(n, chemin)?.texte ?? '';

function montantSigne(amt: NoeudXml | undefined, sens: string, rang: number): Centimes {
  const brut = amt?.texte ?? '';
  try {
    if (!/^\d+(\.\d+)?$/.test(brut) || (sens !== 'CRDT' && sens !== 'DBIT')) throw new ErreurMontant('non_numerique');
    const v = lireMontant(brut, FORMAT);
    return (sens === 'DBIT' ? 0 - v : v) as Centimes;
  } catch (e) {
    if (e instanceof ErreurMontant) throw new ErreurCamt('montant_illisible', rang);
    throw e;
  }
}

function date(n: NoeudXml | undefined, rang: number): string | undefined {
  if (n === undefined) return undefined;
  try {
    return lireDate(texte(n, ['Dt']) || texte(n, ['DtTm']), 'AAAA-MM-JJ');
  } catch (e) {
    if (e instanceof ErreurDate) throw new ErreurCamt('date_invalide', rang);
    throw e;
  }
}

function devise(amt: NoeudXml | undefined, rang: number): string {
  const d = amt?.attributs['Ccy'] ?? '';
  if (d === '') throw new ErreurCamt('devise_absente', rang);
  return d;
}

function soldes(stmt: NoeudXml): { ouverture?: Centimes; cloture?: Centimes } {
  const r: { ouverture?: Centimes; cloture?: Centimes } = {};
  for (const b of stmt.enfants.filter((e) => e.nom === 'Bal')) {
    const cd = texte(b, ['Tp', 'CdOrPrtry', 'Cd']);
    const cle = cd === 'OPBD' ? 'ouverture' : cd === 'CLBD' ? 'cloture' : undefined;
    if (cle === undefined) continue;
    if (r[cle] !== undefined) throw new ErreurCamt('solde_ambigu');
    r[cle] = montantSigne(trouver(b, ['Amt']), texte(b, ['CdtDbtInd']), 0);
  }
  return r;
}

function ligne(n: NoeudXml, rang: number): LigneLue {
  const amt = trouver(n, ['Amt']);
  const montant = montantSigne(amt, texte(n, ['CdtDbtInd']), rang);
  const dateOperation = date(trouver(n, ['BookgDt']), rang);
  if (dateOperation === undefined) throw new ErreurCamt('date_invalide', rang);
  const dateValeur = date(trouver(n, ['ValDt']), rang);
  const sts = texte(n, ['Sts']) || texte(n, ['Sts', 'Cd']);
  const libelle = [...trouverTous(n, 'Ustrd').map((u) => u.texte), texte(n, ['AddtlNtryInf'])].filter((s) => s !== '').join(' ');
  const reference = texte(n, ['NtryDtls', 'TxDtls', 'Refs', 'EndToEndId']);
  return {
    rang, dateOperation, montant, devise: devise(amt, rang), libelleBrut: libelle,
    etatTechnique: Object.hasOwn(ETATS, sts) ? (ETATS[sts] as EtatTechnique) : 'en_attente',
    ...(dateValeur !== undefined ? { dateValeur } : {}),
    ...(reference !== '' ? { reference } : {}),
  };
}

export function lireCamt053(racine: NoeudXml): ReleveLu[] {
  const releves = (trouver(racine, ['BkToCstmrStmt']) ?? { enfants: [] as NoeudXml[] }).enfants.filter((e) => e.nom === 'Stmt');
  if (releves.length === 0) throw new ErreurCamt('pas_un_camt053');
  return releves.map((stmt) => {
    const lignes = stmt.enfants.filter((e) => e.nom === 'Ntry').map((n, i) => ligne(n, i + 1));
    const s = soldes(stmt);
    const premier = trouver(stmt, ['Bal', 'Amt']);
    const dev = texte(stmt, ['Acct', 'Ccy']) || lignes[0]?.devise || premier?.attributs['Ccy'] || '';
    if (dev === '') throw new ErreurCamt('devise_absente');
    const iban = texte(stmt, ['Acct', 'Id', 'IBAN']);
    return {
      devise: dev, lignes, rejets: [],
      ...(iban !== '' ? { ibanBrut: iban } : {}),
      ...(s.ouverture !== undefined ? { soldeOuverture: s.ouverture } : {}),
      ...(s.cloture !== undefined ? { soldeCloture: s.cloture } : {}),
    };
  });
}
