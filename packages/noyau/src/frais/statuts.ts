// Transitions de statut d'un frais : la table est la seule source de vérité.
import { ErreurFrais, type Frais, type StatutFrais } from './types.js';

export const TRANSITIONS: Readonly<Record<StatutFrais, readonly StatutFrais[]>> = {
  brouillon: ['a_completer', 'propose', 'exclu_paye_societe', 'refuse', 'perso'],
  a_completer: ['propose', 'exclu_paye_societe', 'refuse', 'perso'],
  propose: ['valide', 'a_completer', 'refuse'],
  valide: ['rembourse', 'en_compte_courant'],
  rembourse: [],
  en_compte_courant: [],
  exclu_paye_societe: [],
  refuse: [],
  perso: [],
};

const estStatut = (v: unknown): v is StatutFrais =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(TRANSITIONS, v);
const texteNonVide = (v: unknown): boolean => typeof v === 'string' && v.trim() !== '';

export function peutPasser(de: StatutFrais, vers: StatutFrais): boolean {
  return estStatut(de) && estStatut(vers) && TRANSITIONS[de].includes(vers);
}

export function passer(frais: Frais, vers: StatutFrais, options: { motif?: string | undefined; parPersonne?: string | undefined } = {}): Frais {
  if (!estStatut(vers) || !estStatut(frais.statut)) throw new ErreurFrais('entree_invalide', 'statut inconnu');
  if (!peutPasser(frais.statut, vers)) throw new ErreurFrais('transition_interdite', frais.statut + ' vers ' + vers);
  if (vers === 'refuse' && !texteNonVide(options.motif)) throw new ErreurFrais('motif_obligatoire', 'motif du refus');
  if (vers === 'valide' && !texteNonVide(options.parPersonne)) {
    throw new ErreurFrais('transition_interdite', 'validation par une personne');
  }
  return { ...frais, statut: vers, version: frais.version + 1 };
}
