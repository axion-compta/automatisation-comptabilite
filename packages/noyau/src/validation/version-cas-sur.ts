// Version de la règle du cas sûr (V3-VAL-006). Un lot validé garde la version et les paramètres lus ;
// changer un paramètre crée une nouvelle version, jamais de modification en place, sans effet rétroactif.
import { estCasSur, type CodeRaison, type ContexteCasSur, type ParametresCasSur, type Proposition } from './cas-sur.js';

/** À changer dans la même PR que toute modification de cas-sur.ts. */
export const VERSION_REGLE_CAS_SUR = 'cas-sur-1';

type CodeErreur = 'aucune_version' | 'version_identique' | 'date_anterieure' | 'date_invalide'
  | 'historique_invalide' | 'parametres_invalides' | 'version_inconnue' | 'lot_incoherent';

export class ErreurVersionCasSur extends Error {
  override name = 'ErreurVersionCasSur';
  readonly code: CodeErreur;
  constructor(code: CodeErreur, message: string) {
    super(message);
    this.code = code;
  }
}

export interface VersionParametres { numero: number; parametres: ParametresCasSur; depuis: string }

export interface LotEvalue {
  regle: typeof VERSION_REGLE_CAS_SUR;
  versionParametres: number;
  parametres: ParametresCasSur;
  lignes: readonly { id: string; sur: boolean; raisons: readonly CodeRaison[] }[];
}

const entierPositifOuNul = (v: number): boolean => Number.isSafeInteger(v) && v >= 0;
const memes = (a: ParametresCasSur, b: ParametresCasSur): boolean =>
  a.montantMaxCentimes === b.montantMaxCentimes && a.validationsMinFournisseur === b.validationsMinFournisseur;

function verifierDate(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !new Date(date + 'T00:00:00Z').toISOString().startsWith(date)) throw new ErreurVersionCasSur('date_invalide', 'Date attendue au format AAAA-MM-JJ');
}

function verifierHistorique(historique: readonly VersionParametres[]): void {
  historique.forEach((v, i) => {
    verifierDate(v.depuis);
    if (v.numero !== i + 1 || (i > 0 && v.depuis <= (historique[i - 1]?.depuis ?? ''))) {
      throw new ErreurVersionCasSur('historique_invalide', 'Numéros consécutifs et dates croissantes attendus');
    }
  });
}

export function nouvelleVersion(
  historique: readonly VersionParametres[],
  parametres: ParametresCasSur,
  depuis: string,
): readonly VersionParametres[] {
  if (!entierPositifOuNul(parametres.montantMaxCentimes) || !entierPositifOuNul(parametres.validationsMinFournisseur)) {
    throw new ErreurVersionCasSur('parametres_invalides', 'Les paramètres doivent être des entiers positifs ou nuls');
  }
  verifierHistorique(historique);
  verifierDate(depuis);
  const derniere = historique[historique.length - 1];
  if (derniere !== undefined && depuis <= derniere.depuis) throw new ErreurVersionCasSur('date_anterieure', 'La date doit suivre la dernière version');
  if (derniere !== undefined && memes(derniere.parametres, parametres)) {
    throw new ErreurVersionCasSur('version_identique', 'Paramètres identiques à la dernière version');
  }
  return [...historique, { numero: historique.length + 1, parametres: { ...parametres }, depuis }];
}

function versionEnVigueur(historique: readonly VersionParametres[], date: string): VersionParametres {
  if (historique.length === 0) throw new ErreurVersionCasSur('aucune_version', 'Aucune version de paramètres');
  verifierHistorique(historique);
  verifierDate(date);
  const trouvee = [...historique].reverse().find((v) => v.depuis <= date);
  if (trouvee === undefined) throw new ErreurVersionCasSur('date_anterieure', 'Date antérieure à la première version');
  return trouvee;
}

export function evaluerLot(
  propositions: readonly Proposition[],
  ctx: ContexteCasSur,
  historique: readonly VersionParametres[],
  date: string,
): LotEvalue {
  const version = versionEnVigueur(historique, date);
  const lignes = propositions.map((p) => ({ id: p.id, ...estCasSur(p, ctx, version.parametres) }));
  return { regle: VERSION_REGLE_CAS_SUR, versionParametres: version.numero, parametres: { ...version.parametres }, lignes };
}

/** Relit un lot enregistré : ses paramètres sont ceux du lot, jamais recalculés avec la dernière version. */
export function relireLot(
  lot: Pick<LotEvalue, 'versionParametres' | 'parametres'>,
  historique: readonly VersionParametres[],
): { versionParametres: number; parametres: ParametresCasSur } {
  verifierHistorique(historique);
  const version = historique.find((v) => v.numero === lot.versionParametres);
  if (version === undefined) throw new ErreurVersionCasSur('version_inconnue', 'Version absente de l’historique');
  if (!memes(version.parametres, lot.parametres)) throw new ErreurVersionCasSur('lot_incoherent', 'Paramètres du lot différents de ceux de sa version');
  return { versionParametres: lot.versionParametres, parametres: { ...lot.parametres } };
}
