// Envoi du paquet au comptable du client par lien expirant. Tout passe par des ports (stockage, liens, e-mail, historique).
import { createHash, randomBytes } from 'node:crypto';
import { composerPaquet } from '../../../../packages/noyau/src/exports/paquet.js';
import { exigerNiveau, type ReglagesConnexion, type Revendications } from '../../../../packages/noyau/src/securite/connexion.js';

type EntreePaquet = Parameters<typeof composerPaquet>[0];
type OptionsPaquet = Parameters<typeof composerPaquet>[1];
type SortiePaquet = ReturnType<typeof composerPaquet>;

export class ErreurEnvoiComptable extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'ErreurEnvoiComptable';
    this.code = code;
  }
}

export interface PaquetComptable extends SortiePaquet { id: string; exerciceId: string; creeLe: number }
export interface LienEnregistre { empreinteJeton: string; societeId: string; paquetId: string; expireLeMs: number }
export interface PortPaquets {
  enregistrer(societeId: string, paquet: PaquetComptable): Promise<void>;
  lire(societeId: string, id: string): Promise<PaquetComptable | null>;
}
export interface PortLiens {
  enregistrer(lien: LienEnregistre): Promise<void>;
  parEmpreinte(empreinte: string): Promise<LienEnregistre | null>;
}
export interface PortCourrielSortant { envoyer(m: { a: string; url: string; expireLeMs: number }): Promise<void> }
export interface TraceComptable { type: 'envoi_comptable' | 'ouverture_lien_comptable'; par?: string; leMs: number; paquetId: string }
export interface PortHistorique { ajouter(societeId: string, trace: TraceComptable): Promise<void> }
export interface PortsEnvoiComptable { paquets: PortPaquets; liens: PortLiens; courriel: PortCourrielSortant; historique: PortHistorique }

const entierSur = (n: unknown, min: number): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= min;
const empreinte = (jeton: string): string => createHash('sha256').update(jeton).digest('hex');
const FORME_COURRIEL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export async function preparerExportComptable(
  a: { societeId: string; exerciceId: string; entree: EntreePaquet; options: OptionsPaquet; id: string; maintenantMs: number },
  ports: Pick<PortsEnvoiComptable, 'paquets'>,
): Promise<{ id: string; nbFichiers: number; exclus: string[] }> {
  if (!entierSur(a.maintenantMs, 0)) throw new ErreurEnvoiComptable('instant_invalide', 'Instant invalide.');
  const sortie = composerPaquet(a.entree, a.options);
  await ports.paquets.enregistrer(a.societeId, { ...sortie, id: a.id, exerciceId: a.exerciceId, creeLe: a.maintenantMs });
  return { id: a.id, nbFichiers: sortie.fichiers.length, exclus: sortie.exclus };
}

export function lireExportComptable(ports: Pick<PortsEnvoiComptable, 'paquets'>, societeId: string, id: string): Promise<PaquetComptable | null> {
  return ports.paquets.lire(societeId, id);
}

export async function envoyerLienComptable(
  a: {
    societeId: string; paquetId: string; destinataire: string; par: string; revendications: Revendications | undefined;
    maintenantMs: number; reglagesConnexion: ReglagesConnexion; dureeLienMs: number; baseUrl: string;
  },
  ports: PortsEnvoiComptable,
): Promise<{ ok: true; expireLeMs: number } | { ok: false; code: string }> {
  if (!entierSur(a.dureeLienMs, 1)) throw new ErreurEnvoiComptable('duree_invalide', 'Durée invalide.');
  if (!entierSur(a.maintenantMs, 0)) throw new ErreurEnvoiComptable('instant_invalide', 'Instant invalide.');
  const verdict = exigerNiveau(a.revendications, 'exporter_dossier', a.maintenantMs, a.reglagesConnexion);
  if (!verdict.ok) return { ok: false, code: verdict.raison };
  if (!FORME_COURRIEL.test(a.destinataire)) return { ok: false, code: 'destinataire_invalide' };
  if ((await ports.paquets.lire(a.societeId, a.paquetId)) === null) return { ok: false, code: 'paquet_introuvable' };
  const jeton = randomBytes(32).toString('base64url');
  const expireLeMs = a.maintenantMs + a.dureeLienMs;
  await ports.liens.enregistrer({ empreinteJeton: empreinte(jeton), societeId: a.societeId, paquetId: a.paquetId, expireLeMs });
  await ports.courriel.envoyer({ a: a.destinataire, url: `${a.baseUrl}${jeton}`, expireLeMs });
  await ports.historique.ajouter(a.societeId, { type: 'envoi_comptable', par: a.par, leMs: a.maintenantMs, paquetId: a.paquetId });
  return { ok: true, expireLeMs };
}

export async function ouvrirLienComptable(
  jeton: string,
  maintenantMs: number,
  ports: PortsEnvoiComptable,
): Promise<{ etat: 'ok'; paquet: PaquetComptable } | { etat: 'expire'; code: 'lien_expire' } | { etat: 'inconnu' }> {
  if (!entierSur(maintenantMs, 0)) throw new ErreurEnvoiComptable('instant_invalide', 'Instant invalide.');
  const lien = await ports.liens.parEmpreinte(empreinte(jeton));
  if (lien === null) return { etat: 'inconnu' };
  if (maintenantMs >= lien.expireLeMs) return { etat: 'expire', code: 'lien_expire' };
  const paquet = await ports.paquets.lire(lien.societeId, lien.paquetId);
  if (paquet === null) return { etat: 'inconnu' };
  await ports.historique.ajouter(lien.societeId, { type: 'ouverture_lien_comptable', leMs: maintenantMs, paquetId: lien.paquetId });
  return { etat: 'ok', paquet };
}
