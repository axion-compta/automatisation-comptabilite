// Plan « Appliquer les N » : une proposition par étape, rien avant le geste, chaque étape s'annule seule.
import { appliquer, type ContexteApplication, type Proposition } from './proposition.js';
import { ErreurChat } from './types.js';

export type Plan = { readonly etapes: readonly Proposition[] };
export type ResultatPlan = {
  plan: Plan;
  appliquees: string[];
  arretee?: { rang: number; code: string };
};
export type EtatPlan = { appliquees: number; annulees: number; restantes: number };

const invalide = () => new ErreurChat('parametre_invalide');

export function creerPlan(propositions: readonly Proposition[], maxEtapes: number): Plan {
  if (!Number.isSafeInteger(maxEtapes) || maxEtapes < 1) throw invalide();
  if (propositions.length < 1 || propositions.length > maxEtapes) throw invalide();
  if (new Set(propositions.map((p) => p.id)).size !== propositions.length) throw invalide();
  if (propositions.some((p) => p.etat !== 'proposee')) throw invalide();
  return { etapes: [...propositions] };
}

/** Rang à partir de 1. Les étapes annulées sont sautées ; la première erreur arrête la suite. */
export function appliquerPlan(plan: Plan, c: ContexteApplication): ResultatPlan {
  if (c.cle === '') throw invalide();
  const etapes = [...plan.etapes];
  const appliquees: string[] = [];
  for (const [i, p] of etapes.entries()) {
    if (p.etat === 'annulee') continue;
    try {
      const r = appliquer(p, { ...c, cle: `${c.cle}:${i + 1}` });
      etapes[i] = r.proposition;
      if (r.effet === 'applique') appliquees.push(p.id);
    } catch (e) {
      const code = e instanceof ErreurChat ? e.code : 'inconnue';
      return { plan: { etapes }, appliquees, arretee: { rang: i + 1, code } };
    }
  }
  return { plan: { etapes }, appliquees };
}

/** Annule une seule étape (rang à partir de 1) ; les autres ne changent pas. */
export function annulerEtape(plan: Plan, rang: number): Plan {
  const p = plan.etapes[rang - 1];
  if (!Number.isSafeInteger(rang) || p === undefined) throw invalide();
  if (p.etat !== 'proposee' && p.etat !== 'appliquee') throw new ErreurChat('proposition_inconnue');
  const etapes = [...plan.etapes];
  etapes[rang - 1] = { ...p, etat: 'annulee' };
  return { etapes };
}

export function etatDuPlan(plan: Plan): EtatPlan {
  const compte = (e: string) => plan.etapes.filter((p) => p.etat === e).length;
  return { appliquees: compte('appliquee'), annulees: compte('annulee'), restantes: compte('proposee') };
}
