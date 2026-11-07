// Rémunération du dirigeant : sans décision d'organe couvrante, la charge reste en brouillon.
// Aucun compte de charge ici ; la validation reste humaine (jamais d'état « validée »).
import { centimes, soustraire } from '../argent/index.js';

export type CodeErreurRemuneration = 'montant_invalide' | 'date_invalide' | 'ordre_inverse' | 'decisions_ambigues';

export class ErreurRemuneration extends Error {
  override name = 'ErreurRemuneration';
  readonly code: CodeErreurRemuneration;
  constructor(code: CodeErreurRemuneration, detail = '') {
    super(detail === '' ? code : `${code} : ${detail}`);
    this.code = code;
  }
}

export interface DecisionOrgane {
  id: string;
  objet: 'remuneration_dirigeant' | 'convention' | 'autre';
  forme: string;
  debut: string;
  fin: string;
  montantMaxCentimes: number | null;
  statut: 'absente' | 'deposee' | 'validee';
}

export type ResultatRemuneration =
  | { etat: 'proposable'; decisionId: string }
  | { etat: 'non_remunere' }
  | { etat: 'brouillon'; carte: 'decision_absente' }
  | { etat: 'brouillon'; carte: 'ecart_montant'; ecartCentimes: number; decisionId: string };

function verifierDate(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ErreurRemuneration('date_invalide', date);
  const t = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))));
  if (t.toISOString().slice(0, 10) !== date) throw new ErreurRemuneration('date_invalide', date);
}

function verifierMontant(valeur: number): void {
  if (!Number.isSafeInteger(valeur) || valeur < 0) {
    throw new ErreurRemuneration('montant_invalide', String(valeur));
  }
}

export function controlerRemuneration(
  ecriture: { date: string; montantCentimes: number },
  decisions: readonly DecisionOrgane[],
  formesAdmises: readonly string[],
): ResultatRemuneration {
  verifierDate(ecriture.date);
  verifierMontant(ecriture.montantCentimes);
  for (const d of decisions) {
    verifierDate(d.debut);
    verifierDate(d.fin);
    if (d.debut > d.fin) throw new ErreurRemuneration('ordre_inverse', d.id);
    if (d.montantMaxCentimes !== null) verifierMontant(d.montantMaxCentimes);
  }
  if (ecriture.montantCentimes === 0) return { etat: 'non_remunere' };

  const couvrantes = decisions
    .filter(
      (d) =>
        d.objet === 'remuneration_dirigeant' &&
        formesAdmises.includes(d.forme) &&
        (d.statut === 'deposee' || d.statut === 'validee') &&
        d.debut <= ecriture.date &&
        ecriture.date <= d.fin,
    )
    .sort((a, b) => (a.debut < b.debut ? 1 : a.debut > b.debut ? -1 : 0));
  const retenue = couvrantes[0];
  if (retenue === undefined) return { etat: 'brouillon', carte: 'decision_absente' };
  if (couvrantes[1]?.debut === retenue.debut) throw new ErreurRemuneration('decisions_ambigues', retenue.debut);

  if (retenue.montantMaxCentimes !== null && ecriture.montantCentimes > retenue.montantMaxCentimes) {
    const ecart = soustraire(centimes(ecriture.montantCentimes), centimes(retenue.montantMaxCentimes));
    return { etat: 'brouillon', carte: 'ecart_montant', ecartCentimes: ecart, decisionId: retenue.id };
  }
  return { etat: 'proposable', decisionId: retenue.id };
}
