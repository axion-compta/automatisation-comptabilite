// Clients de vente : doublons probables (proposition seulement), plan de fusion, désactivation, nature datée.
// Aucune fusion n'est faite ici : le plan garde le code le plus ancien et ne touche aucune ligne validée.
import type { Centimes } from '../argent/index.js';
import { estDateValide } from '../dates/civiles.js';
import { normaliserNom } from './clients.js';
import { ErreurVente, NATURES_CLIENT, estDans } from './types.js';
import type { NatureClient } from './types.js';

export interface ClientDoublon {
  code: string;
  nom: string;
  siren?: string;
  codePostal?: string;
  creeLe: string;
}
export type MotifDoublon = 'meme_siren' | 'meme_nom_et_code_postal';
export interface PaireDoublon {
  a: ClientDoublon;
  b: ClientDoublon;
  motif: MotifDoublon;
}
export interface NatureDatee {
  nature: NatureClient;
  depuis: string;
}

function exigerDate(d: unknown, champ: string): string {
  if (typeof d !== 'string' || !estDateValide(d)) throw new ErreurVente('date_invalide', `Date invalide : ${champ}.`);
  return d;
}

function exigerClient(x: ClientDoublon): void {
  if (typeof x.code !== 'string' || x.code === '') throw new ErreurVente('code_vide', 'Code client obligatoire.');
  exigerDate(x.creeLe, 'creeLe');
}

const compact = (t: string | undefined): string => (typeof t === 'string' ? t.replace(/\s+/gu, '') : '');

function ajouterIndex(index: Map<string, ClientDoublon[]>, cle: string, client: ClientDoublon): void {
  const groupe = index.get(cle);
  if (groupe === undefined) index.set(cle, [client]);
  else groupe.push(client);
}

/** Paires proposées, chacune une fois, triées par codes ; le SIREN prime sur le nom + code postal. */
export function doublonsProbables(clients: readonly ClientDoublon[]): PaireDoublon[] {
  clients.forEach(exigerClient);
  const tries = [...clients].sort((x, y) => (x.code < y.code ? -1 : x.code > y.code ? 1 : 0));
  const parSiren = new Map<string, ClientDoublon[]>();
  const parNom = new Map<string, ClientDoublon[]>();
  for (const cl of tries) {
    const siren = compact(cl.siren);
    if (siren !== '') ajouterIndex(parSiren, siren, cl);
    const nom = normaliserNom(cl.nom);
    const cp = compact(cl.codePostal);
    if (nom !== '' && cp !== '') ajouterIndex(parNom, `${nom}|${cp}`, cl);
  }
  const vues = new Map<string, PaireDoublon>();
  const collecter = (index: Map<string, ClientDoublon[]>, motif: MotifDoublon): void => {
    for (const groupe of index.values()) {
      groupe.forEach((a, i) => {
        for (const b of groupe.slice(i + 1)) {
          const cle = `${a.code}\u0001${b.code}`;
          if (!vues.has(cle)) vues.set(cle, { a, b, motif });
        }
      });
    }
  };
  collecter(parSiren, 'meme_siren');
  collecter(parNom, 'meme_nom_et_code_postal');
  return [...vues.values()].sort((p, q) => (p.a.code === q.a.code ? (p.b.code < q.b.code ? -1 : 1) : p.a.code < q.a.code ? -1 : 1));
}

/** Le plus ancien (`creeLe`), puis le code le plus petit, est conservé. */
export function planFusion(a: ClientDoublon, b: ClientDoublon): { codeConserve: string; codeRetire: string } {
  exigerClient(a);
  exigerClient(b);
  if (a.code === b.code) throw new ErreurVente('fusion_meme_client', 'Un client ne se fusionne pas avec lui-même.');
  const aGarde = a.creeLe === b.creeLe ? a.code < b.code : a.creeLe < b.creeLe;
  return aGarde ? { codeConserve: a.code, codeRetire: b.code } : { codeConserve: b.code, codeRetire: a.code };
}

export function peutDesactiver(solde411: Centimes): boolean {
  if (typeof solde411 !== 'number' || !Number.isSafeInteger(solde411)) {
    throw new ErreurVente('montant_invalide', 'Solde 411 invalide.');
  }
  return solde411 === 0;
}

/** Nature en vigueur à la date (dernière `depuis` ≤ date) ; `a_confirmer` si aucune. */
export function natureALaDate(historique: readonly NatureDatee[], date: string): NatureClient {
  exigerDate(date, 'date');
  let retenue: NatureDatee | undefined;
  for (const h of historique) {
    exigerDate(h.depuis, 'depuis');
    if (!estDans(NATURES_CLIENT, h.nature)) throw new ErreurVente('nature_inconnue', 'Nature de client inconnue.');
    if (h.depuis <= date && (retenue === undefined || h.depuis > retenue.depuis)) retenue = h;
  }
  return retenue === undefined ? 'a_confirmer' : retenue.nature;
}
