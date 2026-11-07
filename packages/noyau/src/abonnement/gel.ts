// Gel pour litige ou contrôle fiscal. Le gel de la console (gelConsole) est seulement recopié.
// Le motif peut contenir des données personnelles : il va au journal de la société, jamais dans un log technique.
import { ErreurAbonnement, verifierHorodatage, type EvenementJournal, type FinContrat } from './types.js';

export type OptionsGel = {
  motif: string; par: 'client' | 'axion'; auteur: string; horodatage: string; longueurMaxMotif: number;
};
export type ResultatGel = { fin: FinContrat; evenement: EvenementJournal };

const SANS_GEL = { actif: false, motif: null, posePar: null, poseLe: null } as const;

function controler(o: OptionsGel): string {
  if (o.par !== 'client' && o.par !== 'axion') throw new ErreurAbonnement('parametre_invalide');
  if (typeof o.longueurMaxMotif !== 'number' || !Number.isSafeInteger(o.longueurMaxMotif) || o.longueurMaxMotif < 1) {
    throw new ErreurAbonnement('parametre_invalide');
  }
  if (typeof o.auteur !== 'string' || o.auteur.trim() === '') throw new ErreurAbonnement('auteur_manquant');
  verifierHorodatage(o.horodatage);
  const motif = typeof o.motif === 'string' ? o.motif.trim() : '';
  if (motif === '') throw new ErreurAbonnement('motif_manquant');
  if (motif.length > o.longueurMaxMotif) throw new ErreurAbonnement('parametre_invalide');
  return motif;
}

function evenement(type: 'fin_contrat.gel_pose' | 'fin_contrat.gel_leve', o: OptionsGel, motif: string): EvenementJournal {
  return { type, horodatage: o.horodatage, donnees: { motif, par: o.par, auteur: o.auteur } };
}

export function poserGel(fin: FinContrat, o: OptionsGel): ResultatGel {
  const motif = controler(o);
  if (fin.gelModule.actif) throw new ErreurAbonnement('gel_deja_actif');
  const gelModule = { actif: true, motif, posePar: o.auteur, poseLe: o.horodatage };
  return { fin: { ...fin, gelModule }, evenement: evenement('fin_contrat.gel_pose', o, motif) };
}

export function leverGel(fin: FinContrat, o: OptionsGel): ResultatGel {
  const motif = controler(o);
  if (!fin.gelModule.actif) throw new ErreurAbonnement('gel_inactif');
  return { fin: { ...fin, gelModule: { ...SANS_GEL } }, evenement: evenement('fin_contrat.gel_leve', o, motif) };
}
