// Jeu fictif des ventes à graine fixe (V3-VEN-040, V3-PRI-017). Aucune donnée réelle ; types locaux, sans le noyau.
import { creerAlea, GRAINE } from './generateur.js';

export interface LigneVenteFictive {
  libelle: string;
  htCentimes: number;
  tauxPdb: number;
  tvaLueCentimes: number;
  nature: 'bien' | 'service';
  compteProduit: string;
}
export interface PaiementFictif {
  date: string;
  montantCentimes: number;
}
export interface PieceVenteFictive {
  id: string;
  type: 'facture' | 'avoir' | 'facture_acompte';
  origine: 'depot' | 'email' | 'import_fichier' | 'plateforme_agreee';
  clientCode?: string;
  numero: string;
  dateFacture: string;
  dateOperation?: string;
  echeance?: string;
  htCentimes: number;
  tvaCentimes: number;
  ttcCentimes: number;
  statut: 'a_verifier' | 'proposee' | 'validee' | 'doublon';
  statutEcriture?: 'brouillon' | 'propose' | 'valide';
  resteDuCentimes: number;
  lettrage: 'aucun' | 'partiel' | 'total';
  enLitige: boolean;
  factureOrigineId?: string;
  cartes: string[];
  lignes: LigneVenteFictive[];
  paiements: PaiementFictif[];
}
export interface ClientVenteFictif {
  code: string;
  nom: string;
  nature: 'professionnel' | 'particulier';
  siren?: string;
  tva?: string;
  statutVies: 'verifie' | 'non_verifie' | 'invalide';
  codePostal: string;
  creeLe: string;
  habitude?: string;
}
export interface SocieteVenteFictive {
  profil: 'pleine' | 'vide';
  nom: string;
  cas: 'A' | 'B' | 'D';
  clients: ClientVenteFictif[];
  pieces: PieceVenteFictive[];
}
export interface JeuVentes {
  version: 1;
  dateReference: string;
  societes: SocieteVenteFictive[];
}

const DATE_REFERENCE = '2026-06-30';
const ECHEANCE_FUTURE = '2026-07-15';
const TAUX = [600, 900, 1900];
const ETATS = ['a_relire', 'proposee', 'a_encaisser', 'payee_en_partie', 'en_retard', 'payee', 'en_litige'] as const;
const CLIENTS: ClientVenteFictif[] = [
  { code: 'CLI001', nom: 'Immobilière Marceau', nature: 'professionnel', siren: '987654324', statutVies: 'non_verifie', codePostal: '69001', creeLe: '2026-01-02', habitude: 'virement à 30 jours' },
  { code: 'CLI002', nom: 'Paul Marceau', nature: 'particulier', statutVies: 'non_verifie', codePostal: '69003', creeLe: '2026-01-03' },
  { code: 'CLI003', nom: 'Delmas Bâtiment', nature: 'professionnel', siren: '123456782', statutVies: 'invalide', codePostal: '38000', creeLe: '2026-01-04' },
  { code: 'CLI004', nom: 'Atelier Perrin', nature: 'professionnel', siren: '987654324', statutVies: 'verifie', codePostal: '42000', creeLe: '2026-01-05' },
];

function jourPlus(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function genererPieces(alea: () => number): PieceVenteFictive[] {
  const pieces: PieceVenteFictive[] = [];
  const nouvelle = (numero: string, jour: number, p: { [K in keyof PieceVenteFictive]?: PieceVenteFictive[K] | undefined } = {}, ht?: number): PieceVenteFictive => {
    const base = ht ?? (5 + Math.floor(alea() * 95)) * 10000;
    const tauxPdb = TAUX[Math.floor(alea() * TAUX.length)] as number;
    const tva = (base * tauxPdb) / 10000;
    const dateFacture = jourPlus('2026-01-02', jour * 2);
    const piece: PieceVenteFictive = {
      id: `VP-1-${String(pieces.length + 1).padStart(3, '0')}`, type: 'facture', origine: 'depot',
      clientCode: (CLIENTS[Math.floor(alea() * CLIENTS.length)] as ClientVenteFictif).code, numero, dateFacture,
      echeance: jourPlus(dateFacture, 30), htCentimes: base, tvaCentimes: tva, ttcCentimes: base + tva,
      statut: 'validee', statutEcriture: 'valide', resteDuCentimes: base + tva, lettrage: 'aucun', enLitige: false, cartes: [],
      lignes: [{ libelle: `Prestation ${numero}`, htCentimes: base, tauxPdb, tvaLueCentimes: tva, nature: 'service', compteProduit: '706000' }],
      paiements: [], ...(p as Partial<PieceVenteFictive>),
    };
    pieces.push(piece);
    return piece;
  };
  const payer = (p: PieceVenteFictive, montant: number): Partial<PieceVenteFictive> => ({
    paiements: [{ date: jourPlus(p.dateFacture, 10), montantCentimes: montant }],
    resteDuCentimes: p.ttcCentimes - montant,
    lettrage: montant === p.ttcCentimes ? 'total' : 'partiel',
  });
  const serie = Array.from({ length: 29 }, (_, i) => i + 1).filter((n) => n !== 17);
  serie.forEach((n, idx) => {
    const numero = `FA-2026-${String(n).padStart(4, '0')}`;
    const etat = ETATS[idx % ETATS.length];
    const p = nouvelle(numero, n);
    if (etat === 'a_relire') p.statut = 'a_verifier';
    if (etat === 'proposee') Object.assign(p, { statut: 'proposee', statutEcriture: idx % 2 === 0 ? 'propose' : 'brouillon' });
    if (etat === 'a_encaisser' || etat === 'payee_en_partie') p.echeance = ECHEANCE_FUTURE;
    if (etat === 'payee_en_partie') Object.assign(p, payer(p, p.ttcCentimes - 10000));
    if (etat === 'payee') Object.assign(p, payer(p, p.ttcCentimes));
    if (etat === 'en_litige') p.enLitige = true;
    if (etat === 'a_relire') delete p.statutEcriture;
  });
  const payees = pieces.filter((p) => p.lettrage === 'total').slice(0, 4);
  for (const o of payees) {
    nouvelle(o.numero, 0, { origine: 'email', statut: 'doublon', clientCode: o.clientCode, dateFacture: o.dateFacture, echeance: o.echeance }, o.htCentimes);
  }
  const premiere = pieces[0] as PieceVenteFictive;
  nouvelle(premiere.numero, 1, { statut: 'a_verifier', cartes: ['numero_deja_vu'] }, premiere.htCentimes + 10000);
  const rattachee = pieces[5] as PieceVenteFictive;
  nouvelle('AV-2026-0001', 20, { type: 'avoir', factureOrigineId: rattachee.id, clientCode: rattachee.clientCode, resteDuCentimes: 0, lettrage: 'total' });
  nouvelle('AV-2026-0002', 21, { type: 'avoir', statut: 'a_verifier', cartes: ['avoir_a_rattacher'] });
  const acompte = nouvelle('AC-2026-0001', 22, { type: 'facture_acompte', echeance: ECHEANCE_FUTURE });
  nouvelle('FA-2026-0030', 30, { factureOrigineId: acompte.id, clientCode: acompte.clientCode, echeance: ECHEANCE_FUTURE });
  const ecart = nouvelle('FA-2026-0031', 31, { echeance: ECHEANCE_FUTURE, cartes: ['A1'] });
  ecart.ttcCentimes += 1;
  ecart.resteDuCentimes += 1;
  return pieces;
}

export function genererVentes(graine: number = GRAINE): JeuVentes {
  const alea = creerAlea(graine);
  return {
    version: 1,
    dateReference: DATE_REFERENCE,
    societes: [
      { profil: 'pleine', nom: 'Lemoine Rénovation', cas: 'B', clients: CLIENTS, pieces: genererPieces(alea) },
      { profil: 'vide', nom: 'Boulangerie Rivoire', cas: 'A', clients: [], pieces: [] },
      { profil: 'vide', nom: 'Atelier Bertin', cas: 'D', clients: [], pieces: [] },
    ],
  };
}

function trier(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(trier);
  if (v !== null && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return Object.fromEntries(Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => [k, trier(o[k])]));
  }
  return v;
}

export function serialiserVentes(jeu: JeuVentes): string {
  return `${JSON.stringify(trier(jeu), null, 2)}\n`;
}
