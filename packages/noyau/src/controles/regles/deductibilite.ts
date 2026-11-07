// Contrôle CC-T05 : TVA déductible tracée par cinq vérifications.
// Une vérification absente ou un paramètre inutilisable = IMPOSSIBLE, jamais OK.
// Aucun texte affiché ici : seulement des codes.
import type { Centimes } from '../../argent/index.js';
import type { RegleControle, SortieRegle } from '../moteur.js';
import { alerte, ErreurControle, exigerCentimes, ok, parametreUtilisable, type ParametreLu } from './commun.js';

export type Verification = 'nom_societe' | 'mentions' | 'nature' | 'date_deduction' | 'paiement';

export const VERIFICATIONS: readonly Verification[] = Object.freeze([
  'nom_societe',
  'mentions',
  'nature',
  'date_deduction',
  'paiement',
]);

export interface LigneDeductible {
  ligneId: string;
  tvaDeductible: Centimes;
  verifications: Partial<Record<Verification, 'ok' | 'echec'>>;
  fournisseurSurEncaissements: boolean;
}

export type EtatDeductibilite = 'ok' | 'echec' | 'impossible';

function premiereEnEchec(l: LigneDeductible): Verification | undefined {
  return exigees(l).find((v) => l.verifications[v] === 'echec');
}

function exigees(l: LigneDeductible): Verification[] {
  return VERIFICATIONS.filter((v) => v !== 'paiement' || l.fournisseurSurEncaissements);
}

export function etatDeductibilite(l: LigneDeductible, mentionsExigees: ParametreLu): EtatDeductibilite {
  if (exigerCentimes(l.tvaDeductible) < 0) throw new ErreurControle('entree_invalide');
  if (l.tvaDeductible === 0) return 'ok';
  if (!parametreUtilisable(mentionsExigees)) return 'impossible';
  if (exigees(l).some((v) => l.verifications[v] === undefined)) return 'impossible';
  return premiereEnEchec(l) === undefined ? 'ok' : 'echec';
}

export const regleCCT05: RegleControle<{
  ligne: LigneDeductible;
  mentionsExigees: ParametreLu;
}> = {
  id: 'CC-T05',
  version: 1,
  gravite: 'B',
  bloque: ['tva'],
  declencheurs: ['arrivee', 'continu', 'avant_tva', 'a_la_demande'],
  actif: true,
  evaluer: ({ ligne, mentionsExigees }): SortieRegle => {
    const etat = etatDeductibilite(ligne, mentionsExigees);
    if (etat === 'ok') return ok();
    if (etat === 'impossible') return { resultat: 'IMPOSSIBLE' };
    return alerte(undefined, premiereEnEchec(ligne) as Verification);
  },
};
