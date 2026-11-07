// Lecture OFX 1 (SGML, balises souvent non fermées) et OFX 2 (XML) : un relevé par `STMTRS`. Le SGML est converti en arbre
// `NoeudXml`, puis lu comme l'OFX 2. Le solde d'ouverture n'existe pas dans ce format : il reste absent.
// Aucune erreur ne contient l'identifiant de compte ni un extrait du fichier.
import type { Centimes } from '../../argent/index.js';
import type { LigneLue, ReleveLu } from '../types.js';
import { ErreurDate, lireDate } from './dates.js';
import { ErreurMontant, lireMontant } from './montants.js';
import { trouver, trouverTous, type NoeudXml } from './xml.js';

type CodeOfx = 'pas_un_ofx' | 'montant_illisible' | 'date_illisible';

export class ErreurOfx extends Error {
  override name = 'ErreurOfx';
  readonly code: CodeOfx;
  /** Rang de l'opération en cause (1 = première du relevé), 0 pour un solde ou une période. */
  readonly rang: number;
  constructor(code: CodeOfx, rang = 0) {
    super(code);
    this.code = code;
    this.rang = rang;
  }
}

const FORMAT = { decimal: '.', milliers: '' } as const;
const ENTITES: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
const texte = (n: NoeudXml, chemin: string[]): string => trouver(n, chemin)?.texte ?? '';

/** SGML OFX 1 → arbre. Une balise vide est une feuille sauf si une balise fermante de même nom existe ailleurs. */
function sgmlVersArbre(source: string): NoeudXml {
  const debut = source.search(/<OFX>/i);
  if (debut < 0) throw new ErreurOfx('pas_un_ofx');
  const jetons = [...source.slice(debut).matchAll(/<(\/?)([A-Za-z][A-Za-z0-9._-]*)>([^<]*)/g)];
  const fermees = new Set(jetons.filter((j) => j[1] === '/').map((j) => j[2]));
  const sommet: NoeudXml = { nom: '', attributs: {}, enfants: [], texte: '' };
  const pile = [sommet];
  let feuille: string | undefined;
  for (const [, ferme, nom = '', valeur = ''] of jetons) {
    if (ferme === '/') {
      if (nom === feuille) feuille = undefined;
      else {
        const k = pile.map((n) => n.nom).lastIndexOf(nom);
        if (k < 1) throw new ErreurOfx('pas_un_ofx');
        pile.length = k;
      }
      continue;
    }
    const v = valeur.trim().replace(/&(lt|gt|amp|quot|apos);/g, (_, e: string) => ENTITES[e] ?? '');
    const noeud: NoeudXml = { nom, attributs: {}, enfants: [], texte: v };
    (pile[pile.length - 1] as NoeudXml).enfants.push(noeud);
    if (v === '' && fermees.has(nom)) {
      pile.push(noeud);
      feuille = undefined;
    } else feuille = nom;
  }
  if (pile.length > 1 || sommet.enfants.length !== 1) throw new ErreurOfx('pas_un_ofx');
  return sommet.enfants[0] as NoeudXml;
}

function montant(brut: string, rang: number): Centimes {
  try {
    if (!/^[+-]?\d+(\.\d+)?$/.test(brut)) throw new ErreurMontant('non_numerique');
    return lireMontant(brut, FORMAT);
  } catch (e) {
    if (e instanceof ErreurMontant) throw new ErreurOfx('montant_illisible', rang);
    throw e;
  }
}

function date(brut: string, rang: number): string {
  try {
    return lireDate(brut, /^\d{8}$/.test(brut) ? 'AAAAMMJJ' : 'AAAAMMJJHHMMSS');
  } catch (e) {
    if (e instanceof ErreurDate) throw new ErreurOfx('date_illisible', rang);
    throw e;
  }
}

export function lireOfx2(racine: NoeudXml): ReleveLu[] {
  const releves = racine.nom === 'OFX' ? trouverTous(racine, 'STMTRS') : [];
  if (releves.length === 0) throw new ErreurOfx('pas_un_ofx');
  return releves.map((rs) => {
    const devise = texte(rs, ['CURDEF']);
    if (devise === '') throw new ErreurOfx('pas_un_ofx');
    const lignes = trouverTous(rs, 'STMTTRN').map((t, i): LigneLue => {
      const rang = i + 1;
      const libelleBrut = [texte(t, ['NAME']), texte(t, ['MEMO'])].filter((s) => s !== '').join(' ');
      const idExterne = texte(t, ['FITID']);
      return {
        rang, devise, libelleBrut, etatTechnique: 'completee',
        dateOperation: date(texte(t, ['DTPOSTED']), rang), montant: montant(texte(t, ['TRNAMT']), rang),
        ...(idExterne !== '' ? { idExterne } : {}),
      };
    });
    const compte = texte(rs, ['BANKACCTFROM', 'ACCTID']);
    const [debut, fin, solde] = [texte(rs, ['BANKTRANLIST', 'DTSTART']), texte(rs, ['BANKTRANLIST', 'DTEND']), texte(rs, ['LEDGERBAL', 'BALAMT'])];
    return {
      devise, lignes, rejets: [],
      ...(compte !== '' ? { ibanBrut: compte } : {}),
      ...(debut !== '' ? { periodeDebut: date(debut, 0) } : {}),
      ...(fin !== '' ? { periodeFin: date(fin, 0) } : {}),
      ...(solde !== '' ? { soldeCloture: montant(solde, 0) } : {}),
    };
  });
}

export function lireOfx1(texteSgml: string): ReleveLu[] {
  return lireOfx2(sgmlVersArbre(texteSgml));
}
