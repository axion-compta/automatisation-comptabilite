// Données fictives du banc VEN-021 : société Lemoine Rénovation. Taux, seuils, dates et paramètres INVENTÉS (D31).
import { centimes as c } from '../../argent/index.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- données de test hétérogènes modifiées par chemin
export type Jeu = Record<string, any>;

export const CODES = Array.from({ length: 20 }, (_, i) => `CC-V${String(i + 1).padStart(2, '0')}`);

const TAUX_TEST = 600;
const TAUX_INCONNU_TEST = 700;
const BORNES_TEST = [30, 60];
const PAYS_UE_TEST = ['DE', 'BE'];
const HT = 10000;
const TVA = 600;
const COMPTES = { client: 'CLI', tvaCollectee: 'COL', tvaEnAttente: 'ATT', avancesClients: 'AVA', banque: 'BQ' };
const exercices = [{ id: 'EX1', debut: '2026-01-01', fin: '2026-12-31' }];
const piece = (id: string, numero: string, dateFacture: string, ttc: number) => ({ id, numero, dateFacture, ttc: c(ttc) });
const facture = { id: 'f1', numero: 'FA-001', clientId: 'C1', ttc: c(10000), resteDu: c(10000) };
const creance = (factureId: string, resteDu: number) => ({ factureId, clientId: 'C1', resteDu: c(resteDu), dateFacture: '2026-01-10' });
const ecritureFacture = {
  id: 'e1', journal: 'VT', auxiliaire: 'CLIENT1', comptes: COMPTES, profil: { tenue: 'partie_double', regimeTva: 'reel', optionDebitsDepuis: null },
  piece: { id: 'p1', type: 'facture', origine: 'depot', numero: 'F-1', dateFacture: '2026-11-05', htCentimes: c(HT), tvaCentimes: c(TVA), ttcCentimes: c(HT + TVA), statut: 'lue' },
  lignes: [{ libelle: 'x', htCentimes: c(HT), tauxPdb: TAUX_TEST, tvaLueCentimes: c(TVA), nature: 'service', compteProduit: 'P706', codeTva: 'COLLECTEE' }],
};
const tauxEnc = { tauxPdb: 1900, tvaInitiale: c(20000), baseInitiale: c(200000), tvaDejaExigible: c(0), baseDejaExigible: c(0) };
const encaissement = {
  id: 'e2', journal: 'BQ', date: '2026-11-20', montant: c(220000), codesLettrageExistants: [], comptes: COMPTES,
  facture: { id: 'f1', auxiliaire: 'CLIENT1', cas: 'B', ttc: c(220000), dejaEncaisse: c(0), parTaux: [tauxEnc], ligneClient: { id: 'f1-1', compte: 'CLI', auxiliaire: 'CLIENT1', debit: c(220000), credit: c(0) } },
};

/** Jeu sain : une donnée par règle (un objet par code), société Lemoine Rénovation, deux séries, un avoir, un acompte. */
export function jeuSain(): Jeu {
  return structuredClone({
    'CC-V01': { ht: c(HT), tva: c(TVA), ttc: c(HT + TVA) },
    'CC-V02': { lignes: [{ tauxPdb: TAUX_TEST, baseCentimes: c(HT), tvaLueCentimes: c(TVA) }], tauxAttendus: [TAUX_TEST] },
    'CC-V03': { lignes: [{ tauxPdb: TAUX_TEST, baseCentimes: c(HT), tvaLueCentimes: c(TVA) }], tauxAttendus: [TAUX_TEST] },
    'CC-V04': { pieces: [piece('a', 'FA-001', '2026-03-01', 1), piece('b', 'FA-002', '2026-03-02', 1), piece('c', 'FA-003', '2026-03-03', 1), piece('d', 'XX-001', '2026-03-04', 1), piece('e', 'XX-002', '2026-03-05', 1)], maxTrous: 5 },
    'CC-V05': { pieces: [piece('a', 'FA-001', '2026-03-01', 1), piece('b', 'FA-002', '2026-03-02', 2), piece('d', 'XX-001', '2026-03-04', 1), piece('e', 'XX-002', '2026-03-05', 2)], maxTrous: 5 },
    'CC-V06': { pieces: [piece('a', 'FA-001', '2026-03-01', 1), piece('b', 'FA-002', '2026-03-02', 1), piece('c', 'FA-003', '2026-03-03', 1)], maxTrous: 5 },
    'CC-V07': { requises: [{ code: 'M-FRANCHISE', condition: 'franchise' }], lues: { 'M-FRANCHISE': 'presente' }, contexte: { natureClient: 'professionnel', franchise: true, htCentimes: c(HT) } },
    'CC-V08': { cas: 'A', nature: 'bien', dates: { dateFacture: '2026-03-01', dateOperation: '2026-02-20' } },
    'CC-V09': { dateFacture: '2026-06-15', exercices, periodesVerrouillees: [] },
    'CC-V10': [{ id: 'a', recuLe: '2026-03-01', cle: 'k1' }, { id: 'b', recuLe: '2026-03-02', cle: 'k2' }, { id: 'c', recuLe: '2026-03-03', cle: null }],
    'CC-V11': { dateFacture: '2026-06-15', dateImmatriculation: '2026-04-01', exercices, periodesVerrouillees: [] },
    'CC-V12': { avoir: { ttc: c(5000), referenceLue: 'FA-001' }, factures: [facture] },
    'CC-V13': { avoir: { ttc: c(5000), referenceLue: 'FA-001' }, factures: [facture] },
    'CC-V14': { totalTtc: c(12000), acomptesTtc: [c(3000), c(3000)], soldeTtc: c(6000) },
    'CC-V15': { nature: 'professionnel', siren: '123456782' },
    'CC-V16': { ...ecritureFacture },
    'CC-V17': { pays: 'DE', statutVies: 'verifie', paysUe: PAYS_UE_TEST },
    'CC-V18': encaissement,
    'CC-V19': { creances: [creance('f1', 6000), creance('f2', 4000)], dateReference: '2026-06-30', bornesJours: BORNES_TEST, solde411: c(10000) },
    'CC-V20': { dateFacture: '2026-10-01', paysClient: 'FR', natureClient: 'professionnel', origine: 'plateforme_agreee', parametre: { valeur: '2026-09-01', statut: 'valide' } },
  });
}

/** Chaque modification touche UN seul champ du jeu sain. */
const MODIFS: Record<string, (j: Jeu) => void> = {
  'CC-V01': (j) => { j['CC-V01'].ttc = c(HT + TVA + 1); },
  'CC-V02': (j) => { j['CC-V02'].lignes[0].tvaLueCentimes = c(TVA + 3); },
  'CC-V03': (j) => { j['CC-V03'].lignes[0].tauxPdb = TAUX_INCONNU_TEST; },
  'CC-V04': (j) => { j['CC-V04'].pieces[1].numero = 'FA-005'; },
  'CC-V05': (j) => { j['CC-V05'].pieces[3].numero = 'XX-001'; },
  'CC-V06': (j) => { j['CC-V06'].pieces[2].dateFacture = '2026-02-20'; },
  'CC-V07': (j) => { j['CC-V07'].lues = {}; },
  'CC-V08': (j) => { delete j['CC-V08'].dates.dateOperation; },
  'CC-V09': (j) => { j['CC-V09'].dateFacture = '2027-01-01'; },
  'CC-V10': (j) => { j['CC-V10'][1].cle = 'k1'; },
  'CC-V11': (j) => { j['CC-V11'].dateImmatriculation = '2026-07-01'; },
  'CC-V12': (j) => { j['CC-V12'].avoir.referenceLue = 'FA-009'; },
  'CC-V13': (j) => { j['CC-V13'].avoir.ttc = c(10001); },
  'CC-V14': (j) => { j['CC-V14'].soldeTtc = c(6100); },
  'CC-V15': (j) => { j['CC-V15'].siren = ''; },
  'CC-V16': (j) => { j['CC-V16'].profil.regimeTva = 'franchise'; },
  'CC-V17': (j) => { j['CC-V17'].statutVies = 'non_verifie'; },
  'CC-V18': (j) => { j['CC-V18'].montant = c(220001); },
  'CC-V19': (j) => { j['CC-V19'].solde411 = c(9900); },
  'CC-V20': (j) => { j['CC-V20'].origine = 'depot'; },
};

/** Jeu sain avec l'anomalie du code donné (CC-V01 à CC-V20). */
export function injecter(code: string): Jeu {
  const modif = MODIFS[code];
  if (modif === undefined) throw new Error(`code inconnu : ${code}`);
  const j = jeuSain();
  modif(j);
  return j;
}
