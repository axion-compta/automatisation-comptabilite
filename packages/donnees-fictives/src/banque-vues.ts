// Vues d'exemple du bloc banque, cohérentes avec le jeu de banque.ts (V3-DEM-004, V3-BAN-020, V3-TDB-002, V3-TDB-005).
// Données d'exemple écrites à la main : ce ne sont pas des résultats calculés par le noyau.
import { genererBanque } from './banque.js';
import type { JeuBanque } from './banque.js';

export type EtatMois = 'couvert' | 'manquant' | 'partiel';
export interface VuesBanque {
  couverture: { compteId: string; mois: { mois: string; etat: EtatMois }[] }[];
  trous: {
    id: string;
    compteId: string;
    debut: string;
    fin: string;
    preuve: string;
    ecart?: number;
    etat: string;
  }[];
  demandes: {
    id: string;
    cle: string;
    ligneIds: string[];
    impact: number;
    nombre: number;
    type: string;
    codeQuestion: string;
    reponsesPretes: string[];
  }[];
  doublons: {
    id: string;
    ligneA: string;
    ligneB: string;
    motif: string;
    etat: 'propose';
  }[];
  flux: {
    id: string;
    date: string;
    montant: number;
    origine: string;
    certitude: string;
    libelleCode: string;
  }[];
  soldesDepart: { compteId: string; solde: number; date: string }[];
  dettes: {
    pieceId: string;
    fournisseurId: string;
    fournisseurNom: string;
    echeance: string;
    reste: number;
    ibanMasque: string;
    ibanChange: boolean;
  }[];
}

const DATE_VUE = '2026-11-04';
const MOIS_FRISE = Array.from({ length: 10 }, (_, k) => `2026-${String(k + 1).padStart(2, '0')}`);
const REPONSES = ['piece_jointe', 'pas_de_piece', 'a_ignorer'];
const FLUX: [string, string, number, string, string, string][] = [
  ['FX-001', '2026-11-10', -420000, 'fournisseurs', 'certain', 'FOURNISSEURS_ECHUS'],
  ['FX-002', '2026-11-15', 600000, 'clients', 'probable', 'CLIENTS_ATTENDUS'],
  ['FX-003', '2026-11-05', -150000, 'loyer', 'certain', 'LOYER_MENSUEL'],
  ['FX-004', '2026-11-23', -230000, 'tva', 'estime', 'TVA_ESTIMEE'],
];
const DETTES: [string, string, string, number, string, boolean][] = [
  ['P-DET-001', 'T4', '2026-11-20', 120000, 'FR76 •••• 0042', false],
  ['P-DET-002', 'T5', '2026-11-25', 83040, 'FR76 •••• 0043', true],
  ['P-DET-003', 'T8', '2026-12-05', 200000, 'FR76 •••• 0044', false],
];
const SOLDE_DEPART = 1840000;

export function genererVuesBanque(jeu: JeuBanque = genererBanque()): VuesBanque {
  const compteId = jeu.comptes[0]?.id;
  const couverture = jeu.comptes
    .filter((c) => jeu.releves.some((r) => r.compteId === c.id))
    .map((c) => ({
      compteId: c.id,
      mois: MOIS_FRISE.map((mois) => ({
        mois,
        etat: (jeu.releves.some((r) => r.compteId === c.id && r.periodeDebut.startsWith(mois))
          ? 'couvert'
          : 'manquant') as EtatMois,
      })),
    }));
  const manquantSept = couverture.find((c) => c.mois.some((m) => m.mois === '2026-09' && m.etat === 'manquant'));
  const trous = manquantSept
    ? [
        {
          id: `TROU-${manquantSept.compteId}-2026-09`,
          compteId: manquantSept.compteId,
          debut: '2026-09-01',
          fin: '2026-09-30',
          preuve: 'releve_absent',
          ecart: 134567,
          etat: 'ouvert',
        },
      ]
    : [];
  const sansPiece = Object.entries(jeu.attendus).filter(([, a]) => 'etat' in a && a.etat === 'SANS_PIECE');
  const groupes = new Map<string, string[]>();
  for (const [id] of sansPiece) {
    const cle = jeu.lignes.find((l) => l.id === id)?.contrepartieId ?? 'SANS_TIERS';
    groupes.set(cle, [...(groupes.get(cle) ?? []), id]);
  }
  const demandes = [...groupes].map(([cle, ligneIds]) => ({
    id: `DEM-${cle}`,
    cle,
    ligneIds,
    impact: ligneIds.reduce((s, id) => s + Math.abs(jeu.lignes.find((l) => l.id === id)?.montant ?? 0), 0),
    nombre: ligneIds.length,
    type: 'piece_manquante',
    codeQuestion: 'QUESTION_PIECE_MANQUANTE',
    reponsesPretes: REPONSES,
  }));
  const doublons: VuesBanque['doublons'] = [];
  for (const l of jeu.lignes) {
    const a = jeu.lignes.find(
      (x) =>
        x.rang < l.rang &&
        x.compteId === l.compteId &&
        x.dateOperation === l.dateOperation &&
        x.montant === l.montant &&
        x.libelleBrut === l.libelleBrut,
    );
    if (a && doublons.length === 0) {
      doublons.push({
        id: `DBL-${a.id}-${l.id}`,
        ligneA: a.id,
        ligneB: l.id,
        motif: 'meme_date_montant_libelle',
        etat: 'propose',
      });
    }
  }
  const fournisseurs = new Map(jeu.contreparties.map((c) => [c.id, c.nom]));
  return {
    couverture,
    trous,
    demandes,
    doublons,
    flux: compteId
      ? FLUX.map(([id, date, montant, origine, certitude, libelleCode]) => ({
          id,
          date,
          montant,
          origine,
          certitude,
          libelleCode,
        }))
      : [],
    soldesDepart: compteId ? [{ compteId, solde: SOLDE_DEPART, date: DATE_VUE }] : [],
    dettes: DETTES.filter(([, f]) => fournisseurs.has(f)).map(
      ([pieceId, fournisseurId, echeance, reste, ibanMasque, ibanChange]) => ({
        pieceId,
        fournisseurId,
        fournisseurNom: fournisseurs.get(fournisseurId)!,
        echeance,
        reste,
        ibanMasque,
        ibanChange,
      }),
    ),
  };
}
