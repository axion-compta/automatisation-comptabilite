// Temps gagné : minutes estimées = actions faites par le logiciel x durée unitaire passée en argument.
// Jamais converti en argent : la sortie n'a aucun champ monétaire.
export type CodeErreurTempsGagne = 'methode_absente' | 'duree_absente' | 'nombre_invalide';

export class ErreurTempsGagne extends Error {
  readonly code: CodeErreurTempsGagne;
  constructor(code: CodeErreurTempsGagne) {
    super(code);
    this.name = 'ErreurTempsGagne';
    this.code = code;
  }
}

export interface ActionFaite {
  code: string;
  nombre: number;
}
export interface TempsGagne {
  minutes: number;
  mot: 'estimation';
  methode: string;
}

const entierPositif = (n: number): boolean => Number.isSafeInteger(n) && n >= 0;

export function tempsGagne(
  actions: readonly ActionFaite[],
  dureesMinutes: Readonly<Record<string, number>>,
  methode: string,
): TempsGagne {
  if (methode.trim() === '') throw new ErreurTempsGagne('methode_absente');
  let minutes = 0;
  for (const a of actions) {
    const duree = Object.hasOwn(dureesMinutes, a.code) ? dureesMinutes[a.code] : undefined;
    if (duree === undefined || !entierPositif(duree)) throw new ErreurTempsGagne('duree_absente');
    if (!entierPositif(a.nombre)) throw new ErreurTempsGagne('nombre_invalide');
    minutes += a.nombre * duree;
  }
  if (!Number.isSafeInteger(minutes)) throw new ErreurTempsGagne('nombre_invalide');
  return { minutes, mot: 'estimation', methode };
}
