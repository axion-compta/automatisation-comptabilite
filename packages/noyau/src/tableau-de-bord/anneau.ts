// Anneau de santé à 3 arcs (V3-UX-013). Comparaisons en produits d'entiers, aucune division, aucun pourcentage rendu.
import type { Couleur } from '../interface/types.js';

export type SousIndicateur = { code: string; nombre: number; sur: number } | { code: string; absent: true };
export type Seuils = { vertPourCent: number; orangePourCent: number };
export type CouleurArc = Couleur | 'pointille';
export type Arc = { code: ArcCode; couleur: CouleurArc; sous: { code: string; couleur: CouleurArc }[] };
export type Anneau = {
  arcs: Arc[];
  global: CouleurArc;
  centre: { mot: string; nombre: number; sur: number } | { mot: 'donnees_absentes' };
};
type ArcCode = 'pieces' | 'banque' | 'tva';

const CENT = 100;
const ARCS: ArcCode[] = ['pieces', 'banque', 'tva'];
const GRAVITE: Couleur[] = ['vert', 'orange', 'rouge'];
const entierEntre = (v: number, max: number): boolean => Number.isInteger(v) && v >= 0 && v <= max;

function verifierSeuils(s: Seuils): void {
  if (!entierEntre(s.vertPourCent, CENT) || !entierEntre(s.orangePourCent, CENT) || s.orangePourCent > s.vertPourCent) {
    throw new Error('seuils_invalides');
  }
}

export function couleurDe(si: SousIndicateur, seuils: Seuils): CouleurArc {
  verifierSeuils(seuils);
  if ('absent' in si) return 'pointille';
  const { nombre, sur } = si;
  if (!Number.isInteger(nombre) || !Number.isInteger(sur) || nombre < 0 || sur < 0 || nombre > sur) throw new Error('valeur_invalide');
  if (sur === 0) return 'pointille';
  if (nombre * CENT >= seuils.vertPourCent * sur) return 'vert';
  return nombre * CENT >= seuils.orangePourCent * sur ? 'orange' : 'rouge';
}

function pire(couleurs: CouleurArc[]): CouleurArc {
  const connues = couleurs.filter((c): c is Couleur => c !== 'pointille');
  return connues.reduce<CouleurArc>((p, c) => (p === 'pointille' || GRAVITE.indexOf(c) > GRAVITE.indexOf(p) ? c : p), 'pointille');
}

export function calculerAnneau(sous: SousIndicateur[], regroupement: Record<ArcCode, string[]>, seuils: Seuils): Anneau {
  verifierSeuils(seuils);
  const parCode = new Map(sous.map((s) => [s.code, s]));
  const arcs: Arc[] = ARCS.map((code) => {
    const liste = regroupement[code].map((c) => {
      const si = parCode.get(c);
      if (si === undefined) throw new Error('regroupement_invalide');
      return si;
    });
    const detail = liste.map((si) => ({ code: si.code, couleur: couleurDe(si, seuils) }));
    return { code, couleur: pire(detail.map((d) => d.couleur)), sous: detail };
  });
  const global = pire(arcs.map((a) => a.couleur));
  const comptes = ARCS.flatMap((code) => regroupement[code].map((c) => parCode.get(c)!)).filter(
    (si): si is { code: string; nombre: number; sur: number } => !('absent' in si) && si.sur > 0,
  );
  if (global === 'pointille') return { arcs, global, centre: { mot: 'donnees_absentes' } };
  const nombre = comptes.reduce((t, si) => t + si.nombre, 0);
  const sur = comptes.reduce((t, si) => t + si.sur, 0);
  return { arcs, global, centre: { mot: global, nombre, sur } };
}
