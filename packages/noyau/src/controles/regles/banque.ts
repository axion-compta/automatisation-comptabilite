// CC-BQ01 à CC-BQ03 : trou de relevé ouvert, paiement sans justificatif non décidé, sommes affectées.
// Codes seulement, aucun texte affiché. Un contrôle sans données exploitables est IMPOSSIBLE, jamais OK.
import { restePiece, resteLigne } from '../../banque/rapprochement/sommes.js';
import type { Lien } from '../../banque/types.js';
import type { RegleControle, SortieRegle } from '../moteur.js';

export interface ObjetBQ01 {
  exercice: { debut: string; fin: string };
  trous: { debut: string; fin: string; etat: 'ouvert' | 'demande' | 'comble' | 'accepte_vide' }[];
}
export interface ObjetBQ02 {
  paiements: {
    ligneId: string; montant: number; justificatif: 'present' | 'absent';
    decision?: { motif: string; par: string; le: string };
  }[];
}
export interface ObjetBQ03 {
  pieces: { id: string; montant: number }[];
  lignes: { id: string; montant: number }[];
  liens: Pick<Lien, 'ligneId' | 'pieceId' | 'montantAffecte' | 'etat'>[];
}

const IMPOSSIBLE: SortieRegle = { resultat: 'IMPOSSIBLE' };
const FORME_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const dateValide = (s: unknown): s is string => {
  const m = typeof s === 'string' ? FORME_ISO.exec(s) : null;
  return m !== null && new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).toISOString().slice(0, 10) === s;
};
const entier = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n);
const plein = (s: unknown): boolean => typeof s === 'string' && s.trim() !== '';

export const regleBQ01: RegleControle<ObjetBQ01> = {
  id: 'CC-BQ01', version: 1, gravite: 'B', bloque: ['cloture'], declencheurs: ['avant_cloture', 'continu'], actif: true,
  evaluer: (objet): SortieRegle => {
    const ex = objet?.exercice;
    if (!ex || !Array.isArray(objet.trous) || !dateValide(ex.debut) || !dateValide(ex.fin) || ex.debut > ex.fin) return IMPOSSIBLE;
    let ouverts = 0;
    for (const t of objet.trous) {
      if (!dateValide(t?.debut) || !dateValide(t.fin) || t.debut > t.fin) return IMPOSSIBLE;
      if ((t.etat === 'ouvert' || t.etat === 'demande') && t.debut <= ex.fin && t.fin >= ex.debut) ouverts++;
    }
    return ouverts > 0 ? { resultat: 'ALERTE', valeur: ouverts } : { resultat: 'OK' };
  },
};

export const regleBQ02: RegleControle<ObjetBQ02> = {
  id: 'CC-BQ02', version: 1, gravite: 'B', bloque: ['export'], declencheurs: ['avant_export', 'continu'], actif: true,
  evaluer: (objet): SortieRegle => {
    if (!Array.isArray(objet?.paiements)) return IMPOSSIBLE;
    if (objet.paiements.length === 0) return { resultat: 'NON_APPLICABLE' };
    let somme = 0;
    let sans = 0;
    for (const p of objet.paiements) {
      if (!entier(p?.montant)) return IMPOSSIBLE;
      const d = p.decision;
      if (p.justificatif === 'absent' && !(d && plein(d.motif) && plein(d.par) && plein(d.le))) {
        somme += Math.abs(p.montant);
        sans++;
      }
    }
    return sans > 0 ? { resultat: 'ALERTE', ecartCentimes: somme } : { resultat: 'OK' };
  },
};

export const regleBQ03: RegleControle<ObjetBQ03> = {
  id: 'CC-BQ03', version: 1, gravite: 'B', bloque: ['validation'], declencheurs: ['continu'], actif: true,
  evaluer: (objet): SortieRegle => {
    if (!Array.isArray(objet?.pieces) || !Array.isArray(objet.lignes) || !Array.isArray(objet.liens)) return IMPOSSIBLE;
    if (objet.pieces.length === 0 && objet.lignes.length === 0) return { resultat: 'NON_APPLICABLE' };
    if (![...objet.pieces, ...objet.lignes].every((x) => entier(x?.montant)) || !objet.liens.every((l) => entier(l?.montantAffecte))) return IMPOSSIBLE;
    const depasse = objet.pieces.some((p) => restePiece(p, objet.liens) < 0) || objet.lignes.some((l) => resteLigne(l, objet.liens) < 0);
    return depasse ? { resultat: 'ALERTE' } : { resultat: 'OK' };
  },
};
