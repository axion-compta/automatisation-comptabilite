import { ErreurRgpd, MARQUES, verifierMotif, type EvenementPersonne, type Marque } from './types.js';

export const USAGES = ['affichage', 'ia', 'export_client', 'conservation_legale', 'export_fin_contrat'] as const;
export type Usage = (typeof USAGES)[number];
export type ObjetMarque = { id: string; source?: string; marques?: readonly Marque[] };

const toutFaux = { affichage: false, ia: false, export_client: false, conservation_legale: false, export_fin_contrat: false };
export const LISIBILITE: Readonly<Record<Marque, Readonly<Record<Usage, boolean>>>> = Object.freeze({
  a_effacer: Object.freeze({ ...toutFaux, conservation_legale: true }),
  limitee: Object.freeze({ ...toutFaux, conservation_legale: true, export_fin_contrat: true }),
  oubliee: Object.freeze({ ...toutFaux }),
});

export function lisible(marques: readonly Marque[], usage: Usage): boolean {
  if (!USAGES.includes(usage)) throw new ErreurRgpd('valeur_interdite');
  for (const m of marques) if (!MARQUES.includes(m)) throw new ErreurRgpd('marque_inconnue');
  return marques.every((m) => LISIBILITE[m][usage]);
}

export function filtrer<T extends ObjetMarque>(liste: readonly T[], usage: Usage): T[] {
  return liste.filter((o) => lisible(o.marques ?? [], usage));
}

const TYPE_PAR_MARQUE = {
  a_effacer: 'personne.marque_a_effacer',
  limitee: 'personne.limitation',
  oubliee: 'personne.preference_oubliee',
} as const;

export function poserMarque<T extends ObjetMarque>(
  objet: T, marque: Marque, ctx: { le: string; par: string },
): { objet: T; evenement: EvenementPersonne } {
  if (!MARQUES.includes(marque)) throw new ErreurRgpd('marque_inconnue');
  if (marque === 'oubliee' && objet.source !== 'preference') throw new ErreurRgpd('valeur_interdite');
  if (typeof ctx.le !== 'string' || Number.isNaN(Date.parse(ctx.le))) throw new ErreurRgpd('horodatage_invalide');
  const marques = [...new Set([...(objet.marques ?? []), marque])].sort();
  return {
    objet: { ...objet, marques },
    evenement: { type: TYPE_PAR_MARQUE[marque], horodatage: ctx.le, demandeId: null, donnees: { marque, par: ctx.par } },
  };
}

export function leverLimitation<T extends ObjetMarque>(objet: T, ctx: { motif: string }): T {
  verifierMotif(ctx.motif);
  return { ...objet, marques: (objet.marques ?? []).filter((m) => m !== 'limitee') };
}
