// Banc de parité : mêmes actions jouées par plusieurs voies, chacune sur sa base neuve. Aucun modèle appelé.
import { differences, empreinteEtat, memeEtatHorsCanal } from '../../../../packages/noyau/src/principes/parite.js';

export class ErreurBanc extends Error {
  override name = 'ErreurBanc';
  readonly code = 'entree_invalide';
  constructor(message: string = 'entree_invalide') {
    super(message);
  }
}

export interface ActionBanc { id: string; type: 'creer' | 'modifier'; libelle: string; montantCentimes: number; cible?: string }
export interface LigneHistorique { action: string; objet: string; avant: unknown; apres: unknown; canal: string }
export interface VoieBanc<B> { canal: string; jouer(action: ActionBanc, base: B): Promise<LigneHistorique> }
export interface ResultatBanc {
  identiques: boolean;
  empreintes: Record<string, string>;
  differences: string[];
  historiques: Record<string, LigneHistorique[]>;
}

const PAS_CENTIMES = 125;
const BASE_CENTIMES = 1000;

export function genererActions(n: number): ActionBanc[] {
  if (!Number.isSafeInteger(n) || n < 1) throw new ErreurBanc('n doit être un entier sûr supérieur ou égal à 1.');
  const creations = Math.ceil(n / 2);
  return Array.from({ length: n }, (_, i): ActionBanc => {
    const rang = String(i + 1).padStart(2, '0');
    const montantCentimes = BASE_CENTIMES + i * PAS_CENTIMES;
    if (i < creations) return { id: `a${rang}`, type: 'creer', libelle: `Achat fictif ${rang}`, montantCentimes };
    return { id: `a${rang}`, type: 'modifier', libelle: `Achat fictif corrigé ${rang}`, montantCentimes, cible: `E${String(i - creations + 1)}` };
  });
}

export async function jouerBanc<B>(o: {
  actions: readonly ActionBanc[];
  voies: readonly VoieBanc<B>[];
  creerBase: () => B;
  lireEtat: (b: B) => unknown;
}): Promise<ResultatBanc> {
  if (o.voies.length === 0) throw new ErreurBanc('Au moins une voie est requise.');
  const canaux = o.voies.map((v) => v.canal);
  if (new Set(canaux).size !== canaux.length) throw new ErreurBanc('Les canaux des voies doivent être distincts.');
  const empreintes: Record<string, string> = {};
  const historiques: Record<string, LigneHistorique[]> = {};
  const etats: Record<string, unknown> = {};
  for (const voie of o.voies) {
    const base = o.creerBase();
    const lignes: LigneHistorique[] = [];
    for (const action of o.actions) lignes.push(await voie.jouer(action, base));
    etats[voie.canal] = o.lireEtat(base);
    empreintes[voie.canal] = empreinteEtat(etats[voie.canal]);
    historiques[voie.canal] = lignes;
  }
  const [ref, ...autres] = canaux as [string, ...string[]];
  const ecarts: string[] = [];
  let identiques = true;
  for (const c of autres) {
    if (empreintes[c] !== empreintes[ref]) {
      identiques = false;
      ecarts.push(...differences(etats[ref], etats[c]).map((d) => `etat[${c}]${d.startsWith('[') ? '' : '.'}${d}`));
    }
    if (!memeEtatHorsCanal(historiques[ref], historiques[c])) {
      identiques = false;
      ecarts.push(...differences(historiques[ref], historiques[c]).map((d) => `historique[${c}]${d.startsWith('[') ? '' : '.'}${d}`));
    }
  }
  return { identiques, empreintes, differences: ecarts, historiques };
}

/** Outil de niveau B vers l'action du banc qui le couvre, ou motif d'exclusion en clair. */
export const OUTILS_COUVERTS: Readonly<Record<string, string>> = Object.freeze({
  proposer_validation: 'exclu : aucune route écran de validation à ce jour',
});
