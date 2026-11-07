// Planification des appels Sirene sous quota (fenêtre glissante). Aucune horloge lue :
// tous les instants (en millisecondes) sont des arguments, ainsi que le quota et l'intervalle.

export type CodePlanif = 'option_invalide' | 'instant_invalide' | 'ordre_inverse';

export class ErreurPlanif extends Error {
  override name = 'ErreurPlanif';
  constructor(
    public readonly code: CodePlanif,
    message: string,
  ) {
    super(message);
  }
}

export interface OptionsQuota {
  quotaParFenetre: number;
  fenetreMs: number;
  intervalleMinMs: number;
  tailleLot: number;
}

export interface EnvoiPlanifie {
  lot: string[];
  a: number;
}

function verifierOptions(o: OptionsQuota): void {
  const valeurs: [string, number][] = [
    ['quotaParFenetre', o.quotaParFenetre],
    ['fenetreMs', o.fenetreMs],
    ['intervalleMinMs', o.intervalleMinMs],
    ['tailleLot', o.tailleLot],
  ];
  for (const [nom, v] of valeurs) {
    if (!Number.isSafeInteger(v) || v <= 0) {
      throw new ErreurPlanif('option_invalide', 'Option invalide : ' + nom);
    }
  }
}

function verifierInstant(t: number): void {
  if (!Number.isSafeInteger(t)) throw new ErreurPlanif('instant_invalide', 'Instant invalide : ' + String(t));
}

function trier(instants: readonly number[]): number[] {
  instants.forEach(verifierInstant);
  return [...instants].sort((a, b) => a - b);
}

/** Vrai si un envoi est permis à `maintenant` : quota de la fenêtre ]maintenant − fenetreMs, maintenant] et intervalle minimal. */
export function peutEnvoyer(envoisPasses: readonly number[], maintenant: number, o: OptionsQuota): boolean {
  verifierOptions(o);
  verifierInstant(maintenant);
  const tries = trier(envoisPasses);
  const dernier = tries[tries.length - 1];
  if (dernier !== undefined && dernier > maintenant) {
    throw new ErreurPlanif('ordre_inverse', 'Un envoi passé est postérieur à maintenant');
  }
  const dansFenetre = tries.filter((t) => t > maintenant - o.fenetreMs).length;
  if (dansFenetre >= o.quotaParFenetre) return false;
  return dernier === undefined || maintenant - dernier >= o.intervalleMinMs;
}

/** Découpe en lots dans l'ordre d'arrivée, puis donne à chaque lot le premier instant permis. */
export function planifier(demandes: readonly string[], debut: number, o: OptionsQuota): EnvoiPlanifie[] {
  verifierOptions(o);
  if (!Number.isSafeInteger(debut)) throw new ErreurPlanif('option_invalide', 'Option invalide : debut');
  const plan: EnvoiPlanifie[] = [];
  for (let i = 0; i < demandes.length; i += o.tailleLot) {
    const lot = demandes.slice(i, i + o.tailleLot);
    let a = debut;
    const n = plan.length;
    if (n > 0) a = Math.max(a, plan[n - 1]!.a + o.intervalleMinMs);
    // Le quota-ième envoi le plus récent doit être sorti de la fenêtre.
    if (n >= o.quotaParFenetre) a = Math.max(a, plan[n - o.quotaParFenetre]!.a + o.fenetreMs);
    plan.push({ lot, a });
  }
  return plan;
}

/** Vrai si aucune fenêtre glissante ne contient plus de `quotaParFenetre` instants. */
export function respecteLeQuota(instants: readonly number[], o: OptionsQuota): boolean {
  verifierOptions(o);
  const tries = trier(instants);
  let gauche = 0;
  for (let droite = 0; droite < tries.length; droite++) {
    while (tries[gauche]! <= tries[droite]! - o.fenetreMs) gauche++;
    if (droite - gauche + 1 > o.quotaParFenetre) return false;
  }
  return true;
}
