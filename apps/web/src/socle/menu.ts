// Seule source des entrées de navigation (V3-UX-001) : identifiant, libellé, chemin, et ordre sur bureau et téléphone.
// Menu « à confirmer par Will » : ne le modifier qu'ici (et dans packages/textes/src/ecrans/socle.ts pour les libellés).
import { socle } from '../../../../packages/textes/src/ecrans/socle.js';

export type EntreeMenu = { id: string; chemin: string; libelle: string };

// Pas encore de clé « Réglages » dans packages/textes (hors périmètre de L01-T33) : libellé gardé ici, à déplacer ensuite.
const LIBELLE_REGLAGES = 'Réglages';

const TOUTES: readonly EntreeMenu[] = [
  { id: 'activite', chemin: '/activite', libelle: socle.menu.activite },
  { id: 'mois', chemin: '/mois', libelle: socle.menu.mois },
  { id: 'banque', chemin: '/banque', libelle: socle.menu.banque },
  { id: 'factures', chemin: '/factures', libelle: socle.menu.factures },
  { id: 'declarations', chemin: '/declarations', libelle: socle.menu.declarations },
  { id: 'documents', chemin: '/documents', libelle: socle.menu.documents },
  { id: 'reglages', chemin: '/reglages', libelle: LIBELLE_REGLAGES },
];

function choisir(ids: readonly string[]): EntreeMenu[] {
  return ids.map((id) => {
    const e = TOUTES.find((x) => x.id === id);
    if (!e) throw new Error('entrée de menu inconnue : ' + id);
    return e;
  });
}

/** Menu de bureau : 6 entrées, dans cet ordre. */
export const MENU_BUREAU: readonly EntreeMenu[] = choisir(['activite', 'mois', 'banque', 'factures', 'declarations', 'documents']);

/** Barre du bas sur téléphone : 4 entrées, puis « Plus » (5e). */
export const BARRE_MOBILE: readonly EntreeMenu[] = choisir(['activite', 'mois', 'banque', 'documents']);

/** Panneau ouvert par « Plus ». */
export const MENU_PLUS: readonly EntreeMenu[] = choisir(['factures', 'declarations', 'reglages']);

/** Tous les libellés que le menu peut rendre (sert au test « une seule source »). */
export const LIBELLES_MENU: readonly string[] = [...TOUTES.map((e) => e.libelle), socle.barre.plus, socle.discuter];

/** Entrée active : le chemin exact, ou un chemin enfant (« /declarations/tva » active « /declarations »). */
export function estActive(chemin: string, pathname: string): boolean {
  return pathname === chemin || pathname.startsWith(chemin + '/');
}
