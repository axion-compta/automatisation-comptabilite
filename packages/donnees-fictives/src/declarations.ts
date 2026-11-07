// Jeu fictif des déclarations à graine fixe (V3-PRI-010, V3-TVA-015, V3-FEC-013). Aucune donnée réelle.
// Codes de formulaire, de lignes, validateurs, SIREN et dates d'échéance : tous inventés.
import { genererCompta, type EcritureCompta } from './compta.js';
import { creerAlea, GRAINE } from './generateur.js';

export type Profil = 'pleine' | 'vide';

export interface SourceCase {
  ecritureId: string;
  ligneIndex: number;
}

export interface CaseDeclaration {
  code: string;
  montantCentimes: number;
  baseCentimes: number | null;
  sources: SourceCase[];
}

export interface PeriodeTva {
  id: string;
  exerciceId: string;
  debut: string;
  fin: string;
  statut: 'ouverte' | 'validee' | 'deposee_par_client';
  formulaire: string;
}

export interface DeclarationFictive {
  id: string;
  periodeId: string;
  formulaire: string;
  millesime: number;
  statut: 'validee' | 'deposee_par_client';
  cases: CaseDeclaration[];
  validePar: string | null;
  valideLe: string | null;
  versionPaquet: number;
}

export interface EstimationFictive {
  exerciceId: string;
  etat: 'calculee' | 'non_calculee';
  motif?: 'tva_en_doute' | 'regime_non_traite';
  piecesARegarder?: number;
  collecteeCentimes?: number;
  deductibleCentimes?: number;
}

export interface FecFictif {
  id: string;
  exerciceId: string;
  version: number;
  statut: 'travail' | 'definitif' | 'remplace';
  sha256: string;
  nomFichier: string;
  preparePar: string;
  prepareLe: string;
  resultatControles: 'ok' | 'ecarts';
  controles: { regleId: string; nombreEcarts: number }[];
  motif: string | null;
  destinataire: string | null;
}

export interface TraceControle {
  regleId: string;
  gravite: 'info' | 'bloquante';
  objetType: string;
  objetId: string;
  resultat: 'ok' | 'ecart';
  valeur: string | null;
  ecartCentimes: number | null;
  horodatage: string;
}

export interface EcheanceFictive {
  code: string;
  dateLimite: string;
  statut: 'a_venir' | 'passee';
  dateAVerifier: boolean;
  niveau: 'info' | 'attention';
}

export interface JeuDeclarations {
  version: 1;
  periodesTva: PeriodeTva[];
  declarations: DeclarationFictive[];
  estimations: EstimationFictive[];
  fec: FecFictif[];
  traces: TraceControle[];
  echeances: EcheanceFictive[];
}

const SIREN_FICTIF = '123456782';
const VALIDEUR = 'Camille Fictif';
const PREPARATEUR = 'Assistant fictif';
const CODES_CASES = ['X01', 'X02', 'X03'];
function hex64(alea: () => number): string {
  let s = '';
  while (s.length < 64) s += Math.floor(alea() * 16).toString(16);
  return s;
}
// Montant d'une ligne : débit + crédit (l'un des deux est nul dans le jeu comptable).
function montantLigne(e: EcritureCompta, ligneIndex: number): number {
  const l = e.lignes[ligneIndex];
  return l ? l.debitCentimes + l.creditCentimes : 0;
}
function vide(): JeuDeclarations {
  return { version: 1, periodesTva: [], declarations: [], estimations: [], fec: [], traces: [], echeances: [] };
}
export function genererDeclarations(graine: number = GRAINE, profil: Profil = 'pleine'): JeuDeclarations {
  if (profil === 'vide') return vide();
  if (!Number.isSafeInteger(graine)) throw new RangeError('graine entière attendue');
  const pleine = genererCompta(graine).societes.find((s) => s.profil === 'pleine');
  const validees = (pleine?.ecritures ?? []).filter((e) => e.statut === 'validee');
  const alea = creerAlea(graine);
  const periodes: PeriodeTva[] = [
    { id: 'PER2025T4', exerciceId: 'EX2025', debut: '2025-10-01', fin: '2025-12-31', statut: 'validee', formulaire: 'FORM_A' },
    { id: 'PER2026T1', exerciceId: 'EX2026', debut: '2026-01-01', fin: '2026-03-31', statut: 'deposee_par_client', formulaire: 'FORM_A' },
    { id: 'PER2026T2', exerciceId: 'EX2026', debut: '2026-04-01', fin: '2026-06-30', statut: 'ouverte', formulaire: 'FORM_A' },
  ];
  const declarations: DeclarationFictive[] = [];
  for (const p of periodes) {
    if (p.statut === 'ouverte') continue;
    const cases: CaseDeclaration[] = CODES_CASES.map((code, i) => {
      const sources: SourceCase[] = [];
      const choix = [validees.filter((e) => e.date >= p.debut && e.date <= p.fin), validees.filter((e) => e.date.startsWith(p.fin.slice(0, 4)))].find((l) => l.length > 0) ?? validees;
      for (let k = 0, essais = 0; k < 2 && essais < 50; essais++) {
        const e = choix[Math.floor(alea() * choix.length)];
        if (!e) break;
        const ligneIndex = Math.floor(alea() * e.lignes.length);
        if (sources.some((s) => s.ecritureId === e.id && s.ligneIndex === ligneIndex)) continue;
        sources.push({ ecritureId: e.id, ligneIndex });
        k++;
      }
      const montant = sources.reduce((t, s) => t + montantLigne(validees.find((e) => e.id === s.ecritureId) as EcritureCompta, s.ligneIndex), 0);
      return { code, montantCentimes: montant, baseCentimes: i === 2 ? null : montant * 7 + 3, sources };
    });
    const validee = p.statut === 'validee';
    declarations.push({
      id: `DEC${p.id.slice(3)}`,
      periodeId: p.id,
      formulaire: p.formulaire,
      millesime: Number(p.fin.slice(0, 4)),
      statut: p.statut === 'validee' ? 'validee' : 'deposee_par_client',
      cases,
      validePar: validee ? VALIDEUR : null,
      valideLe: validee ? '2026-01-15' : null,
      versionPaquet: 1,
    });
  }
  const sommeCases = (code: string): number =>
    declarations.filter((d) => d.periodeId.startsWith('PER2025')).reduce((t, d) => t + (d.cases.find((c) => c.code === code)?.montantCentimes ?? 0), 0);
  const estimations: EstimationFictive[] = [
    { exerciceId: 'EX2025', etat: 'calculee', collecteeCentimes: sommeCases('X01'), deductibleCentimes: sommeCases('X02') },
    { exerciceId: 'EX2026', etat: 'non_calculee', motif: 'tva_en_doute', piecesARegarder: 2 },
  ];
  const ctl = [{ regleId: 'CTL_A', nombreEcarts: 0 }, { regleId: 'CTL_B', nombreEcarts: 0 }];
  const fec: FecFictif[] = [
    { id: 'FEC001', exerciceId: 'EX2026', version: 1, statut: 'travail', sha256: hex64(alea), nomFichier: `${SIREN_FICTIF}FEC20261231_TRAVAIL.txt`, preparePar: PREPARATEUR, prepareLe: '2026-07-01T09:00:00Z', resultatControles: 'ok', controles: ctl, motif: null, destinataire: null },
    { id: 'FEC002', exerciceId: 'EX2025', version: 1, statut: 'remplace', sha256: hex64(alea), nomFichier: `${SIREN_FICTIF}FEC20251231.txt`, preparePar: PREPARATEUR, prepareLe: '2026-02-01T09:00:00Z', resultatControles: 'ecarts', controles: [{ regleId: 'CTL_A', nombreEcarts: 0 }, { regleId: 'CTL_B', nombreEcarts: 2 }], motif: null, destinataire: 'Cabinet Fictif' },
    { id: 'FEC003', exerciceId: 'EX2025', version: 2, statut: 'definitif', sha256: hex64(alea), nomFichier: `${SIREN_FICTIF}FEC20251231.txt`, preparePar: PREPARATEUR, prepareLe: '2026-02-10T09:00:00Z', resultatControles: 'ok', controles: ctl, motif: 'Correction fictive de deux écritures', destinataire: 'Cabinet Fictif' },
  ];
  const traces: TraceControle[] = validees.slice(0, 3).map((e, i) => ({
    regleId: i === 2 ? 'CTL_B' : 'CTL_A',
    gravite: i === 2 ? 'bloquante' : 'info',
    objetType: 'ecriture',
    objetId: e.id,
    resultat: i === 2 ? 'ecart' : 'ok',
    valeur: i === 2 ? 'ecart de 1 centime' : null,
    ecartCentimes: i === 2 ? 1 : null,
    horodatage: `2026-02-0${i + 1}T10:00:00Z`,
  }));
  const echeances: EcheanceFictive[] = [
    { code: 'ECH_A', dateLimite: '2026-04-20', statut: 'passee', dateAVerifier: true, niveau: 'info' },
    { code: 'ECH_B', dateLimite: '2026-07-20', statut: 'a_venir', dateAVerifier: true, niveau: 'attention' },
  ];
  return { version: 1, periodesTva: periodes, declarations, estimations, fec, traces, echeances };
}
function trier(valeur: unknown): unknown {
  if (Array.isArray(valeur)) return valeur.map(trier);
  if (valeur !== null && typeof valeur === 'object') {
    const source = valeur as Record<string, unknown>;
    const sortie: Record<string, unknown> = {};
    for (const cle of Object.keys(source).sort()) sortie[cle] = trier(source[cle]);
    return sortie;
  }
  return valeur;
}
// JSON stable : clés triées, deux espaces, fin de ligne.
export function serialiserDeclarations(jeu: JeuDeclarations): string {
  return `${JSON.stringify(trier(jeu), null, 2)}\n`;
}
