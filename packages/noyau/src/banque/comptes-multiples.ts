// Comptes multiples : détection des virements internes, carte à débit différé, soldes par devise. Aucune écriture comptable ici.
import type { Centimes } from '../argent/index.js';
import type { LigneBancaire } from './types.js';

export class ErreurComptesMultiples extends Error {
  override name = 'ErreurComptesMultiples';
}

export type ReglageVirements = { joursOuvres: number; joursFermes: readonly string[] };
export type Paire = { sortieId: string; entreeId: string; montant: number };
export type Orpheline = { ligneId: string; code: 'moitie_manquante' };

const MS_PAR_JOUR = 86_400_000;
const FORME_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const SAMEDI = 6;
const DIMANCHE = 0;

const jour = (iso: string): number => {
  const m = FORME_ISO.exec(iso);
  const t = m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : Number.NaN;
  if (!m || new Date(t).toISOString().slice(0, 10) !== iso) throw new ErreurComptesMultiples(`date invalide : ${iso}`);
  return t;
};
const entier = (m: number, nom: string): number => {
  if (!Number.isSafeInteger(m)) throw new ErreurComptesMultiples(`${nom} : entier de centimes attendu`);
  return m;
};
const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Nombre de jours ouvrés dans l'intervalle ]a, b] (week-ends et jours fermés exclus). */
function ecartOuvre(a: number, b: number, fermes: ReadonlySet<number>): number {
  const [d, f] = a <= b ? [a, b] : [b, a];
  let n = 0;
  for (let t = d + MS_PAR_JOUR; t <= f; t += MS_PAR_JOUR) {
    const s = new Date(t).getUTCDay();
    if (s !== SAMEDI && s !== DIMANCHE && !fermes.has(t)) n += 1;
  }
  return n;
}

export function apparierVirementsInternes(
  lignes: readonly LigneBancaire[], comptesDeLaSociete: readonly string[], reglage: ReglageVirements,
): { paires: Paire[]; orphelines: Orpheline[] } {
  if (!Number.isSafeInteger(reglage.joursOuvres) || reglage.joursOuvres < 0) throw new ErreurComptesMultiples('joursOuvres invalide');
  const fermes = new Set(reglage.joursFermes.map(jour));
  const comptes = new Set(comptesDeLaSociete);
  const candidates = lignes
    .filter((x) => comptes.has(x.compteId) && x.moyen === 'virement' && x.etatTechnique === 'completee')
    .map((x) => ({ x, t: jour(x.dateOperation), m: entier(x.montant, x.id) }))
    .filter((e) => e.m !== 0);
  const sorties = candidates.filter((e) => e.m < 0);
  const entrees = candidates.filter((e) => e.m > 0);
  const voisins = (e: (typeof candidates)[number], autres: typeof candidates): Array<{ id: string; ecart: number }> =>
    autres
      .filter((o) => o.x.societeId === e.x.societeId && o.x.compteId !== e.x.compteId && o.m === -e.m)
      .map((o) => ({ id: o.x.id, ecart: ecartOuvre(e.t, o.t, fermes) }))
      .filter((v) => v.ecart <= reglage.joursOuvres);
  // Meilleur voisin unique (plus petit écart) ; égalité = pas de choix.
  const meilleur = (v: Array<{ id: string; ecart: number }>): string | undefined => {
    const min = Math.min(...v.map((w) => w.ecart));
    const gagnants = v.filter((w) => w.ecart === min);
    return gagnants.length === 1 ? gagnants[0]?.id : undefined;
  };
  const choixSortie = new Map<string, string | undefined>();
  const choixEntree = new Map<string, string | undefined>();
  for (const s of sorties) choixSortie.set(s.x.id, meilleur(voisins(s, entrees)));
  for (const e of entrees) choixEntree.set(e.x.id, meilleur(voisins(e, sorties)));
  const paires: Paire[] = [];
  const pris = new Set<string>();
  for (const s of [...sorties].sort((a, b) => cmp(a.x.id, b.x.id))) {
    const eid = choixSortie.get(s.x.id);
    if (eid !== undefined && choixEntree.get(eid) === s.x.id) {
      paires.push({ sortieId: s.x.id, entreeId: eid, montant: -s.m });
      pris.add(s.x.id).add(eid);
    }
  }
  const orphelines = candidates
    .filter((e) => !pris.has(e.x.id))
    .map((e): Orpheline => ({ ligneId: e.x.id, code: 'moitie_manquante' }))
    .sort((a, b) => cmp(a.ligneId, b.ligneId));
  return { paires, orphelines };
}

/** Le prélèvement global solde la carte ; l'écart éventuel est rendu tel quel, jamais forcé à zéro. */
export function soldeCarteDiffere(
  achats: ReadonlyArray<{ id: string; montant: Centimes; date: string }>,
  prelevement: { id: string; montant: Centimes; date: string },
): { soldeApres: Centimes; nbCharges: number; prelevementInterne: true } {
  jour(prelevement.date);
  let total = entier(prelevement.montant, prelevement.id);
  for (const a of achats) {
    jour(a.date);
    total = entier(total + entier(a.montant, a.id), a.id);
  }
  return { soldeApres: (total === 0 ? 0 : total) as Centimes, nbCharges: achats.length, prelevementInterne: true };
}

export function soldeTotalParDevise(comptes: ReadonlyArray<{ solde: Centimes; devise: string }>): Record<string, Centimes> {
  const r: Record<string, Centimes> = {};
  for (const x of comptes) r[x.devise] = entier((r[x.devise] ?? 0) + entier(x.solde, x.devise), x.devise) as Centimes;
  return r;
}
