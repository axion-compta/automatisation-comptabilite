// Rémunération du dirigeant : écritures proposées en brouillon, jamais de calcul de paie ni de cotisation.
// Les numéros de compte viennent du plan du millésime (à vérifier) et sont passés en argument.
import { centimes } from '../argent/index.js';
import type { Ecriture, LigneEcriture } from '../ecritures/modele.js';
import { verifierEcriture } from '../ecritures/modele.js';

export type StatutDirigeant = 'president_sas' | 'gerant_majoritaire_sarl' | 'exploitant_ei';

export type CodeErreurDirigeant = 'paie_incoherente' | 'statut_dirigeant_inconnu' | 'montant_invalide' | 'compte_manquant';

export class ErreurDirigeant extends Error {
  override name = 'ErreurDirigeant';
  readonly code: CodeErreurDirigeant;
  constructor(code: CodeErreurDirigeant, message: string) {
    super(message);
    this.code = code;
  }
}

export interface DonneesPaie {
  brut: number;
  retenues: number;
  net: number;
  chargesPatronales: number;
}

export interface ComptesRemuneration {
  remuneration?: string;
  personnel?: string;
  organismes?: string;
  chargesSociales?: string;
  exploitant?: string;
  banque?: string;
}

export interface ContexteRemuneration {
  idBase: string;
  date: string;
  journal: string;
}

type DonneesDirigeant = DonneesPaie | { remuneration: number } | { prelevement: number };

function montant(v: number) {
  if (!Number.isSafeInteger(v) || v < 0) {
    throw new ErreurDirigeant('montant_invalide', 'Montant invalide : ' + String(v));
  }
  return centimes(v);
}

function compte(comptes: ComptesRemuneration, cle: keyof ComptesRemuneration): string {
  const c = comptes[cle];
  if (c === undefined || c === '') {
    throw new ErreurDirigeant('compte_manquant', 'Compte manquant : ' + cle);
  }
  return c;
}

const debit = (c: string, m: number, libelle: string): LigneEcriture => ({
  compte: c,
  libelle,
  debit: centimes(m),
  credit: centimes(0),
});
const credit = (c: string, m: number, libelle: string): LigneEcriture => ({
  compte: c,
  libelle,
  debit: centimes(0),
  credit: centimes(m),
});

function brouillon(ctx: ContexteRemuneration, rang: number, lignes: LigneEcriture[]): Ecriture {
  const e: Ecriture = {
    id: ctx.idBase + '-' + String(rang),
    journal: ctx.journal,
    date: ctx.date,
    statut: 'brouillon',
    lignes: lignes.filter((l) => l.debit !== 0 || l.credit !== 0),
  };
  verifierEcriture(e);
  return e;
}

/** Propose des écritures en brouillon selon le statut ; la paie importée n'est jamais recalculée. */
export function proposerRemuneration(
  statut: StatutDirigeant,
  donnees: DonneesDirigeant,
  comptes: ComptesRemuneration,
  ctx: ContexteRemuneration,
): Ecriture[] {
  if (statut === 'president_sas') {
    const d = donnees as DonneesPaie;
    const brut = montant(d.brut);
    const retenues = montant(d.retenues);
    const net = montant(d.net);
    const charges = montant(d.chargesPatronales);
    if (brut !== net + retenues) {
      throw new ErreurDirigeant('paie_incoherente', 'Le brut doit égaler le net plus les retenues.');
    }
    const organismes = compte(comptes, 'organismes');
    const ecritures = [
      brouillon(ctx, 1, [
        debit(compte(comptes, 'remuneration'), brut, 'Rémunération du dirigeant'),
        credit(compte(comptes, 'personnel'), net, 'Net à payer au dirigeant'),
        credit(organismes, retenues, 'Retenues dues aux organismes'),
      ]),
    ];
    if (charges !== 0) {
      ecritures.push(
        brouillon(ctx, 2, [
          debit(compte(comptes, 'chargesSociales'), charges, 'Charges patronales'),
          credit(organismes, charges, 'Charges patronales dues aux organismes'),
        ]),
      );
    }
    return ecritures;
  }
  if (statut === 'gerant_majoritaire_sarl') {
    const m = montant((donnees as { remuneration: number }).remuneration);
    return [
      brouillon(ctx, 1, [
        debit(compte(comptes, 'remuneration'), m, 'Rémunération du gérant'),
        credit(compte(comptes, 'personnel'), m, 'Rémunération due au gérant'),
      ]),
    ];
  }
  if (statut === 'exploitant_ei') {
    const m = montant((donnees as { prelevement: number }).prelevement);
    return [
      brouillon(ctx, 1, [
        debit(compte(comptes, 'exploitant'), m, "Prélèvement de l'exploitant"),
        credit(compte(comptes, 'banque'), m, "Prélèvement de l'exploitant"),
      ]),
    ];
  }
  throw new ErreurDirigeant('statut_dirigeant_inconnu', 'Statut du dirigeant inconnu.');
}
