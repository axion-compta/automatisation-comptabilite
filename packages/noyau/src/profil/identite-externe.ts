import { ErreurProfil } from './types.js';
import { normaliserIdentifiant, sirenValide, verifierTvaFrancaise } from './identifiants.js';

export type ReponseSirene = { trouve: true; denomination: string; forme: string; dateReponse: string } | { trouve: false };
export interface SourceSirene {
  chercher(siren: string, signal: AbortSignal): Promise<ReponseSirene>;
}
export interface SourceVies {
  verifier(numero: string, signal: AbortSignal): Promise<'valide' | 'invalide'>;
}
export type Horloge = { setTimeout: (f: () => void, ms: number) => unknown; clearTimeout: (h: unknown) => void };
export type Reglage = { delaiMaxMs: number; horloge: Horloge };

export type ResultatSirene =
  | { etat: 'trouve'; origine: 'sirene'; denomination: string; forme: string; dateReponse: string }
  | { etat: 'introuvable' }
  | { etat: 'refuse'; motif: 'siren_invalide' }
  | { etat: 'saisie_manuelle'; origine: 'saisie_personne' };
export type StatutVies = 'verifie' | 'invalide' | 'non_verifie';

const PREFIXE_FRANCE = 'FR';
const SAISIE_MANUELLE = { etat: 'saisie_manuelle', origine: 'saisie_personne' } as const;

function exigerReglage(r: Reglage): void {
  if (typeof r.delaiMaxMs !== 'number' || !Number.isSafeInteger(r.delaiMaxMs) || r.delaiMaxMs <= 0) throw new ErreurProfil('delai_invalide');
}

async function avecDelai<T>(appel: (signal: AbortSignal) => Promise<T>, r: Reglage): Promise<T> {
  const controle = new AbortController();
  let minuterie: unknown;
  const echeance = new Promise<never>((_, rejeter) => {
    minuterie = r.horloge.setTimeout(() => {
      controle.abort();
      rejeter(new Error('delai_depasse'));
    }, r.delaiMaxMs);
  });
  try {
    return await Promise.race([appel(controle.signal), echeance]);
  } finally {
    r.horloge.clearTimeout(minuterie);
  }
}

const texte = (t: unknown): t is string => typeof t === 'string';

export async function rechercherSirene(source: SourceSirene, siren: string, reglage: Reglage): Promise<ResultatSirene> {
  exigerReglage(reglage);
  if (!sirenValide(siren)) return { etat: 'refuse', motif: 'siren_invalide' };
  const numero = normaliserIdentifiant(siren);
  try {
    const rep = await avecDelai((signal) => source.chercher(numero, signal), reglage);
    if (rep.trouve === false) return { etat: 'introuvable' };
    if (rep.trouve === true && texte(rep.denomination) && texte(rep.forme) && texte(rep.dateReponse)) {
      return { etat: 'trouve', origine: 'sirene', denomination: rep.denomination, forme: rep.forme, dateReponse: rep.dateReponse };
    }
  } catch {
    return SAISIE_MANUELLE;
  }
  return SAISIE_MANUELLE;
}

export async function statutVies(source: SourceVies, numero: string, reglage: Reglage): Promise<StatutVies> {
  exigerReglage(reglage);
  const net = normaliserIdentifiant(numero);
  if (net.toUpperCase().startsWith(PREFIXE_FRANCE) && !verifierTvaFrancaise(net.toUpperCase()).valide) return 'invalide';
  try {
    const rep = await avecDelai((signal) => source.verifier(net, signal), reglage);
    if (rep === 'valide') return 'verifie';
    if (rep === 'invalide') return 'invalide';
  } catch {
    return 'non_verifie';
  }
  return 'non_verifie';
}
