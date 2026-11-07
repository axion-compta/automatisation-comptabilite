// Banc de pièces fictif à graine fixe (V3-PRI-017, V3-IMP-020). Aucune donnée réelle.
// Les taux sont INVENTÉS (fictif) et différents des taux légaux : points de base 1900, 1100 et 600.
import { creerAlea, GRAINE } from './generateur.js';

export type MotChamp = 'sur' | 'a_verifier' | 'douteux';

export interface ChampPieceFictif {
  nom: string;
  valeur: string;
  valeurCentimes?: number;
  mot: MotChamp;
  source: string;
}

export interface PieceFictive {
  id: string;
  nomOrigine: string;
  canal: string;
  recuLe: string;
  etat: string;
  typePiece: string;
  comptee: boolean;
  motifNonComptee?: string;
  sensible: boolean;
  /** 64 caractères hexadécimaux tirés de l'aléa : PAS une vraie empreinte. */
  sha256: string;
  texteExtrait: string;
  champs: ChampPieceFictif[];
  motifsAVerifier: string[];
  nomNormalise: string;
  cheminVirtuel: string;
}

export interface JeuPieces {
  version: 1;
  pieces: PieceFictive[];
}

const ETATS = ['recue', 'quarantaine', 'preparee', 'lue', 'prete', 'a_verifier', 'refusee', 'en_erreur', 'en_attente_quota'];
const CANAUX = ['glisser', 'chat', 'selecteur', 'photo_mobile', 'email', 'plateforme_agreee', 'api', 'dossier_surveille', 'portail_fournisseur'];
const MOTIF_PAR_TYPE: Record<string, string> = {
  annulee: 'annulee',
  montant_zero: 'montant_zero',
  releve_fournisseur: 'releve',
  non_piece: 'commande',
  plusieurs_factures: 'plusieurs_factures',
  inconnu: 'inconnu',
};

// SIREN fictif : 8 chiffres tirés de l'aléa, puis la clé de Luhn qui rend le SIREN valide.
function sirenFictif(alea: () => number): string {
  let base = '';
  for (let i = 0; i < 8; i++) base += String(Math.floor(alea() * 10));
  let somme = 0;
  for (let i = 0; i < 8; i++) {
    let c = Number(base[7 - i]);
    if (i % 2 === 0) {
      c *= 2;
      if (c > 9) c -= 9;
    }
    somme += c;
  }
  return base + String((10 - (somme % 10)) % 10);
}

interface Scenario {
  type: string;
  etat: string;
  fournisseur: string;
  numero: string;
  // Montants en centimes : [hors taxe, points de base, TVA] par taux.
  taux: [number, number, number][];
  texte?: string;
  sensible?: boolean;
  douteux?: string;
  motifs?: string[];
}

const F = 'FOURNISSEUR-EXEMPLE';
const R = 'RESTO-EXEMPLE';
const SCENARIOS: Scenario[] = [
  { type: 'facture', etat: 'prete', fournisseur: F, numero: 'F-0101', taux: [[10000, 1900, 1900]] },
  { type: 'facture', etat: 'prete', fournisseur: F, numero: 'F-0102', taux: [[10000, 1900, 1900], [20000, 1100, 2200], [5000, 600, 300]] },
  { type: 'ticket', etat: 'prete', fournisseur: R, numero: 'T-0001', taux: [[1800, 1100, 198]] },
  { type: 'avoir', etat: 'prete', fournisseur: F, numero: 'A-0010', taux: [[-5000, 1900, -950]], texte: 'Avoir annulant la facture F-0099' },
  { type: 'non_piece', etat: 'prete', fournisseur: F, numero: 'BC-0001', taux: [], texte: 'Bon de commande, pas une facture' },
  { type: 'plusieurs_factures', etat: 'a_verifier', fournisseur: F, numero: 'PDF-0001', taux: [], motifs: ['plusieurs_factures'] },
  { type: 'facture', etat: 'prete', fournisseur: F, numero: 'F-0201', taux: [[4999, 0, 0]] },
  { type: 'facture', etat: 'prete', fournisseur: F, numero: 'F-0202', taux: [[4999, 0, 0]] },
  { type: 'facture', etat: 'a_verifier', fournisseur: F, numero: 'F-0301', taux: [[10000, 1900, 1900]], douteux: 'ttc', motifs: ['champ_douteux'] },
  { type: 'inconnu', etat: 'quarantaine', fournisseur: F, numero: 'S-0001', taux: [], texte: '', sensible: true },
  { type: 'facture_acompte', etat: 'lue', fournisseur: F, numero: 'AC-0001', taux: [[3000, 1900, 570]] },
  { type: 'recu', etat: 'preparee', fournisseur: R, numero: 'RC-0001', taux: [[900, 1100, 99]] },
  { type: 'annulee', etat: 'lue', fournisseur: F, numero: 'F-0401', taux: [[7000, 1900, 1330]] },
  { type: 'reemise', etat: 'prete', fournisseur: F, numero: 'F-0402', taux: [[7000, 1900, 1330]] },
  { type: 'montant_zero', etat: 'lue', fournisseur: F, numero: 'F-0403', taux: [[0, 1900, 0]] },
  { type: 'releve_fournisseur', etat: 'prete', fournisseur: F, numero: 'RL-0001', taux: [] },
  { type: 'facture_dans_corps', etat: 'refusee', fournisseur: F, numero: 'M-0001', taux: [[2500, 1900, 475]] },
  { type: 'facture', etat: 'en_erreur', fournisseur: F, numero: 'F-0501', taux: [] },
  { type: 'facture', etat: 'en_attente_quota', fournisseur: F, numero: 'F-0502', taux: [[1000, 1900, 190]] },
  { type: 'facture', etat: 'recue', fournisseur: F, numero: 'F-0503', taux: [] },
];

export function genererPieces(graine = GRAINE): JeuPieces {
  const alea = creerAlea(graine);
  const sirens = new Map<string, string>();
  const pieces: PieceFictive[] = [];
  const total = SCENARIOS.length + 12;
  for (let i = 0; i < total; i++) {
    // Au-delà des scénarios fixes : factures de remplissage, états et canaux en rotation.
    const ht100 = 1 + Math.floor(alea() * 90);
    const s: Scenario = SCENARIOS[i] ?? {
      type: i % 2 === 0 ? 'facture' : 'ticket',
      etat: ETATS[i % ETATS.length] ?? 'recue',
      fournisseur: i % 3 === 0 ? `FOURNISSEUR-${String(i)}` : i % 3 === 1 ? F : R,
      numero: `F-${String(1000 + i)}`,
      taux: [[ht100 * 100, 1900, ht100 * 19]],
    };
    const id = `piece-${String(i + 1).padStart(3, '0')}`;
    let sha256 = '';
    for (let k = 0; k < 16; k++) sha256 += Math.floor(alea() * 65536).toString(16).padStart(4, '0');
    const mois = String(1 + Math.floor(alea() * 12)).padStart(2, '0');
    const jour = String(1 + Math.floor(alea() * 28)).padStart(2, '0');
    const recuLe = `2026-${mois}-${jour}`;
    if (!sirens.has(s.fournisseur)) sirens.set(s.fournisseur, sirenFictif(alea));
    const champs: ChampPieceFictif[] = [];
    const ajoute = (nom: string, valeur: string, centimes?: number): void => {
      const c: ChampPieceFictif = { nom, valeur, mot: s.douteux === nom ? 'douteux' : 'sur', source: 'texte_pdf' };
      if (centimes !== undefined) c.valeurCentimes = centimes;
      champs.push(c);
    };
    ajoute('fournisseur_nom', s.fournisseur);
    ajoute('fournisseur_siren', sirens.get(s.fournisseur) ?? '');
    ajoute('numero', s.numero);
    ajoute('date_piece', recuLe);
    let ttc = 0;
    for (const [ht, pdb, tva] of s.taux) {
      ajoute(`ht@${String(pdb)}`, String(ht), ht);
      ajoute(`tva@${String(pdb)}`, String(tva), tva);
      ttc += ht + tva;
    }
    if (s.taux.length > 0) ajoute('ttc', String(ttc), ttc);
    const motif = MOTIF_PAR_TYPE[s.type] ?? (s.etat === 'prete' ? undefined : 'a_verifier');
    const nomNormalise = `${recuLe}_${id}.pdf`;
    const piece: PieceFictive = {
      id,
      nomOrigine: `scan-${String(i + 1).padStart(3, '0')}.pdf`,
      canal: CANAUX[i % CANAUX.length] ?? 'glisser',
      recuLe,
      etat: s.etat,
      typePiece: s.type,
      comptee: motif === undefined,
      sensible: s.sensible === true,
      sha256,
      texteExtrait: s.texte ?? `${s.type} ${s.numero} ${s.fournisseur}`,
      champs,
      motifsAVerifier: s.motifs ?? [],
      nomNormalise,
      cheminVirtuel: `/pieces/2026/${mois}/${nomNormalise}`,
    };
    if (motif !== undefined) piece.motifNonComptee = motif;
    pieces.push(piece);
  }
  return { version: 1, pieces };
}

function trier(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(trier);
  if (v !== null && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return Object.fromEntries(Object.keys(o).sort().map((k) => [k, trier(o[k])]));
  }
  return v;
}

/** JSON stable : clés triées, saut de ligne final. */
export function serialiserPieces(jeu: JeuPieces): string {
  return `${JSON.stringify(trier(jeu), null, 2)}\n`;
}
