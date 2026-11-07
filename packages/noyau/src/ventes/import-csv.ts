import { ErreurVente } from './types.js';

export type SeparateurCsv = ',' | ';' | '\t';
export type ChampImport = 'numero' | 'date' | 'client' | 'ht' | 'tva' | 'ttc' | 'taux' | 'sirenClient';
export interface ProfilColonnes {
  enTete: boolean;
  colonnes: Record<Exclude<ChampImport, 'taux' | 'sirenClient'>, string | number> &
    Partial<Record<'taux' | 'sirenClient', string | number>>;
}
export interface RejetImport {
  ligne: number;
  raison: 'colonne_absente' | 'nombre_de_colonnes';
}

const BOM = '﻿';
const GUILLEMET = '"';

export function lireCsv(texte: string, options: { separateur: SeparateurCsv }): string[][] {
  const { separateur } = options;
  const debut = texte.startsWith(BOM) ? 1 : 0;
  const lignes: string[][] = [];
  let ligne: string[] = [];
  let champ = '';
  let dansGuillemets = false;
  let ouvertureLigne = 0;
  let numero = 1;
  let debutChamp = true;
  let vide = true;
  for (let i = debut; i < texte.length; i++) {
    const c = texte.charAt(i);
    if (dansGuillemets) {
      if (c === GUILLEMET) {
        if (texte.charAt(i + 1) === GUILLEMET) {
          champ += GUILLEMET;
          i++;
        } else dansGuillemets = false;
      } else {
        if (c === '\n') numero++;
        champ += c;
      }
      continue;
    }
    vide = false;
    if (c === GUILLEMET && debutChamp) {
      dansGuillemets = true;
      ouvertureLigne = numero;
    } else if (c === separateur) {
      ligne.push(champ);
      champ = '';
      debutChamp = true;
      continue;
    } else if (c === '\n' || (c === '\r' && texte.charAt(i + 1) === '\n')) {
      if (c === '\r') i++;
      ligne.push(champ);
      lignes.push(ligne);
      ligne = [];
      champ = '';
      numero++;
      debutChamp = true;
      vide = true;
      continue;
    } else champ += c;
    debutChamp = false;
  }
  if (dansGuillemets) throw new ErreurVente('csv_mal_forme', `Guillemet non fermé, ligne ${ouvertureLigne}.`);
  if (!vide || ligne.length > 0 || champ !== '') {
    ligne.push(champ);
    lignes.push(ligne);
  }
  return lignes;
}

const OBLIGATOIRES: readonly ChampImport[] = ['numero', 'date', 'client', 'ht', 'tva', 'ttc'];
const FACULTATIFS: readonly ChampImport[] = ['taux', 'sirenClient'];

function resoudre(ref: string | number | undefined, entete: string[] | null, largeur: number): number | null {
  if (typeof ref === 'number') return Number.isSafeInteger(ref) && ref >= 0 && ref < largeur ? ref : null;
  if (typeof ref !== 'string' || entete === null) return null;
  const k = entete.indexOf(ref);
  return k < 0 ? null : k;
}

export function appliquerProfil(
  lignes: string[][],
  profil: ProfilColonnes,
): { objets: Record<string, string>[]; rejets: RejetImport[] } {
  const objets: Record<string, string>[] = [];
  const rejets: RejetImport[] = [];
  const entete = profil.enTete ? (lignes[0] ?? null) : null;
  const premier = profil.enTete ? 1 : 0;
  const largeur = (entete ?? lignes[0] ?? []).length;
  const index = new Map<ChampImport, number>();
  let complet = true;
  for (const champ of [...OBLIGATOIRES, ...FACULTATIFS]) {
    const ref = profil.colonnes[champ as keyof ProfilColonnes['colonnes']];
    if (ref === undefined && FACULTATIFS.includes(champ)) continue;
    const k = resoudre(ref, entete, largeur);
    if (k === null) complet = false;
    else index.set(champ, k);
  }
  for (let i = premier; i < lignes.length; i++) {
    const cellules = lignes[i] ?? [];
    if (!complet) rejets.push({ ligne: i + 1, raison: 'colonne_absente' });
    else if (cellules.length !== largeur) rejets.push({ ligne: i + 1, raison: 'nombre_de_colonnes' });
    else {
      const objet: Record<string, string> = {};
      for (const [champ, k] of index) objet[champ] = cellules[k] ?? '';
      objets.push(objet);
    }
  }
  return { objets, rejets };
}
