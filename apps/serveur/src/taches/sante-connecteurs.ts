// Santé quotidienne des connecteurs : un essai technique par connecteur et par jour, sans IA.
// Seul le nom du connecteur entre dans l'essai : aucune donnée client.
import {
  bandeau,
  enregistrerEssai,
  ErreurConnecteur,
  santeInitiale,
  type SanteConnecteur,
  type SeuilsEchecs,
} from '../../../../packages/noyau/src/sources/connecteurs.js';

export interface PortEssai {
  essayer(connecteur: string, signal: AbortSignal): Promise<boolean>;
}
export interface PortSante {
  lire(clientId: string): Promise<readonly SanteConnecteur[]>;
  ecrire(clientId: string, santes: readonly SanteConnecteur[]): Promise<void>;
}
export interface AlerteSante {
  code: 'connecteur_degrade' | 'connecteur_en_panne';
  clientId: string;
  connecteur: string;
}

export interface ParametresSante {
  clients: readonly string[];
  connecteurs: readonly string[];
  jour: string;
  seuils: SeuilsEchecs;
  delaiMs: number;
  essai: PortEssai;
  stock: PortSante;
  alerter(alerte: AlerteSante): void | Promise<void>;
}

export interface ResultatConnecteur { connecteur: string; etat: 'fait' | 'deja_fait'; sante: SanteConnecteur }
export interface ResultatSante { jour: string; clients: { clientId: string; connecteurs: ResultatConnecteur[] }[] }
export interface EtatConnecteur {
  connecteur: string;
  etat: SanteConnecteur['etat'];
  dernierOk: string | null;
  bandeau: 'connecteur_degrade' | 'connecteur_en_panne' | null;
}

/** Échec si l'essai lève, dépasse le délai ou répond non ; interrompu par le signal. */
async function essayer(port: PortEssai, connecteur: string, delaiMs: number): Promise<boolean> {
  const arret = new AbortController();
  let minuterie: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<boolean>((resoudre) => {
    minuterie = setTimeout(() => { arret.abort(); resoudre(false); }, delaiMs);
  });
  try {
    return (await Promise.race([port.essayer(connecteur, arret.signal).catch(() => false), limite])) === true;
  } catch {
    return false;
  } finally {
    clearTimeout(minuterie);
  }
}

async function passerConnecteur(p: ParametresSante, clientId: string, connecteur: string, santes: SanteConnecteur[]): Promise<ResultatConnecteur> {
  const rang = santes.findIndex((s) => s.connecteur === connecteur);
  const avant = rang >= 0 ? (santes[rang] as SanteConnecteur) : santeInitiale(connecteur);
  if (avant.dernierEssai === p.jour) return { connecteur, etat: 'deja_fait', sante: avant };
  const ok = await essayer(p.essai, connecteur, p.delaiMs);
  let apres: SanteConnecteur;
  try {
    apres = enregistrerEssai(avant, { jour: p.jour, ok }, p.seuils);
  } catch (e) {
    if (e instanceof ErreurConnecteur && e.code === 'meme_jour') return { connecteur, etat: 'deja_fait', sante: avant };
    throw e;
  }
  if (rang >= 0) santes[rang] = apres;
  else santes.push(apres);
  await p.stock.ecrire(clientId, santes);
  const code = bandeau(apres);
  if (code !== null && code !== bandeau(avant)) await p.alerter({ code, clientId, connecteur });
  return { connecteur, etat: 'fait', sante: apres };
}

/** Un client après l'autre, un connecteur après l'autre : jamais deux clients en cours. */
export async function passerSanteQuotidienne(p: ParametresSante): Promise<ResultatSante> {
  enregistrerEssai(santeInitiale('controle'), { jour: p.jour, ok: true }, p.seuils);
  const clients: ResultatSante['clients'] = [];
  for (const clientId of p.clients) {
    const santes = [...(await p.stock.lire(clientId))];
    const connecteurs: ResultatConnecteur[] = [];
    for (const connecteur of p.connecteurs) connecteurs.push(await passerConnecteur(p, clientId, connecteur, santes));
    clients.push({ clientId, connecteurs });
  }
  return { jour: p.jour, clients };
}

/** État lu tel que stocké, sans recalcul, trié par nom de connecteur. */
export async function lireEtatClient(stock: PortSante, clientId: string): Promise<EtatConnecteur[]> {
  const santes = await stock.lire(clientId);
  return santes
    .map((s) => ({ connecteur: s.connecteur, etat: s.etat, dernierOk: s.dernierOk, bandeau: bandeau(s) }))
    .sort((a, b) => (a.connecteur < b.connecteur ? -1 : a.connecteur > b.connecteur ? 1 : 0));
}
