// Tête du journal signée (V3-SEC-005) : le coffre de la console signe, une copie est déposée hors base,
// la chaîne est relue sans IA avant chaque export et chaque nuit. Aucune clé privée ici : seulement des ports.
import type { Planificateur } from '../../../../packages/noyau/src/exploitation/planificateur.js';
import type { EntreeJournal } from '../../../../packages/noyau/src/journal/chaine.js';
import { documentTete, verifierTeteSignee, type TeteChaine, type VerificateurSignature } from '../../../../packages/noyau/src/journal/tete-signee.js';
import { verifierChaine, type DefautChaine } from '../../../../packages/noyau/src/journal/verifier.js';

export interface CoffreSignature { signer(document: string): Promise<string> } // lève si le coffre est indisponible
export interface DepotsTete {
  deposer(chemin: string, contenu: string): Promise<'cree' | 'existant'>; // jamais d'écrasement
  lire(chemin: string): Promise<string | null>;
}
export interface SourceJournal {
  societes(): Promise<readonly string[]>;
  creeLe(societeId: string): Promise<string>;
  entrees(societeId: string): Promise<readonly EntreeJournal[]>;
}
export type DepsTete = {
  coffre: CoffreSignature; depots: DepotsTete; source: SourceJournal; verificateur: VerificateurSignature;
  signaler(evenement: 'audit.chaine_rompue', societeId: string): void;
};
export type EvenementTete = 'heure' | 'nuit' | 'cloture' | 'export';
export type ControleExport =
  | { autorise: true; tete: TeteChaine }
  | { autorise: false; raison: 'chaine_rompue'; defaut: DefautChaine }
  | { autorise: false; raison: 'coffre_indisponible' };

const FORME_SOCIETE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const FORME_DATE = /^\d{4}-\d{2}-\d{2}$/;
const JOUR_MS = 86_400_000;

export function cheminTete(societeId: string, date: string): string {
  if (!FORME_SOCIETE.test(societeId) || !FORME_DATE.test(date) || Number.isNaN(Date.parse(date))) throw new Error('chemin_invalide');
  return `a_compta/journal/${societeId}/${date}.json`;
}

const jourDe = (instant: string): string => {
  if (Number.isNaN(Date.parse(instant))) throw new Error('instant_invalide');
  return new Date(Date.parse(instant)).toISOString().slice(0, 10);
};
const veilleDe = (instant: string): string => new Date(Date.parse(instant) - JOUR_MS).toISOString().slice(0, 10);

type FichierTete = { tete: TeteChaine; horodatage: string; evenement: EvenementTete; signature: string };

/** Lit la tête de la veille : null si absente, 'invalide' si elle ne porte pas une signature valable. */
async function teteVeille(d: DepsTete, societeId: string, instant: string): Promise<TeteChaine | null | 'invalide'> {
  const brut = await d.depots.lire(cheminTete(societeId, veilleDe(instant)));
  if (brut === null) return null;
  try {
    const f = JSON.parse(brut) as FichierTete;
    const ok = verifierTeteSignee(documentTete(f.tete, f.horodatage), f.signature, d.verificateur) && f.tete.societeId === societeId;
    return ok ? f.tete : 'invalide';
  } catch {
    return 'invalide';
  }
}

type Relecture = { ok: true; tete: TeteChaine } | { ok: false; defaut: DefautChaine };

async function relire(d: DepsTete, societeId: string, instant: string): Promise<Relecture> {
  const [entrees, creeLe, veille] = await Promise.all([d.source.entrees(societeId), d.source.creeLe(societeId), teteVeille(d, societeId, instant)]);
  if (veille === 'invalide') return { ok: false, defaut: 'tete_divergente' };
  const r = verifierChaine(entrees, { societeId, creeLe, ...(veille === null ? {} : { teteSignee: { sequence: veille.sequence, empreinte: veille.empreinte } }) });
  return r.ok ? { ok: true, tete: r.tete } : { ok: false, defaut: r.defaut };
}

/** Relit la chaîne, signe la tête avec le coffre, la dépose une seule fois par jour. Lève si rompue ou si le coffre manque. */
export async function signerEtDeposer(d: DepsTete, societeId: string, evenement: EvenementTete, instant: string): Promise<{ depot: 'cree' | 'existant'; tete: TeteChaine }> {
  const chemin = cheminTete(societeId, jourDe(instant));
  const r = await relire(d, societeId, instant);
  if (!r.ok) {
    d.signaler('audit.chaine_rompue', societeId);
    throw new Error('chaine_rompue');
  }
  const signature = await d.coffre.signer(documentTete(r.tete, instant));
  const fichier: FichierTete = { tete: r.tete, horodatage: instant, evenement, signature };
  return { depot: await d.depots.deposer(chemin, JSON.stringify(fichier)), tete: r.tete };
}

/** À appeler avant tout export officiel : chaîne rompue ou coffre absent = pas d'export. */
export async function controlerAvantExport(d: DepsTete, societeId: string, instant: string): Promise<ControleExport> {
  const r = await relire(d, societeId, instant);
  if (!r.ok) {
    d.signaler('audit.chaine_rompue', societeId);
    return { autorise: false, raison: 'chaine_rompue', defaut: r.defaut };
  }
  try {
    const { tete } = await signerEtDeposer(d, societeId, 'export', instant);
    return { autorise: true, tete };
  } catch {
    return { autorise: false, raison: 'coffre_indisponible' };
  }
}

/** Même relecture au démarrage : renvoie les sociétés dont la chaîne est rompue. */
export async function verifierAuDemarrage(d: DepsTete, instant: string): Promise<string[]> {
  const rompues: string[] = [];
  for (const s of await d.source.societes()) {
    if (!(await relire(d, s, instant)).ok) { d.signaler('audit.chaine_rompue', s); rompues.push(s); }
  }
  return rompues;
}

/** Signature à l'heure (minute en réglage) et relecture + signature chaque nuit, en UTC. */
export function inscrireTachesTete(p: Planificateur, d: DepsTete, reglage: { minuteHoraire: number }): void {
  const pourChaque = (evenement: EvenementTete) => async (passage: { prevuLe: string }): Promise<void> => {
    let echec = false;
    for (const s of await d.source.societes()) {
      try { await signerEtDeposer(d, s, evenement, passage.prevuLe); } catch { echec = true; }
    }
    if (echec) throw new Error('signature_en_echec');
  };
  p.inscrire({ nom: 'journal.tete-horaire', rythme: { chaque: 'heure', minute: reglage.minuteHoraire }, executer: pourChaque('heure') });
  p.inscrire({ nom: 'journal.verification-nocturne', rythme: { chaque: 'jour', heure: 3, minute: 0 }, executer: pourChaque('nuit') });
}
