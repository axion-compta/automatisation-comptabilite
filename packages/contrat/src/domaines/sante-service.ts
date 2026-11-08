import { donneesCatalogueControles } from '../../../donnees-fictives/src/catalogue-controles.js';
import { calculerSante, type EntreeSante, type SeuilsSante } from '../../../noyau/src/controles/sante.js';
import type { ReponseSante } from './sante.js';

/** Graine et échelle du jeu fictif ; seuils de TEST du service (jamais des valeurs légales). */
export const GRAINE_SANTE = 2026;
const ECHELLE = 100;
export const SEUILS_TEST: SeuilsSante = {
  banque: { orange: 500, rouge: 2000 },
  cas: { orange: 20, rouge: 45 },
  fraicheur: { orange: 30, rouge: 50 },
  tva: { orange: 20, rouge: 45 },
  controles: { orange: 20, rouge: 45 },
};

/** Entrée bâtie sur les scores du catalogue fictif : plus le score est bas, plus le manque est haut. */
function entreeDepuisCatalogue(graine: number): EntreeSante {
  const d = donneesCatalogueControles(graine);
  const score = (code: string) => d.sante.sousIndicateurs.find((x) => x.code === code)?.score ?? 0;
  const manque = (code: string) => ECHELLE - score(code);
  return {
    lignesBanque: { total: ECHELLE, justifiees: score('banque') },
    casOuverts: manque('ecritures'),
    joursDepuisReleve: manque('banque'),
    joursDepuisPiece: manque('pieces'),
    tvaB: 0, tvaM: manque('tva'), controlesB: 0, controlesM: manque('controles'),
  };
}

/** Service en mémoire : même calcul, mêmes chiffres à chaque appel. */
export function creerServiceSante(graine: number = GRAINE_SANTE) {
  const sante = calculerSante(entreeDepuisCatalogue(graine), SEUILS_TEST) as ReponseSante;
  return { lire: (): ReponseSante => structuredClone(sante) };
}
