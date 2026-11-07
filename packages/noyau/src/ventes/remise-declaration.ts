// Ventes : remise à la déclaration de TVA. Montants par taux, avoirs à part, contrôle annuel.
import { ajouter, centimes, soustraire, type Centimes } from '../argent/index.js';
import type { StatutEcriture } from '../ecritures/modele.js';
import { ErreurVente, comparerDates, exigerDate, type LigneTvaVente } from './types.js';

export interface ParTaux {
  tauxPdb: number | null;
  base: Centimes;
  tva: Centimes;
  pieces: string[];
}
export interface EntreeRemise {
  lignesTva: readonly (LigneTvaVente & { statutEcriture: StatutEcriture })[];
  debut: string;
  fin: string;
  compteCollectee: string;
}
export interface SortieRemise {
  ventes: ParTaux[];
  avoirs: ParTaux[];
  aVerifier: ParTaux[];
  ignorees: number;
}
interface Cumul {
  base: Centimes;
  tva: Centimes;
  pieces: Set<string>;
}

const cle = (t: number | null): string => (t === null ? 'null' : String(t));

function cumuler(m: Map<string, Cumul & { taux: number | null }>, l: LigneTvaVente): void {
  const c = m.get(cle(l.tauxPdb)) ?? { taux: l.tauxPdb, base: centimes(0), tva: centimes(0), pieces: new Set<string>() };
  c.base = ajouter(c.base, l.baseCentimes);
  c.tva = ajouter(c.tva, l.tvaCentimes);
  c.pieces.add(l.pieceId);
  m.set(cle(l.tauxPdb), c);
}

function trier(m: Map<string, Cumul & { taux: number | null }>): ParTaux[] {
  return [...m.values()]
    .map((c) => ({ tauxPdb: c.taux, base: c.base, tva: c.tva, pieces: [...c.pieces].sort() }))
    .sort((a, b) => (a.tauxPdb === null ? 1 : b.tauxPdb === null ? -1 : a.tauxPdb - b.tauxPdb));
}

// ignorees : lignes écartées (non validée, autre compte, sans date ou hors période).
export function ventesDeLaPeriode(e: EntreeRemise): SortieRemise {
  exigerDate(e.debut, 'debut');
  exigerDate(e.fin, 'fin');
  if (comparerDates(e.debut, e.fin) > 0) throw new ErreurVente('periode_inversee', 'Début de période après la fin.');
  const ventes = new Map<string, Cumul & { taux: number | null }>();
  const avoirs = new Map<string, Cumul & { taux: number | null }>();
  let ignorees = 0;
  for (const l of e.lignesTva) {
    if (!Number.isSafeInteger(l.baseCentimes) || !Number.isSafeInteger(l.tvaCentimes)) throw new ErreurVente('montant_invalide', 'Montant de ligne invalide.');
    if (l.tauxPdb !== null && (!Number.isSafeInteger(l.tauxPdb) || l.tauxPdb < 0)) throw new ErreurVente('taux_invalide', 'Taux invalide.');
    const date = l.dateExigibilite === null ? null : exigerDate(l.dateExigibilite, 'dateExigibilite');
    const retenue = l.statutEcriture === 'valide' && l.compte === e.compteCollectee && date !== null && comparerDates(date, e.debut) >= 0 && comparerDates(date, e.fin) <= 0;
    if (!retenue) ignorees += 1;
    else cumuler(l.sens === 'avoir' ? avoirs : ventes, l);
  }
  const aVerifier: ParTaux[] = [];
  const garder = (m: Map<string, Cumul & { taux: number | null }>): ParTaux[] => {
    const ok: ParTaux[] = [];
    for (const p of trier(m)) (p.tauxPdb === null || p.base < 0 || p.tva < 0 ? aVerifier : ok).push(p);
    return ok;
  };
  const sortie = { ventes: garder(ventes), avoirs: garder(avoirs) };
  return { ...sortie, aVerifier, ignorees };
}

export function controleAnnuel(e: { caDeclare: Centimes; totalProduits: Centimes; seuil: Centimes | undefined }): { ecart: Centimes; bloquant: boolean; parametreAbsent: boolean } {
  if (!Number.isSafeInteger(e.caDeclare) || !Number.isSafeInteger(e.totalProduits)) throw new ErreurVente('montant_invalide', 'Montant invalide.');
  if (e.seuil !== undefined && (!Number.isSafeInteger(e.seuil) || e.seuil < 0)) throw new ErreurVente('seuil_invalide', 'Seuil invalide.');
  const ecart = soustraire(e.caDeclare, e.totalProduits);
  if (e.seuil === undefined) return { ecart, bloquant: true, parametreAbsent: true };
  return { ecart, bloquant: Math.abs(ecart) > e.seuil, parametreAbsent: false };
}
