// Connecteur VIES (CC-K09) : appelé seulement si la clé est juste, interrupteur fermé par défaut.
// Écrit contre une interface : aucun appel réseau réel ici. Service indisponible = IMPOSSIBLE, jamais valide.
import { createHash, randomUUID } from 'node:crypto';
import { analyserNumeroTva } from '../../../../packages/noyau/src/controles/regles/numero-tva.js';

export interface PortVies {
  verifier(pays: string, numero: string, signal: AbortSignal): Promise<{ valide: boolean; reponseBrute?: string }>;
}

export class ErreurVies extends Error {
  override name = 'ErreurVies';
}

export type ResultatVies = {
  issue: 'valide' | 'invalide' | 'indisponible-impossible' | 'interrupteur-ferme' | 'cle-invalide' | 'hors-perimetre';
};

export type ParametresVies = { port: PortVies; numero: string; delaiMs: number; ouvert?: boolean };

/** Trace archivable d'une vérification : la réponse brute n'y figure jamais, seulement son empreinte SHA-256. */
export type TraceVies = {
  etat: 'valide' | 'invalide' | 'a_confirmer';
  idRequete: string;
  horodatage: string;
  empreinteReponse: string | null;
};
export type ParametresViesTraces = ParametresVies & { maintenant?: () => Date; idRequete?: () => string };

const LONGUEUR_PAYS = 2;
const empreinte = (texte: string): string => createHash('sha256').update(texte).digest('hex');

type Sortie = { issue: ResultatVies['issue']; empreinteReponse: string | null };
const sans = (issue: ResultatVies['issue']): Sortie => ({ issue, empreinteReponse: null });

async function interroger(p: ParametresVies): Promise<Sortie> {
  if (p.ouvert !== true) return sans('interrupteur-ferme');
  const { statut } = analyserNumeroTva(p.numero);
  if (statut === 'hors_france') return sans('hors-perimetre');
  if (statut !== 'cle_juste') return sans('cle-invalide');
  const net = p.numero.replace(/\s+/g, '').toUpperCase();
  const controle = new AbortController();
  let minuterie: ReturnType<typeof setTimeout> | undefined;
  const delai = new Promise<never>((_, rejeter) => {
    minuterie = setTimeout(() => {
      controle.abort();
      rejeter(new ErreurVies());
    }, p.delaiMs);
  });
  try {
    const rep = await Promise.race([p.port.verifier(net.slice(0, LONGUEUR_PAYS), net.slice(LONGUEUR_PAYS), controle.signal), delai]);
    if (typeof rep?.valide !== 'boolean') return sans('indisponible-impossible');
    const brut = typeof rep.reponseBrute === 'string' ? rep.reponseBrute : JSON.stringify({ valide: rep.valide });
    return { issue: rep.valide ? 'valide' : 'invalide', empreinteReponse: empreinte(brut) };
  } catch {
    return sans('indisponible-impossible');
  } finally {
    clearTimeout(minuterie);
  }
}

/** Projection historique : seule l'issue est rendue. */
export async function verifierVies(p: ParametresVies): Promise<ResultatVies> {
  return { issue: (await interroger(p)).issue };
}

const ETAT_PAR_ISSUE: Record<ResultatVies['issue'], TraceVies['etat']> = {
  valide: 'valide',
  invalide: 'invalide',
  'cle-invalide': 'invalide',
  'indisponible-impossible': 'a_confirmer',
  'interrupteur-ferme': 'a_confirmer',
  'hors-perimetre': 'a_confirmer',
};

/** Vérification tracée : identifiant de requête, horodatage UTC, empreinte ; tout ce qui n'est pas une réponse claire = à confirmer. */
export async function verifierViesTracee(p: ParametresViesTraces): Promise<TraceVies> {
  const idRequete = (p.idRequete ?? randomUUID)();
  const horodatage = (p.maintenant ?? (() => new Date()))().toISOString();
  const sortie = await interroger(p);
  return { etat: ETAT_PAR_ISSUE[sortie.issue], idRequete, horodatage, empreinteReponse: sortie.empreinteReponse };
}
