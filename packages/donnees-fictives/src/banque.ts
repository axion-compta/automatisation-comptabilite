// Jeu fictif du bloc banque à graine fixe (V3-DEM-004, V3-BAN-012). Les attendus sont écrits par construction, à la main.
import { creerAlea, GRAINE } from './generateur.js';

export type Attendu = { pieceIds: string[] } | { etat: 'SANS_PIECE_REQUISE' | 'SANS_PIECE' | 'NEUTRALISEE' };
export type CompteBanque = { id: string; nom: string; type: 'courant' | 'epargne' | 'carte_differe'; devise: 'EUR'; ibanFaux: string; ibanMasque: string };
export type ReleveBanque = { id: string; compteId: string; periodeDebut: string; periodeFin: string; soldeOuverture: number; soldeCloture: number };
export interface LigneBanque {
  id: string;
  societeId: string;
  compteId: string;
  releveId: string;
  rang: number;
  dateOperation: string;
  montant: number;
  devise: 'EUR';
  montantOrigine?: number;
  deviseOrigine?: string;
  libelleBrut: string;
  contrepartieId?: string;
  reference?: string;
  moyen: 'virement' | 'carte' | 'prelevement' | 'frais';
}
export type PieceBanque = { id: string; societeId: string; numero: string; montant: number; devise: string; date: string; echeance: string; sens: 'achat' | 'vente'; contrepartieId: string };
export type ExplicationBanque = { ligneId: string; codeMot: string; facteurs: { nom: string; points: number; code: string }[] };
export interface JeuBanque {
  societe: { id: string; nom: string };
  contreparties: { id: string; nom: string }[];
  comptes: CompteBanque[];
  releves: ReleveBanque[];
  lignes: LigneBanque[];
  pieces: PieceBanque[];
  attendus: Record<string, Attendu>;
  explications: ExplicationBanque[];
}

const SOC = 'S-ATELIER';
const NOMS = ['Fictiva Telecom', 'Papeterie Fictive', 'Client Fictif', 'Fournisseur Fictif', 'Garage Fictif', 'Traiteur Fictif', 'Imprimerie Fictive', 'Cabinet Exemple'];
const FRAIS = ['FRAIS TENUE DE COMPTE', 'COTISATION CARTE', 'COMMISSION VIREMENT', 'AGIOS', 'IMPOT TAXE FICTIVE', 'FRAIS PRELEVEMENT', 'FRAIS CHEQUE', 'COMMISSION FICTIVE'];
const FACTEURS = [
  ['reference', 45],
  ['montant', 25],
  ['tiers', 20],
  ['delai', 7],
  ['libelle', 3],
] as const;
const pad = (n: number, l = 2): string => String(n).padStart(l, '0');

// IBAN factice dont la clé est volontairement FAUSSE (clé exacte + 1) : jamais valide.
function ibanFaux(n: number): string {
  const bban = '3000400001' + pad(n, 13);
  const cle = 98 - Number(BigInt(bban + '152700') % 97n);
  return `FR${pad(cle + 1)}${bban}`;
}
const masquer = (iban: string): string => iban.slice(0, 2) + '*'.repeat(iban.length - 6) + iban.slice(-4);

export function genererBanque(graine: number = GRAINE): JeuBanque {
  if (!Number.isSafeInteger(graine) || graine < 0) throw new RangeError('graine_invalide');
  const alea = creerAlea(graine);
  const jitter = (n: number): number => Math.floor(alea() * n);
  const lignes: LigneBanque[] = [];
  const pieces: PieceBanque[] = [];
  const attendus: Record<string, Attendu> = {};
  const ligne = (montant: number, libelle: string, extra: Partial<LigneBanque> = {}): LigneBanque => {
    const rang = lignes.length + 1;
    const l: LigneBanque = {
      id: `L-${pad(rang, 3)}`,
      societeId: SOC,
      compteId: 'BQ1',
      releveId: 'R-BQ1-2026-10',
      rang,
      dateOperation: `2026-10-${pad(1 + (rang % 28))}`,
      montant,
      devise: 'EUR',
      libelleBrut: libelle,
      moyen: 'virement',
      ...extra,
    };
    lignes.push(l);
    return l;
  };
  const piece = (montant: number, tiers: number, extra: Partial<PieceBanque> = {}): PieceBanque => {
    const n = pieces.length + 1;
    const p: PieceBanque = {
      id: `P-${pad(n, 3)}`,
      societeId: SOC,
      numero: `FA-2026-${pad(n, 4)}`,
      montant,
      devise: 'EUR',
      date: '2026-09-15',
      echeance: '2026-10-15',
      sens: tiers === 2 ? 'vente' : 'achat',
      contrepartieId: `T${tiers + 1}`,
      ...extra,
    };
    pieces.push(p);
    return p;
  };
  const signe = (p: PieceBanque): number => (p.sens === 'vente' ? 1 : -1);
  const lier = (l: LigneBanque, ...ps: PieceBanque[]): void => {
    attendus[l.id] = { pieceIds: ps.map((p) => p.id) };
  };
  // 66 références exactes, 45 cartes sans référence : montants distincts, tous au-dessus de 20000 centimes.
  for (let i = 0; i < 111; i++) {
    const exacte = i < 66;
    const t = exacte ? i % 4 : [0, 1, 3][i % 3]!;
    const p = piece(20000 + i * 137 + jitter(100), t);
    const l = ligne(signe(p) * p.montant, exacte ? `VIR ${NOMS[t]} REF ${p.numero}` : `CB ${NOMS[t]}`, {
      contrepartieId: p.contrepartieId,
      moyen: exacte ? 'virement' : 'carte',
      ...(exacte ? { reference: p.numero } : {}),
    });
    lier(l, p);
  }
  // Deux factures de même montant (T06-1), distinguées par l'échéance.
  const m1 = 123400 + jitter(50);
  const [c1, c2] = [piece(m1, 0, { echeance: '2026-10-05' }), piece(m1, 0, { echeance: '2026-10-20' })];
  lier(ligne(-m1, 'PRLV FICTIVA TELECOM', { dateOperation: '2026-10-06', moyen: 'prelevement', contrepartieId: 'T1' }), c1!);
  lier(ligne(-m1, 'PRLV FICTIVA TELECOM', { dateOperation: '2026-10-21', moyen: 'prelevement', contrepartieId: 'T1' }), c2!);
  // Trois tickets identiques (T06-2) : même montant, même jour, une ligne par ticket dans l'ordre.
  for (let k = 0; k < 3; k++) {
    const t = piece(1250, 1, { date: '2026-10-09', echeance: '2026-10-09' });
    lier(ligne(-1250, 'CB PAPETERIE FICTIVE', { dateOperation: '2026-10-09', moyen: 'carte', contrepartieId: 'T2' }), t);
  }
  // Groupe 1-N (T06-5) : un virement paie trois factures.
  const groupe = [50000, 70000, 30000].map((m) => piece(m, 3));
  lier(ligne(-150000, 'VIR FOURNISSEUR FICTIF 3 FACTURES', { contrepartieId: 'T4' }), ...groupe);
  // Paiement partiel (T06-4) et pièce en devise fictive XXA (T09-1).
  lier(ligne(-80000, 'VIR ACOMPTE FICTIVA TELECOM', { contrepartieId: 'T1' }), piece(200000, 0));
  const dev = piece(90000, 4, { devise: 'XXA' });
  lier(ligne(-85000, 'VIR GARAGE FICTIF', { contrepartieId: 'T5', montantOrigine: -90000, deviseOrigine: 'XXA' }), dev);
  // Pièce d'une AUTRE société au même montant (T05-8) : jamais candidate.
  const propre = piece(60000, 1);
  piece(60000, 1, { societeId: 'S-AUTRE' });
  lier(ligne(-60000, 'VIR PAPETERIE FICTIVE', { contrepartieId: 'T2' }), propre);
  FRAIS.forEach((libelle, k) => {
    attendus[ligne(-(400 + k * 100), libelle, { moyen: 'frais' }).id] = { etat: 'SANS_PIECE_REQUISE' };
  });
  for (let i = 0; i < 12; i++) {
    const t = 3 + (i % 5);
    attendus[ligne(-(300000 + i * 1111), `VIR ${NOMS[t]}`, { contrepartieId: `T${t + 1}` }).id] = {
      etat: 'SANS_PIECE',
    };
  }
  const releves: ReleveBanque[] = [];
  let solde = 500000 + jitter(100000);
  for (let mois = 1; mois <= 10; mois++) {
    if (mois === 9) continue;
    const delta = mois === 10 ? lignes.reduce((s, l) => s + l.montant, 0) : jitter(200000) - 100000;
    releves.push({
      id: `R-BQ1-2026-${pad(mois)}`,
      compteId: 'BQ1',
      periodeDebut: `2026-${pad(mois)}-01`,
      periodeFin: `2026-${pad(mois)}-${mois === 2 ? 28 : [4, 6, 11].includes(mois) ? 30 : 31}`,
      soldeOuverture: solde,
      soldeCloture: solde + delta,
    });
    solde += delta;
  }
  const comptes: CompteBanque[] = (['courant', 'epargne', 'carte_differe'] as const).map((type, k) => ({
    id: `BQ${k + 1}`,
    nom: `Banque Exemple ${type}`,
    type,
    devise: 'EUR',
    ibanFaux: ibanFaux(k + 1),
    ibanMasque: masquer(ibanFaux(k + 1)),
  }));
  const fact = (a: number, b: number) => FACTEURS.slice(a, b).map(([code, points]) => ({ nom: code, points, code }));
  const exemples: [number, string, ExplicationBanque['facteurs']][] = [
    [1, 'rattache', fact(0, 5)],
    [2, 'rattache', fact(0, 5)],
    [3, 'rattache', fact(0, 5)],
    [67, 'propose', fact(1, 4)],
    [68, 'propose', fact(1, 4)],
    [112, 'hesite', fact(1, 3)],
    [113, 'hesite', fact(1, 3)],
    [114, 'hesite', fact(1, 3)],
    [117, 'rattache', fact(1, 3)],
    [129, 'sans_piece', []],
  ];
  return {
    societe: { id: SOC, nom: 'Atelier Fictif SAS' },
    contreparties: NOMS.map((nom, k) => ({ id: `T${k + 1}`, nom })),
    comptes,
    releves,
    lignes,
    pieces,
    attendus,
    explications: exemples.map(([rang, codeMot, facteurs]) => ({ ligneId: lignes[rang - 1]!.id, codeMot, facteurs })),
  };
}

function trier(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(trier);
  if (v !== null && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, x]) => [k, trier(x)]),
    );
  }
  return v;
}
export const serialiserBanque = (jeu: JeuBanque): string => JSON.stringify(trier(jeu), null, 1);
