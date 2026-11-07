import { ErreurProfil, exigerDate } from './types.js';

export type ReponsesPerimetre = {
  formeLue: string;
  cotee: boolean | null;
  commissaireAuxComptes: 'oui' | 'non' | 'je_ne_sais_pas';
  paie: boolean | null;
  plusieursPays: boolean | null;
  codePostalSiege: string | null;
};
export type ReglesPerimetre = { formesHorsPerimetre: readonly string[]; prefixesPostauxExclus: readonly string[] };
export type ResultatPerimetre = { bloque: boolean; motifs: string[]; questionsAvantCloture: string[]; aPoser: string[] };
export type LigneSiege = { effetDebut: string; codePostal: string };

const FORME_CODE_POSTAL = /^[0-9][0-9][0-9][0-9][0-9]$/;

function verifierPrefixes(regles: ReglesPerimetre): void {
  if (regles.prefixesPostauxExclus.some((p) => !/^\d+$/.test(p))) throw new ErreurProfil('prefixe_invalide');
}

function motifSiege(codePostal: string, regles: ReglesPerimetre): 'code_postal_invalide' | 'siege_exclu' | null {
  if (!FORME_CODE_POSTAL.test(codePostal)) return 'code_postal_invalide';
  return regles.prefixesPostauxExclus.some((p) => codePostal.startsWith(p)) ? 'siege_exclu' : null;
}

export function verifierPerimetre(reponses: ReponsesPerimetre, regles: ReglesPerimetre): ResultatPerimetre {
  verifierPrefixes(regles);
  const motifs: string[] = [];
  const aPoser: string[] = [];
  const questionsAvantCloture: string[] = [];
  if (regles.formesHorsPerimetre.includes(reponses.formeLue)) motifs.push('forme_hors_perimetre');
  if (reponses.cotee === null) aPoser.push('cotee');
  else if (reponses.cotee) motifs.push('societe_cotee');
  if (reponses.commissaireAuxComptes === 'oui') motifs.push('commissaire_aux_comptes');
  else if (reponses.commissaireAuxComptes === 'je_ne_sais_pas') questionsAvantCloture.push('commissaire_aux_comptes');
  if (reponses.paie === null) aPoser.push('paie');
  else if (reponses.paie) motifs.push('paie');
  if (reponses.plusieursPays === null) aPoser.push('plusieurs_pays');
  else if (reponses.plusieursPays) motifs.push('plusieurs_pays');
  if (reponses.codePostalSiege === null) aPoser.push('code_postal_siege');
  else {
    const m = motifSiege(reponses.codePostalSiege, regles);
    if (m !== null) motifs.push(m);
  }
  return { bloque: motifs.length > 0, motifs, questionsAvantCloture, aPoser };
}

export function bloqueALaDate(historiqueSiege: readonly LigneSiege[], date: string, regles: ReglesPerimetre): boolean {
  verifierPrefixes(regles);
  exigerDate(date, 'date');
  let retenue: LigneSiege | null = null;
  for (const ligne of historiqueSiege) {
    exigerDate(ligne.effetDebut, 'effetDebut');
    if (ligne.effetDebut <= date && (retenue === null || ligne.effetDebut > retenue.effetDebut)) retenue = ligne;
  }
  return retenue !== null && motifSiege(retenue.codePostal, regles) !== null;
}
