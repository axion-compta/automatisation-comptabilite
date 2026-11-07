// Budget de gestes : lecture du fichier CSV, comptage des gestes et des saisies, comparaison.
// Aucun texte affiché : les messages sont des codes de parcours et des nombres.

export interface LigneBudget {
  parcours: string;
  etape: string;
  maxClics: number;
  maxSaisies: number;
  source: string;
}

export interface Evenement {
  type: 'clic' | 'toucher' | 'saisie' | 'defilement' | 'survol';
  champ?: string;
}

export interface Mesure {
  gestes: number;
  saisies: number;
}

const ENTETE = 'parcours,etape,max_clics,max_saisies,source';
const PARCOURS = new Set(['P1', 'P2', 'P3', 'P4', 'P5', 'P6']);
const ENTIER = /^\d+$/;

function nombre(texte: string, ligne: number): number {
  if (!ENTIER.test(texte)) throw new Error('Ligne ' + String(ligne) + ' : nombre entier positif attendu');
  return Number(texte);
}

/** Lit le CSV ; refuse tout écart de forme (en-tête, parcours, doublon, nombre, source). */
export function lireBudgets(texte: string): LigneBudget[] {
  const lignes = texte.split(/\r?\n/);
  if (lignes[0] !== ENTETE) throw new Error('En-tête du budget de gestes différent de celui attendu');
  const vus = new Set<string>();
  const resultat: LigneBudget[] = [];
  lignes.slice(1).forEach((brut, i) => {
    if (brut === '') return;
    const n = i + 2;
    const c = brut.split(',');
    if (c.length !== 5) throw new Error('Ligne ' + String(n) + ' : cinq colonnes attendues');
    const [parcours, etape, clics, saisies, source] = c as [string, string, string, string, string];
    if (!PARCOURS.has(parcours)) throw new Error('Ligne ' + String(n) + ' : parcours inconnu');
    const cle = parcours + '|' + etape;
    if (vus.has(cle)) throw new Error('Ligne ' + String(n) + ' : parcours et étape en double');
    vus.add(cle);
    if (source.trim() === '') throw new Error('Ligne ' + String(n) + ' : source vide');
    resultat.push({ parcours, etape, maxClics: nombre(clics, n), maxSaisies: nombre(saisies, n), source });
  });
  return resultat;
}

/** Clic et toucher = 1 geste ; plusieurs saisies à la suite du même champ = 1 ; défilement et survol ignorés. */
export function compter(evenements: readonly Evenement[]): Mesure {
  let gestes = 0;
  let saisies = 0;
  let dernierChamp: string | undefined;
  for (const e of evenements) {
    if (e.type === 'defilement' || e.type === 'survol') continue;
    if (e.type === 'saisie') {
      const champ = e.champ ?? '';
      if (champ !== dernierChamp) saisies += 1;
      dernierChamp = champ;
    } else {
      gestes += 1;
      dernierChamp = undefined;
    }
  }
  return { gestes, saisies };
}

export function comparer(
  budget: Pick<LigneBudget, 'parcours' | 'maxClics' | 'maxSaisies'>,
  mesure: Mesure,
): { ok: true } | { ok: false; message: string } {
  const ecarts: string[] = [];
  if (mesure.gestes > budget.maxClics) {
    ecarts.push(budget.parcours + ' : ' + String(mesure.gestes) + ' gestes, budget ' + String(budget.maxClics));
  }
  if (mesure.saisies > budget.maxSaisies) {
    ecarts.push(budget.parcours + ' : ' + String(mesure.saisies) + ' saisies, budget ' + String(budget.maxSaisies));
  }
  return ecarts.length === 0 ? { ok: true } : { ok: false, message: ecarts.join(' ; ') };
}
