// Jeu de référence de 1 000 pièces fictives, stratifié, à graine fixe (V3-QUA-017). Entiers seulement.
import { creerAlea } from './generateur.js';

export const STRATES = [
  'facture_simple', 'multi_taux', 'avoir', 'ticket', 'devise', 'autoliquidation',
  'fournisseur_nouveau', 'plusieurs_pages', 'scan_degrade', 'note_de_frais',
] as const;
export type Strate = (typeof STRATES)[number];

export type ValeursAttendues = {
  fournisseur: string; date: string; htCentimes: number; tvaCentimes: number; ttcCentimes: number;
  compte: string; codeTva: string;
};
export type PieceReference = {
  id: string; strate: Strate; pages: number; devise: string; degradee: boolean; attendu: ValeursAttendues;
};
export type JeuReference = { version: 1; graine: number; pieces: PieceReference[] };

const PAR_STRATE = 100;
// Taux fictifs en points de base et comptes d'essai : valeurs de test, jamais des valeurs légales.
const TAUX = [{ code: 'TF-1', pb: 1000 }, { code: 'TF-2', pb: 500 }, { code: 'TF-3', pb: 2000 }];
const COMPTES = ['606100', '613200', '622600', '625100', '626000', '651000'];
const NOMS = ['Atelier des Lilas', 'Papeterie Orme', 'Garage du Vallon', 'Maison Tilleul', 'Bureau Zéphyr', 'Cuisines Rivage'];

export function genererReference({ graine }: { graine: number }): JeuReference {
  if (!Number.isSafeInteger(graine)) throw new RangeError('graine invalide');
  const alea = creerAlea(graine);
  const entier = (n: number): number => Math.floor(alea() * n);
  const choisir = <T>(l: readonly T[]): T => l[entier(l.length)] as T;
  const pieces: PieceReference[] = [];
  STRATES.forEach((strate, s) => {
    for (let k = 0; k < PAR_STRATE; k++) {
      const numero = s * PAR_STRATE + k + 1;
      const taux = choisir(TAUX);
      const signe = strate === 'avoir' ? -1 : 1;
      const ht = signe * (1000 + entier(500000));
      let tva = strate === 'autoliquidation' ? 0 : Math.round((Math.abs(ht) * taux.pb) / 10000) * signe;
      if (tva === 0 && strate !== 'autoliquidation') tva = signe;
      let codeTva = taux.code;
      if (strate === 'multi_taux') {
        const second = choisir(TAUX.filter((t) => t.code !== taux.code));
        const part = Math.floor(ht / 2);
        tva = Math.round((Math.abs(part) * taux.pb) / 10000) * signe + Math.round((Math.abs(ht - part) * second.pb) / 10000) * signe;
        if (tva === 0) tva = signe;
        codeTva = `${taux.code}+${second.code}`;
      }
      if (strate === 'autoliquidation') codeTva = 'TF-AL';
      const jour = 1 + entier(28);
      const mois = 1 + entier(12);
      pieces.push({
        id: `ref-${String(numero).padStart(4, '0')}`,
        strate,
        pages: strate === 'plusieurs_pages' ? 2 + entier(6) : 1,
        devise: strate === 'devise' ? choisir(['XXA', 'XXB', 'XXC']) : 'XXD',
        degradee: strate === 'scan_degrade',
        attendu: {
          fournisseur: strate === 'fournisseur_nouveau' ? `Nouveau Tiers ${numero}` : choisir(NOMS),
          date: `2026-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`,
          htCentimes: ht, tvaCentimes: tva, ttcCentimes: ht + tva,
          compte: strate === 'note_de_frais' ? '625100' : choisir(COMPTES),
          codeTva,
        },
      });
    }
  });
  return { version: 1, graine, pieces };
}
