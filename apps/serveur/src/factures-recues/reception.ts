// Réception des factures électroniques : interfaces d'adaptateur, webhook signé, rattrapage par curseur.
// Écrit contre des interfaces : aucun réseau, aucune base, aucun adaptateur réel. Aucune IA.
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { PortAlerteExploitation } from '../../../../packages/noyau/src/exploitation/port-alerte.js';
import {
  type Arrivee, type EtatFacturesRecues, type FactureRecue, statutAEnvoyer, recevoir,
} from '../../../../packages/noyau/src/factures-recues/cycle.js';

export class ErreurReception extends Error {
  override name = 'ErreurReception';
  constructor(readonly code: string) {
    super(code);
  }
}

export interface PortCoffre { lireSecret(nom: string): Promise<string | undefined> }
export interface AdaptateurPlateforme {
  nom: string;
  authentifier(coffre: PortCoffre): Promise<void>;
  lister(depuisCurseur: string | null, signal: AbortSignal): Promise<{ arrivees: Omit<Arrivee, 'source'>[]; curseurSuivant: string | null }>;
  telecharger(idExterne: string): Promise<Uint8Array>;
  accuser(idExterne: string): Promise<void>;
  envoyerStatut(idExterne: string, envoi: { statut: string; validePar: string; valideLe: string }): Promise<void>;
  sante(): Promise<boolean>;
}
export interface ValeurReception { etat: EtatFacturesRecues; curseurs: Record<string, string | null>; derniereReceptionMs: Record<string, number> }
export interface PortEtatReception { lire(societeId: string): Promise<ValeurReception>; ecrire(societeId: string, valeur: ValeurReception): Promise<void> }
export type AlerteReception =
  | { code: 'facture_autre_destinataire'; plateforme: string; idExterne: string }
  | { code: 'plateforme_en_echec'; plateforme: string }
  | { code: 'reception_en_retard'; plateforme: string };
export type PortAlerteReception = PortAlerteExploitation<AlerteReception>;

export type ResultatWebhook = { ok: true } | { ok: false; code: 'secret_absent' | 'signature_invalide' | 'webhook_perime' };

export async function verifierWebhook(
  m: { corps: Uint8Array; signature: string; horodatageMs: number },
  o: { coffre: PortCoffre; nomSecret: string; maintenantMs: number; toleranceMs: number },
): Promise<ResultatWebhook> {
  const secret = await o.coffre.lireSecret(o.nomSecret);
  if (secret === undefined || secret === '') return { ok: false, code: 'secret_absent' };
  if (!Number.isFinite(m.horodatageMs) || Math.abs(o.maintenantMs - m.horodatageMs) > o.toleranceMs) {
    return { ok: false, code: 'webhook_perime' };
  }
  const attendue = Buffer.from(createHmac('sha256', secret).update(`${String(m.horodatageMs)}.`).update(m.corps).digest('hex'));
  const recue = Buffer.from(typeof m.signature === 'string' ? m.signature : '');
  const bon = recue.length === attendue.length && timingSafeEqual(recue, attendue);
  return bon ? { ok: true } : { ok: false, code: 'signature_invalide' };
}

export async function rangerArrivees(
  societeId: string,
  sirenSociete: string,
  plateforme: AdaptateurPlateforme,
  arrivees: readonly Omit<Arrivee, 'source'>[],
  ports: { etat: PortEtatReception; alerte: PortAlerteReception },
): Promise<{ aAccuser: string[] }> {
  const valeur = await ports.etat.lire(societeId);
  let etat = valeur.etat;
  const aAccuser: string[] = [];
  const autres: string[] = [];
  for (const a of arrivees) {
    const r = recevoir(etat, { ...a, source: plateforme.nom }, sirenSociete);
    etat = r.etat;
    (r.resultat === 'autre_destinataire' ? autres : aAccuser).push(a.idExterne);
  }
  await ports.etat.ecrire(societeId, { ...valeur, etat });
  for (const id of aAccuser) await plateforme.accuser(id);
  for (const idExterne of autres) {
    await ports.alerte.alerter({ code: 'facture_autre_destinataire', plateforme: plateforme.nom, idExterne });
  }
  return { aAccuser };
}

async function listerAvecDelai(a: AdaptateurPlateforme, curseur: string | null, delaiAppelMs: number) {
  const ctrl = new AbortController();
  let minuterie: ReturnType<typeof setTimeout> | undefined;
  const delai = new Promise<never>((_, rejeter) => {
    minuterie = setTimeout(() => { ctrl.abort(); rejeter(new ErreurReception('delai_depasse')); }, delaiAppelMs);
  });
  try {
    return await Promise.race([a.lister(curseur, ctrl.signal), delai]);
  } finally {
    clearTimeout(minuterie);
  }
}

export async function rattraper(p: {
  societeId: string;
  sirenSociete: string;
  adaptateur: AdaptateurPlateforme;
  ports: { etat: PortEtatReception; coffre: PortCoffre };
  maintenantMs: number;
  delaiAlerteMs: number;
  delaiAppelMs: number;
  alerte: PortAlerteReception;
}): Promise<{ rangees: number; echec: boolean }> {
  const { adaptateur: a, alerte, societeId } = p, nom = a.nom;
  const avant = await p.ports.etat.lire(societeId);
  let rangees = 0, echec = false, recu = false;
  try {
    await a.authentifier(p.ports.coffre);
    const page = await listerAvecDelai(a, avant.curseurs[nom] ?? null, p.delaiAppelMs);
    const r = await rangerArrivees(societeId, p.sirenSociete, a, page.arrivees, { etat: p.ports.etat, alerte });
    rangees = r.aAccuser.length;
    recu = page.arrivees.length > 0;
    const apres = await p.ports.etat.lire(societeId);
    const dates = recu ? { ...apres.derniereReceptionMs, [nom]: p.maintenantMs } : apres.derniereReceptionMs;
    await p.ports.etat.ecrire(societeId, { ...apres, curseurs: { ...apres.curseurs, [nom]: page.curseurSuivant }, derniereReceptionMs: dates });
  } catch (e) {
    if (e instanceof Error && e.name === 'ErreurFactureRecue') throw e;
    echec = true;
    await alerte.alerter({ code: 'plateforme_en_echec', plateforme: nom });
  }
  const derniere = recu ? p.maintenantMs : avant.derniereReceptionMs[nom];
  if (derniere !== undefined && p.maintenantMs - derniere > p.delaiAlerteMs) {
    await alerte.alerter({ code: 'reception_en_retard', plateforme: nom });
  }
  return { rangees, echec };
}

export async function envoyerStatutValide(
  facture: FactureRecue,
  statut: string,
  statutsPermis: readonly string[],
  validation: { par: string; le: string } | undefined,
  adaptateur: AdaptateurPlateforme,
): Promise<{ ok: true } | { ok: false; code: 'validation_client_requise' | 'statut_inconnu' }> {
  const r = statutAEnvoyer(facture, statut, statutsPermis, validation);
  if (!r.ok) return r;
  await adaptateur.envoyerStatut(facture.idExterne, r.envoi);
  return { ok: true };
}
