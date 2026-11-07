// Décision de changement de modèle depuis les scores du jeu d'essai (points de base, 0 à 10000).
export type Seuils = { agrement: Record<string, number>; eliminatoires: Record<string, number> };
export type Motif = { critere: string; sorte: 'eliminatoire' | 'agrement' | 'score_absent' };
export type Decision = { decision: 'applique' } | { decision: 'refuse'; motifs: Motif[] };
export type LigneReglage = { version: number; alias: string; le: string };

function valide(nom: string, v: number): number {
  if (!Number.isInteger(v) || v < 0 || v > 10000) throw new RangeError(`Valeur invalide pour ${nom} : ${String(v)}`);
  return v;
}

export function deciderChangement(scores: Record<string, number>, seuils: Seuils): Decision {
  for (const [k, v] of Object.entries(scores)) valide(k, v);
  const motifs: Motif[] = [];
  for (const [critere, seuil] of Object.entries(seuils.eliminatoires)) {
    valide(critere, seuil);
    const s = scores[critere];
    if (s === undefined) motifs.push({ critere, sorte: 'score_absent' });
    else if (s < seuil) motifs.push({ critere, sorte: 'eliminatoire' });
  }
  for (const [critere, seuil] of Object.entries(seuils.agrement)) {
    valide(critere, seuil);
    const s = scores[critere];
    if (s !== undefined && s < seuil) motifs.push({ critere, sorte: 'agrement' });
  }
  return motifs.length === 0 ? { decision: 'applique' } : { decision: 'refuse', motifs };
}

/** Ligne précédente du réglage (la plus récente avant la dernière), ou null. */
export function retourArriere(historique: readonly LigneReglage[]): LigneReglage | null {
  const tri = [...historique].sort((a, b) => (a.le < b.le ? -1 : a.le > b.le ? 1 : 0));
  return tri[tri.length - 2] ?? null;
}
