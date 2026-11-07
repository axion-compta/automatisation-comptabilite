// Seuils de volume et limites glissantes du chat. Toutes les valeurs viennent des réglages (arguments).
import { ErreurChat } from './types.js';

export type Seuils = { annonce: number; recapitulatif: number; maxProposition: number; renvoiEcran: number };
export type ClasseVolume = 'simple' | 'annonce' | 'recapitulatif' | 'renvoi_ecran';
export type Evenement = { horodatageMs: number; personne: string; societe: string; objets: number };
export type Demande = { personne: string; societe: string; objets: number };
export type Limites = { fenetrePropositionsMs: number; maxPropositions: number; fenetreObjetsMs: number; maxObjets: number };
export type Verdict = { permis: true } | { permis: false; code: 'trop_de_demandes' | 'volume_trop_grand' };

const invalide = () => new ErreurChat('parametre_invalide');
const entierPositif = (n: number) => Number.isSafeInteger(n) && n >= 0;

/** Ordre exigé : annonce < recapitulatif <= maxProposition <= renvoiEcran. */
export function classerVolume(n: number, s: Seuils): ClasseVolume {
  const { annonce, recapitulatif, maxProposition, renvoiEcran } = s;
  const valides = [n, annonce, recapitulatif, maxProposition, renvoiEcran].every(entierPositif);
  if (!valides || annonce >= recapitulatif || recapitulatif > maxProposition || maxProposition > renvoiEcran) throw invalide();
  if (n > maxProposition || n >= renvoiEcran) return 'renvoi_ecran';
  if (n >= recapitulatif) return 'recapitulatif';
  return n >= annonce ? 'annonce' : 'simple';
}

/** Un événement à exactement `maintenant - fenetre` est sorti de la fenêtre. */
export function verifierLimites(historique: readonly Evenement[], d: Demande, maintenantMs: number, l: Limites): Verdict {
  const nombres = [maintenantMs, d.objets, l.fenetrePropositionsMs, l.maxPropositions, l.fenetreObjetsMs, l.maxObjets];
  if (!nombres.every(entierPositif) || l.fenetrePropositionsMs < 1 || l.fenetreObjetsMs < 1) throw invalide();
  const miens = historique.filter((e) => e.personne === d.personne && e.societe === d.societe);
  const dans = (e: Evenement, fenetre: number) => e.horodatageMs > maintenantMs - fenetre && e.horodatageMs <= maintenantMs;
  const propositions = miens.filter((e) => dans(e, l.fenetrePropositionsMs)).length;
  if (propositions + 1 > l.maxPropositions) return { permis: false, code: 'trop_de_demandes' };
  const objets = miens.filter((e) => dans(e, l.fenetreObjetsMs)).reduce((somme, e) => somme + e.objets, 0);
  if (objets + d.objets > l.maxObjets) return { permis: false, code: 'volume_trop_grand' };
  return { permis: true };
}
