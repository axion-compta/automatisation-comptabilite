// Connecteur VIES (CC-K09) : appelé seulement si la clé est juste, interrupteur fermé par défaut.
// Écrit contre une interface : aucun appel réseau réel ici. Service indisponible = IMPOSSIBLE, jamais valide.
import { analyserNumeroTva } from '../../../../packages/noyau/src/controles/regles/numero-tva.js';

export interface PortVies {
  verifier(pays: string, numero: string, signal: AbortSignal): Promise<{ valide: boolean }>;
}

export class ErreurVies extends Error {
  override name = 'ErreurVies';
}

export type ResultatVies = {
  issue: 'valide' | 'invalide' | 'indisponible-impossible' | 'interrupteur-ferme' | 'cle-invalide' | 'hors-perimetre';
};

export type ParametresVies = { port: PortVies; numero: string; delaiMs: number; ouvert?: boolean };

const LONGUEUR_PAYS = 2;
const resultat = (issue: ResultatVies['issue']): ResultatVies => ({ issue });

export async function verifierVies(p: ParametresVies): Promise<ResultatVies> {
  if (p.ouvert !== true) return resultat('interrupteur-ferme');
  const { statut } = analyserNumeroTva(p.numero);
  if (statut === 'hors_france') return resultat('hors-perimetre');
  if (statut !== 'cle_juste') return resultat('cle-invalide');
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
    if (typeof rep?.valide !== 'boolean') return resultat('indisponible-impossible');
    return resultat(rep.valide ? 'valide' : 'invalide');
  } catch {
    return resultat('indisponible-impossible');
  } finally {
    clearTimeout(minuterie);
  }
}
