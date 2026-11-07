// Choix du taux de change : parité fixe, puis taux BCE, puis taux saisi (à vérifier). Aucun délai en dur.
import { ajouterJours, comparerDates, estDateValide } from '../dates/civiles.js';

export type CodeErreurChange =
  | 'date_invalide'
  | 'parametre_invalide'
  | 'taux_invalide'
  | 'devise_invalide'
  | 'source_obligatoire'
  | 'saisie_anonyme';

export class ErreurChange extends Error {
  readonly code: CodeErreurChange;
  readonly statutHttp?: number;
  constructor(code: CodeErreurChange, statutHttp?: number) {
    super(code);
    this.name = 'ErreurChange';
    this.code = code;
    if (statutHttp !== undefined) this.statutHttp = statutHttp;
  }
}

export type TauxBce = { devise: string; date: string; tauxE8: number };
export type TauxSaisi = TauxBce & {
  sourceTexte: string;
  saisiPar: string;
  statut: 'a_verifier' | 'ok';
};
export type Parite = {
  devise: string;
  tauxE8: number;
  effetDebut: string;
  effetFin: string | null;
  source: string;
  statut: 'a_verifier' | 'ok';
};
export type SourcesTaux = { bce: TauxBce[]; saisis: TauxSaisi[]; parites: Parite[] };
export type TauxResolu =
  | { ok: false; code: 'taux_manquant' }
  | {
      ok: true;
      tauxE8: number;
      origine: 'parite_fixe' | 'bce' | 'saisi';
      dateDuTaux: string;
      aVerifier: boolean;
    };

function tauxValide(t: unknown): t is number {
  return typeof t === 'number' && Number.isSafeInteger(t) && t > 0;
}

function exigerDate(d: string): void {
  if (!estDateValide(d)) throw new ErreurChange('date_invalide');
}

function succes(tauxE8: number, origine: 'parite_fixe' | 'bce' | 'saisi', dateDuTaux: string, aVerifier: boolean): TauxResolu {
  if (!tauxValide(tauxE8)) throw new ErreurChange('taux_invalide');
  return { ok: true, tauxE8, origine, dateDuTaux, aVerifier };
}

export function resoudreTaux(
  demande: { devise: string; date: string },
  sources: SourcesTaux,
  joursMax: number,
): TauxResolu {
  exigerDate(demande.date);
  if (!Number.isSafeInteger(joursMax) || joursMax < 0) throw new ErreurChange('parametre_invalide');
  const { devise, date } = demande;
  const parite = sources.parites.find(
    (p) =>
      p.devise === devise &&
      comparerDates(p.effetDebut, date) <= 0 &&
      (p.effetFin === null || comparerDates(date, p.effetFin) < 0),
  );
  if (parite !== undefined) return succes(parite.tauxE8, 'parite_fixe', date, parite.statut !== 'ok');
  const plancher = ajouterJours(date, -joursMax);
  let bce: TauxBce | undefined;
  for (const t of sources.bce) {
    if (t.devise !== devise || comparerDates(t.date, date) > 0 || comparerDates(t.date, plancher) < 0) continue;
    if (bce === undefined || comparerDates(t.date, bce.date) > 0) bce = t;
  }
  if (bce !== undefined) return succes(bce.tauxE8, 'bce', bce.date, false);
  const saisi = sources.saisis.find((s) => s.devise === devise && s.date === date);
  if (saisi !== undefined) return succes(saisi.tauxE8, 'saisi', date, saisi.statut !== 'ok');
  return { ok: false, code: 'taux_manquant' };
}

function vide(texte: unknown): boolean {
  return typeof texte !== 'string' || texte.trim() === '';
}

export function saisirTaux(entree: {
  devise: string;
  date: string;
  tauxE8: number;
  sourceTexte: string;
  saisiPar: string;
}): TauxSaisi {
  if (vide(entree.devise)) throw new ErreurChange('devise_invalide');
  exigerDate(entree.date);
  if (!tauxValide(entree.tauxE8)) throw new ErreurChange('taux_invalide');
  if (vide(entree.sourceTexte)) throw new ErreurChange('source_obligatoire', 422);
  if (vide(entree.saisiPar)) throw new ErreurChange('saisie_anonyme');
  return { ...entree, statut: 'a_verifier' };
}

export function validationAutorisee(taux: Extract<TauxResolu, { ok: true }>): boolean {
  return taux.aVerifier === false;
}
