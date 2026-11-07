export class ErreurScore extends Error {
  constructor(readonly code: 'bareme_invalide' | 'constats_invalides') {
    super(code);
    this.name = 'ErreurScore';
  }
}

export interface Bareme {
  version: string;
  montantExact: number;
  montantCentime: number;
  contrepartieConnue: number;
  contrepartieSimilaire: number;
  referenceComplete: number;
  referenceFin: number;
  dateDansTolerance: number;
  dateDouble: number;
  sensEtMoyen: number;
  regleApprise: number;
  penalitePartielle: number;
  penaliteEcartPeriode: number;
  joursEcartPeriode: number;
  plafond: number;
  ecartAmbiguite: number;
  plafondAmbigu: number;
  seuils: { rapprochee: number; proposee: number; douteuse: number };
}

export interface Constats {
  montant: 'exact' | 'centime' | 'aucun';
  contrepartie: 'connue' | 'similaire' | 'aucune';
  reference: 'complete' | 'fin' | 'aucune';
  date: 'tolerance' | 'double' | 'hors';
  sensCoherent: boolean;
  regleApprise: boolean;
  dejaPartielle: boolean;
  joursEcart: number;
}

export interface Facteur {
  nom: string;
  points: number;
}

export type EtatLigne = 'RAPPROCHEE' | 'PROPOSEE' | 'DOUTEUSE';

const entierPositifOuNul = (n: unknown): boolean => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;

function verifier(b: Bareme): void {
  const { seuils, version, ...nombres } = b;
  const ok =
    typeof version === 'string' &&
    Object.values(nombres).every(entierPositifOuNul) &&
    entierPositifOuNul(seuils.douteuse) &&
    entierPositifOuNul(seuils.proposee) &&
    entierPositifOuNul(seuils.rapprochee) &&
    seuils.douteuse < seuils.proposee &&
    seuils.proposee < seuils.rapprochee;
  if (!ok) throw new ErreurScore('bareme_invalide');
}

export function scorer(c: Constats, b: Bareme): { brut: number; score: number; facteurs: Facteur[]; penalites: Facteur[] } {
  verifier(b);
  if (!Number.isInteger(c.joursEcart)) throw new ErreurScore('constats_invalides');
  const facteurs: Facteur[] = [
    { nom: 'montant', points: c.montant === 'exact' ? b.montantExact : c.montant === 'centime' ? b.montantCentime : 0 },
    {
      nom: 'contrepartie',
      points: c.contrepartie === 'connue' ? b.contrepartieConnue : c.contrepartie === 'similaire' ? b.contrepartieSimilaire : 0,
    },
    { nom: 'reference', points: c.reference === 'complete' ? b.referenceComplete : c.reference === 'fin' ? b.referenceFin : 0 },
    { nom: 'date', points: c.date === 'tolerance' ? b.dateDansTolerance : c.date === 'double' ? b.dateDouble : 0 },
    { nom: 'sens_et_moyen', points: c.sensCoherent ? b.sensEtMoyen : 0 },
    { nom: 'regle_apprise', points: c.regleApprise ? b.regleApprise : 0 },
  ];
  const ecart = Math.abs(c.joursEcart) > b.joursEcartPeriode;
  const penalites: Facteur[] = [
    { nom: 'piece_deja_partielle', points: c.dejaPartielle ? 0 - b.penalitePartielle : 0 },
    { nom: 'ecart_periode', points: ecart ? 0 - b.penaliteEcartPeriode : 0 },
  ];
  const somme = (l: Facteur[]) => l.reduce((s, f) => s + f.points, 0);
  const brut = somme(facteurs);
  return { brut, score: Math.min(b.plafond, Math.max(0, brut + somme(penalites))), facteurs, penalites };
}

export function etatSelonScore(score: number, b: Bareme): EtatLigne | null {
  verifier(b);
  if (!Number.isFinite(score)) throw new ErreurScore('constats_invalides');
  if (score >= b.seuils.rapprochee) return 'RAPPROCHEE';
  if (score >= b.seuils.proposee) return 'PROPOSEE';
  if (score >= b.seuils.douteuse) return 'DOUTEUSE';
  return null;
}

export function appliquerAmbiguite(scores: readonly number[], b: Bareme): number[] {
  verifier(b);
  if (!scores.every(Number.isFinite)) throw new ErreurScore('constats_invalides');
  const [premier, second] = [...scores].sort((x, y) => y - x);
  const ambigu = premier !== undefined && second !== undefined && premier - second < b.ecartAmbiguite;
  return scores.map((s) => (ambigu ? Math.min(s, b.plafondAmbigu) : s));
}
