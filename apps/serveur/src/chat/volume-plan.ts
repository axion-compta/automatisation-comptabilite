// Volume de chat du plan lu dans la console (L05-T63) : le seuil vient de la console, jamais du code.
export interface LectureVolume { utilise: number; inclus: number; seuilPdb: number }
export interface PortVolume { lire: () => Promise<LectureVolume> }
export type DecisionVolume = 'normal' | 'avertissement' | 'sans_modele';

/** Définition du point de base : un pourcent vaut cent points de base. */
const POINTS_DE_BASE_TOTAL = 10_000;

const entierPositif = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;

export async function deciderVolume(port: PortVolume): Promise<DecisionVolume> {
  let l: LectureVolume;
  try {
    l = await port.lire();
  } catch {
    return 'sans_modele';
  }
  if (!l || !entierPositif(l.utilise) || !entierPositif(l.inclus) || !entierPositif(l.seuilPdb)) return 'sans_modele';
  if (l.inclus === 0 || l.seuilPdb > POINTS_DE_BASE_TOTAL) return 'sans_modele';
  if (l.utilise >= l.inclus) return 'sans_modele';
  return l.utilise * POINTS_DE_BASE_TOTAL >= l.seuilPdb * l.inclus ? 'avertissement' : 'normal';
}

export interface PortModele { repondre: (message: string) => Promise<string> }
export interface ReponseSelonVolume { decision: DecisionVolume; reponse: string | null }

/** Passe par la décision avant tout appel au modèle : à 100 % ou volume illisible, le modèle n'est jamais appelé. */
export async function repondreSelonVolume(portVolume: PortVolume, portModele: PortModele, message: string): Promise<ReponseSelonVolume> {
  const decision = await deciderVolume(portVolume);
  if (decision === 'sans_modele') return { decision, reponse: null };
  return { decision, reponse: await portModele.repondre(message) };
}
