// Cache Sirene (un par client), établissement fermé, échéance des identifiants d'accès.
// Aucune horloge lue, aucun stockage : les instants sont des arguments, comparés
// comme chaînes ISO seulement après contrôle du format.

export type CodeCache = 'date_invalide' | 'ordre_inverse' | 'jours_invalides' | 'numero_invalide' | 'entree_invalide';

export class ErreurCache extends Error {
  override name = 'ErreurCache';
  constructor(
    public readonly code: CodeCache,
    message: string,
  ) {
    super(message);
  }
}

export interface Calendrier {
  ajouterJours(date: string, n: number): string;
}

export interface EntreeCache {
  numero: string;
  reponse: unknown;
  etat: 'actif' | 'ferme';
  luLe: string;
  expireLe: string;
}

export type LectureCache = { etat: 'frais'; entree: EntreeCache } | { etat: 'expire' } | { etat: 'absent' };

const FORMAT = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})Z)?$/;

function verifierDate(valeur: string): string {
  const m = FORMAT.exec(valeur);
  if (m === null) throw new ErreurCache('date_invalide', 'Date invalide : ' + valeur);
  const heureOk = m[4] === undefined || (Number(m[4]) <= 23 && Number(m[5]) <= 59 && Number(m[6]) <= 59);
  // Contrôle du jour réel du mois (ex. 30 février, mois 13).
  const jour = valeur.slice(0, 10);
  const d = new Date(jour + 'T00:00:00Z');
  if (!heureOk || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== jour) {
    throw new ErreurCache('date_invalide', 'Date invalide : ' + valeur);
  }
  return valeur;
}

function verifierNumero(numero: string): string {
  if (numero === '') throw new ErreurCache('numero_invalide', 'Numéro vide');
  return numero;
}

function verifierEntree(e: EntreeCache): EntreeCache {
  verifierNumero(e.numero);
  if (e.etat !== 'actif' && e.etat !== 'ferme') throw new ErreurCache('entree_invalide', 'État inconnu');
  if (verifierDate(e.expireLe) < verifierDate(e.luLe)) {
    throw new ErreurCache('ordre_inverse', 'expireLe est antérieur à luLe');
  }
  return e;
}

export function lireCache(cache: readonly EntreeCache[], numero: string, maintenant: string): LectureCache {
  verifierNumero(numero);
  verifierDate(maintenant);
  const entree = cache.find((e) => e.numero === numero);
  if (entree === undefined) return { etat: 'absent' };
  verifierEntree(entree);
  return maintenant >= entree.expireLe ? { etat: 'expire' } : { etat: 'frais', entree };
}

/** Numéros absents ou expirés, sans doublon, dans l'ordre reçu. */
export function aDemander(numeros: readonly string[], cache: readonly EntreeCache[], maintenant: string): string[] {
  const vus = new Set<string>();
  const resultat: string[] = [];
  for (const n of numeros) {
    const lecture = lireCache(cache, n, maintenant);
    if (vus.has(n)) continue;
    vus.add(n);
    if (lecture.etat !== 'frais') resultat.push(n);
  }
  return resultat;
}

/** Nouveau cache : l'entrée du même numéro est remplacée ; l'entrée reçue n'est pas modifiée. */
export function mettreEnCache(cache: readonly EntreeCache[], entree: EntreeCache): EntreeCache[] {
  verifierEntree(entree);
  const copie = { ...entree };
  const place = cache.findIndex((e) => e.numero === entree.numero);
  if (place < 0) return [...cache, copie];
  return cache.map((e, k) => (k === place ? copie : e));
}

export function carteEtablissement(entree: EntreeCache): 'etablissement_ferme' | null {
  verifierEntree(entree);
  return entree.etat === 'ferme' ? 'etablissement_ferme' : null;
}

/** Vrai si `maintenant` atteint la date d'alerte (échéance moins `joursAvant` jours). */
export function alerteIdentifiants(
  p: { echeance: string; maintenant: string; joursAvant: number },
  cal: Calendrier,
): boolean {
  if (!Number.isSafeInteger(p.joursAvant) || p.joursAvant < 0) {
    throw new ErreurCache('jours_invalides', 'joursAvant doit être un entier positif ou nul');
  }
  verifierDate(p.echeance);
  verifierDate(p.maintenant);
  const dateAlerte = verifierDate(cal.ajouterJours(p.echeance, -p.joursAvant));
  return p.maintenant >= dateAlerte;
}

export function repliPanne(): { saisieManuelle: true; bloque: false } {
  return { saisieManuelle: true, bloque: false };
}
