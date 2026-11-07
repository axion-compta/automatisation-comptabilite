// Données fictives du banc (V3-CTL-079) : 200 pièces propres et 20 anomalies, graine fixe. Taux de TEST seulement.
import { centimes, type Centimes } from '../../argent/index.js';
import type { Ecriture } from '../../ecritures/modele.js';
import type { EtatVerrou } from '../../exercices/exercices.js';
import { executerControles, type ObjetControle, type RegleControle, type TraceControle } from '../moteur.js';
import { regleCCK04 } from '../regles/arithmetique.js';
import type { PieceControlee } from '../regles/commun.js';
import { regleCCK11, regleCCK11M, type ObjetDatePiece } from '../regles/dates-piece.js';
import { regleCCK08, type EntreeDestinataire, type PieceDestinataire } from '../regles/destinataire.js';
import { regleCCK01, regleCCK02, regleCCK03, type SoldesCompte } from '../regles/equilibre.js';
import { regleCCT06 } from '../regles/multi-taux.js';
import { regleCCK12, type ObjetNature } from '../regles/nature.js';
import { regleCCK05, regleCCK06 } from '../regles/pied-de-facture.js';
import { regleCCT02, type PieceTva } from '../regles/tva-en-doute.js';

export const NB_PROPRES = 200;
const TAUX_A = 777;
const TAUX_B = 333;
const BASE_TAUX = 10000;
const NOM_SOCIETE = 'Société Banc Fictive';
const SIREN_SOCIETE = '000000001';
const HORODATAGE = '2026-01-20T00:00:00Z';
const exercice = { id: 'EX-BANC', debut: '2025-01-01', fin: '2025-12-31' };
const ouvert: EtatVerrou = { periodesVerrouillees: [], exerciceCloture: false };

export type Famille = 'equilibre' | 'arithmetique' | 'societe' | 'dates' | 'natures' | 'tva';
export interface Anomalie { id: string; famille: Famille; regleAttendue: string; executer(exclues: readonly string[]): TraceControle[] }

function alea(graine: number): () => number {
  let s = graine;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s;
  };
}

const tva = (ht: number, taux: number): Centimes => centimes(Math.round((ht * taux) / BASE_TAUX));
const ligne = (ht: number, taux: number, nature: string) => ({ taux, nature, ht: centimes(ht), tva: tva(ht, taux), ttc: centimes(ht + tva(ht, taux)), compte: '60' });
function piece(i: number, r: () => number): PieceControlee {
  const lignes = [ligne(1000 + (r() % 90000), TAUX_A, 'nat_a'), ligne(1000 + (r() % 90000), TAUX_B, 'nat_b')];
  const somme = (c: 'ht' | 'tva' | 'ttc') => centimes(lignes.reduce((t, l) => t + l[c], 0));
  return {
    id: `PIE-${String(i).padStart(3, '0')}`, sens: 'achat', date: `2025-${String((i % 12) + 1).padStart(2, '0')}-15`, lignes,
    totaux: { ht: somme('ht'), tva: somme('tva'), ttc: somme('ttc') }, destinataire: { nom: NOM_SOCIETE }, mentions: [],
  };
}
const ecriture = (id: string, d: number, c: number): Ecriture => ({
  id, journal: 'AC', date: '2025-06-15', statut: 'valide',
  lignes: [{ compte: '60', libelle: 'x', debit: centimes(d), credit: centimes(0) }, { compte: '40', libelle: 'x', debit: centimes(0), credit: centimes(c) }],
});

const obj = <T>(type: string, id: string, donnee: T): ObjetControle<T> => ({ type, id, donnee });
const avec = <T>(regle: RegleControle<T>, objets: ObjetControle<T>[], exclues: readonly string[] = []): TraceControle[] =>
  exclues.includes(regle.id) ? [] : executerControles([regle], objets, 'avant_export', HORODATAGE);

const societe = { nom: NOM_SOCIETE, siren: SIREN_SOCIETE, nomsConnus: [] };
const nature = (ht: number, compte: string, durable: boolean, caution: boolean, natureLigne = 'nat_a'): ObjetNature => ({
  ligne: ligne(ht, TAUX_A, natureLigne), comptepropose: compte, natureDurable: durable, natureCaution: caution, seuilImmobilisation: centimes(500000),
  comptesDepot: ['275'], prefixesCharge: ['6'], prefixesImmobilisation: ['2'], naturesHorsActivite: ['hors_test'],
});
const tvaPiece = (id: string, o: Partial<PieceTva> = {}): PieceTva => ({
  pieceId: id, lue: true, lisible: true, codes: [], parametresUtilises: [], casParticulier: false, quarantaine: false, destinataireAConfirmer: false, tvaEnJeu: centimes(100), ...o,
});
const date = (datePiece: string, verrou = ouvert): ObjetDatePiece => ({ datePiece, dateLecture: '2026-01-20', exercice, verrou });
const dest = (p: PieceControlee, destinataire: { nom: string; siren?: string }): EntreeDestinataire => ({ piece: { ...p, destinataire }, societe, formes: [] });
const soldes = (ouverture: number, cloture: number): SoldesCompte => ({
  compte: '60', soldeOuverture: centimes(ouverture), soldeCloture: centimes(cloture), mouvements: [{ debit: centimes(500), credit: centimes(0) }],
});

export function genererPropres(): PieceControlee[] {
  const r = alea(1);
  return Array.from({ length: NB_PROPRES }, (_, i) => piece(i, r));
}

/** Traces de TOUTES les règles sur les pièces propres : tout ALERTE est une fausse alerte. */
export function executerSurPropres(exclues: readonly string[] = []): TraceControle[] {
  const ps = genererPropres();
  const ecritures = ps.map((p) => ecriture(p.id, p.totaux.ttc, p.totaux.ttc));
  const par = <T>(type: string, f: (p: PieceControlee) => T) => ps.map((p) => obj(type, p.id, f(p)));
  return [
    ...avec(regleCCK01, ecritures.map((e) => obj('ecriture', e.id, e)), exclues),
    ...avec(regleCCK02, [obj('balance', 'B', ecritures)], exclues),
    ...avec(regleCCK03, par('compte', () => soldes(0, 500)), exclues),
    ...avec(regleCCK04, par('piece', (p) => ({ piece: p, toleranceTaux: centimes(0), tolerancePiece: centimes(0) })), exclues),
    ...avec(regleCCK05, par('piece', (p) => ({ piece: p, tolerance: centimes(0) })), exclues),
    ...avec(regleCCK06, par('piece', (p) => ({ piece: { ...p, montantDu: p.totaux.ttc }, qualifications: [] })), exclues),
    ...avec(regleCCK08, par('piece', (p) => dest(p, { nom: NOM_SOCIETE })), exclues),
    ...avec(regleCCK11, par('piece', (p) => date(p.date)), exclues),
    ...avec(regleCCK11M, par('piece', (p) => date(p.date)), exclues),
    ...avec(regleCCK12, par('ligne', (p) => nature(1000, '60', false, false, p.lignes[0]?.nature)), exclues),
    ...avec(regleCCT02, par('periode', (p) => ({ periode: '2025', pieces: [tvaPiece(p.id)] })), exclues),
    ...avec(regleCCT06, par('piece', (p) => ({ piece: p, comptesDepot: ['275'], naturesCaution: ['caution'] })), exclues),
  ];
}

const p0 = genererPropres()[0] as PieceControlee;
const an = <T>(id: string, famille: Famille, regle: RegleControle<T>, donnee: T): Anomalie => ({
  id, famille, regleAttendue: regle.id, executer: (ex) => avec(regle, [obj('anomalie', id, donnee)], ex),
});
const sansDestinataire: PieceDestinataire = { ...p0 };
delete (sansDestinataire as { destinataire?: unknown }).destinataire;
const lignesDouble = [ligne(1000, TAUX_A, 'nat_a'), ligne(2000, TAUX_A, 'nat_a')];

/** Les 20 anomalies, chacune avec sa famille et la règle qui doit la détecter. */
export function genererAnomalies(): Anomalie[] {
  const tol = { toleranceTaux: centimes(0), tolerancePiece: centimes(0) };
  const faux = (c: 'ht' | 'tva' | 'ttc') => ({ ...p0, totaux: { ...p0.totaux, [c]: centimes(p0.totaux[c] + 1) } });
  return [
    an('A01', 'equilibre', regleCCK01, ecriture('E1', 1000, 900)),
    an('A02', 'equilibre', regleCCK01, ecriture('E2', 5, 6)),
    an('A03', 'equilibre', regleCCK02, [ecriture('E3', 100, 100), ecriture('E4', 700, 600)]),
    an('A04', 'equilibre', regleCCK03, soldes(0, 499)),
    an('A05', 'arithmetique', regleCCK04, { piece: { ...p0, lignes: [{ ...ligne(1000, TAUX_A, 'nat_a'), ttc: centimes(1)}] }, ...tol }),
    an('A06', 'arithmetique', regleCCK04, { piece: { ...p0, lignes: [{ ...p0.lignes[0]!, tva: centimes(0) }] }, ...tol }),
    an('A07', 'arithmetique', regleCCK05, { piece: faux('ht'), tolerance: centimes(0) }),
    an('A08', 'arithmetique', regleCCK06, { piece: { ...p0, montantDu: centimes(p0.totaux.ttc - 5) }, qualifications: [] }),
    an('A09', 'societe', regleCCK08, dest(p0, { nom: 'Atelier Autre Fictif' })),
    an('A10', 'societe', regleCCK08, dest(p0, { nom: NOM_SOCIETE, siren: '000000002' })),
    an('A11', 'societe', regleCCK08, { piece: sansDestinataire, societe, formes: [] }),
    an('A12', 'dates', regleCCK11, date('2025-03-10', { periodesVerrouillees: ['2025-03'], exerciceCloture: false })),
    an('A13', 'dates', regleCCK11M, date('2026-06-01')),
    an('A14', 'dates', regleCCK11M, date('2024-12-31')),
    an('A15', 'natures', regleCCK12, nature(900000, '60', true, false)),
    an('A16', 'natures', regleCCK12, nature(1000, '60', false, true)),
    an('A17', 'natures', regleCCK12, nature(1000, '60', false, false, 'hors_test')),
    an('A18', 'tva', regleCCT02, { periode: '2025', pieces: [tvaPiece('T1', { lue: false })] }),
    an('A19', 'tva', regleCCT06, { piece: { ...p0, lignes: lignesDouble }, comptesDepot: ['275'], naturesCaution: [] }),
    an('A20', 'tva', regleCCT06, { piece: faux('tva'), comptesDepot: ['275'], naturesCaution: [] }),
  ];
}

export interface VerdictEntree { detectees: number; attendues: number; faussesAlertes: number; maxFaussesAlertes: number }
/** Vert si toutes les anomalies sont détectées et les fausses alertes ne dépassent pas le maximum. */
export function verdictBanc(e: VerdictEntree): 'vert' | 'rouge' {
  return e.detectees === e.attendues && e.faussesAlertes <= e.maxFaussesAlertes ? 'vert' : 'rouge';
}

/** Lance le banc complet ; `exclues` retire des règles du jeu. */
export function lancerBanc(exclues: readonly string[] = []) {
  const anomalies = genererAnomalies();
  const detectees = anomalies.filter((a) => a.executer(exclues).some((t) => t.regleId === a.regleAttendue && t.resultat === 'ALERTE'));
  const propres = executerSurPropres(exclues);
  return { attendues: anomalies.length, detectees: detectees.length, faussesAlertes: propres.filter((t) => t.resultat === 'ALERTE').length, propres };
}
