// Cohérence du FEC : numérotation continue par journal, libellé unique par compte, tiers, codes journal.
// Entrée : lignes déjà lues (L03-T10). La liste des journaux et la lecture d'un rang sont des arguments.
import { verifierSuite } from '../ecritures/numerotation.js';
import type { EcartFec, LigneFecLue, RegleFec } from './controles-structure.js';

export const REGLES_COHERENCE: readonly RegleFec[] = [
  { id: 'FEC-C01', libelle: 'Trou ou doublon de numérotation dans un journal', gravite: 'B', source: 'a_sourcer', testId: 'trou-detecte-fec-c01' },
  { id: 'FEC-C02', libelle: 'Deux libellés pour un même compte', gravite: 'B', source: 'a_sourcer', testId: 'deux-libelles-meme-compte-fec-c02' },
  { id: 'FEC-C03', libelle: 'Tiers incohérent (numéro ou nom manquant)', gravite: 'B', source: 'a_sourcer', testId: 'tiers-sans-nom-fec-c03' },
  { id: 'FEC-C04', libelle: 'Code journal hors de la liste fermée', gravite: 'B', source: 'a_sourcer', testId: 'journal-hors-liste-fec-c04' },
];

export interface ParametresCoherence {
  rangDe: (numero: string) => number | undefined;
  journauxPermis: readonly string[];
}

function premiere(l: LigneFecLue, avant: number | undefined): number {
  return avant === undefined ? l.numero : Math.min(avant, l.numero);
}

export function controlerCoherence(lignes: readonly LigneFecLue[], p: ParametresCoherence): EcartFec[] {
  const ecarts: EcartFec[] = [];
  const journaux = new Map<string, Map<string, number>>();
  const premiereLigneJournal = new Map<string, number>();
  const libelles = new Map<string, Map<string, number>>();
  const refuses = new Map<string, number>();
  for (const l of lignes) {
    const { journalCode, ecritureNum, compteNum, compteLib } = l.valeurs;
    const numeros = journaux.get(journalCode) ?? new Map<string, number>();
    numeros.set(ecritureNum, premiere(l, numeros.get(ecritureNum)));
    journaux.set(journalCode, numeros);
    premiereLigneJournal.set(journalCode, premiere(l, premiereLigneJournal.get(journalCode)));
    const libs = libelles.get(compteNum) ?? new Map<string, number>();
    libs.set(compteLib, premiere(l, libs.get(compteLib)));
    libelles.set(compteNum, libs);
    if (!p.journauxPermis.includes(journalCode)) refuses.set(journalCode, premiere(l, refuses.get(journalCode)));
  }
  for (const [journal, numeros] of journaux) {
    const rangs: number[] = [];
    for (const [numero, ligne] of numeros) {
      const rang = p.rangDe(numero);
      if (rang === undefined || !Number.isSafeInteger(rang) || rang < 1) {
        ecarts.push({ regleId: 'FEC-C01', ligne, champ: 'ecritureNum', valeur: numero });
        continue;
      }
      rangs.push(rang);
    }
    const suite = verifierSuite(rangs);
    const ligneJournal = premiereLigneJournal.get(journal) ?? 1;
    for (const rang of suite.trous) ecarts.push({ regleId: 'FEC-C01', ligne: ligneJournal, champ: 'ecritureNum', valeur: `${journal} rang ${String(rang)} manquant` });
    for (const rang of suite.doublons) ecarts.push({ regleId: 'FEC-C01', ligne: ligneJournal, champ: 'ecritureNum', valeur: `${journal} rang ${String(rang)} en double` });
  }
  for (const [compte, libs] of libelles) {
    if (libs.size > 1) ecarts.push({ regleId: 'FEC-C02', ligne: Math.min(...libs.values()), champ: 'compteLib', valeur: compte });
  }
  for (const l of lignes) {
    if ((l.valeurs.compAuxNum === '') !== (l.valeurs.compAuxLib === '')) {
      const champ = l.valeurs.compAuxNum === '' ? 'compAuxNum' : 'compAuxLib';
      ecarts.push({ regleId: 'FEC-C03', ligne: l.numero, champ, valeur: l.valeurs.compAuxNum + l.valeurs.compAuxLib });
    }
  }
  for (const [journal, ligne] of refuses) ecarts.push({ regleId: 'FEC-C04', ligne, champ: 'journalCode', valeur: journal });
  return ecarts;
}
