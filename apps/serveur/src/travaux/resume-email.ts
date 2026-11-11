// Résumé quotidien par e-mail (PR-R5, PR-R6). Écrit contre des interfaces : aucun fournisseur d'envoi choisi (D88),
// jamais d'envoi réel ici. Heures converties en UTC au moment de décider (changement d'heure compris).
import { decisionResume } from '../../../../packages/noyau/src/alertes/notifications.js';
import type { Planificateur } from '../../../../packages/noyau/src/exploitation/planificateur.js';
import { SUJET_RESUME, texteResume, type CategorieResume } from '../../../../packages/textes/src/courriels/resume.js';

export const NOM_TRAVAIL_RESUME = 'resume.email';
export const FUSEAU_PAR_DEFAUT = 'Europe/Paris'; // HYPOTHÈSE
export const HEURE_PAR_DEFAUT = { heure: 7, minute: 30 }; // HYPOTHÈSE

export interface PersonneResume {
  personneId: string;
  adresse: string;
  actifs: boolean;
  heure?: number;
  minute?: number;
  fuseau?: string;
  comptes: Readonly<Partial<Record<CategorieResume, number>>>;
}
export interface Courriel { destinataire: string; sujet: string; texte: string }
/** Interface d'envoi : le seul faux existe dans les tests. */
export interface PortEnvoi { envoyer(c: Courriel): Promise<void> }
export interface PortResume {
  personnes(): Promise<readonly PersonneResume[]>;
  dejaEnvoyes(): Promise<readonly { personneId: string; dateEnvoi: string }[]>;
  /** Réservation atomique du jour : faux si déjà prise. */
  reserver(personneId: string, dateEnvoi: string): Promise<boolean>;
  liberer(personneId: string, dateEnvoi: string): Promise<void>;
  /** Journal `resume_email_envoi` : codes seulement, sans adresse. */
  journaliser(ligne: { personneId: string; dateEnvoi: string; issue: 'envoye' | 'echec' }): Promise<void>;
}
export interface PortJetons {
  creer(personneId: string): Promise<string>;
  /** Usage unique : rend l'identifiant la première fois, null ensuite. */
  consommer(jeton: string): Promise<string | null>;
}

export interface ParametresResume {
  resume: PortResume;
  envoi: PortEnvoi;
  jetons: PortJetons;
  accesSortant: boolean;
  baseLiens: string;
}

function parties(ms: number, fuseau: string): Record<string, number> {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: fuseau, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
  const o: Record<string, number> = {};
  for (const p of f.formatToParts(new Date(ms))) if (p.type !== 'literal') o[p.type] = Number(p.value);
  return o;
}
const deux = (n: number): string => String(n).padStart(2, '0');

export function dateLocale(instantUtc: string, fuseau: string): string {
  const p = parties(Date.parse(instantUtc), fuseau);
  return `${p.year}-${deux(p.month ?? 0)}-${deux(p.day ?? 0)}`;
}

/** Instant UTC (ms) de l'heure locale choisie ce jour-là. */
export function instantEnvoi(dateLoc: string, heure: number, minute: number, fuseau: string): number {
  const [a, m, j] = dateLoc.split('-').map(Number) as [number, number, number];
  const voulu = Date.UTC(a, m - 1, j, heure, minute);
  let ms = voulu;
  for (let i = 0; i < 3; i += 1) {
    const p = parties(ms, fuseau);
    ms += voulu - Date.UTC(p.year ?? 0, (p.month ?? 1) - 1, p.day ?? 1, p.hour ?? 0, p.minute ?? 0);
  }
  return ms;
}

export function creerTravailResume(o: ParametresResume): { passer(maintenant: string): Promise<number> } {
  return {
    async passer(maintenant) {
      if (!o.accesSortant) return 0; // installé sans accès sortant : résumé inactif
      const nowMs = Date.parse(maintenant);
      let envoyes = 0;
      let echecs = 0;
      for (const p of await o.resume.personnes()) {
        const fuseau = p.fuseau ?? FUSEAU_PAR_DEFAUT;
        const jour = dateLocale(maintenant, fuseau);
        const h = p.heure ?? HEURE_PAR_DEFAUT.heure;
        const mi = p.minute ?? HEURE_PAR_DEFAUT.minute;
        if (nowMs < instantEnvoi(jour, h, mi, fuseau)) continue;
        const nbActions = Object.values(p.comptes).reduce<number>((s, n) => s + (n ?? 0), 0);
        const decision = decisionResume({
          personneId: p.personneId, dateDuJour: jour, actifs: p.actifs, nbActions, dejaEnvoye: await o.resume.dejaEnvoyes(),
        });
        if (decision !== 'envoyer' || !(await o.resume.reserver(p.personneId, jour))) continue;
        try {
          const jeton = await o.jetons.creer(p.personneId);
          await o.envoi.envoyer({
            destinataire: p.adresse,
            sujet: SUJET_RESUME,
            texte: texteResume({
              comptes: p.comptes,
              lienOuverture: `${o.baseLiens}/alertes`,
              lienDesinscription: `${o.baseLiens}/desinscription/${encodeURIComponent(jeton)}`,
            }),
          });
          await o.resume.journaliser({ personneId: p.personneId, dateEnvoi: jour, issue: 'envoye' });
          envoyes += 1;
        } catch {
          await o.resume.liberer(p.personneId, jour);
          await o.resume.journaliser({ personneId: p.personneId, dateEnvoi: jour, issue: 'echec' });
          echecs += 1;
        }
      }
      if (echecs > 0) throw new Error('envois_en_echec');
      return envoyes;
    },
  };
}

/** Désinscription sans connexion : le jeton ne sert qu'une fois. */
export async function desinscrire(
  jetons: PortJetons,
  desactiver: (personneId: string) => Promise<void>,
  jeton: string,
): Promise<boolean> {
  const personneId = await jetons.consommer(jeton);
  if (personneId === null) return false;
  await desactiver(personneId);
  return true;
}

export function inscrireTravailResume(planificateur: Planificateur, travail: { passer(m: string): Promise<number> }): void {
  planificateur.inscrire({
    nom: NOM_TRAVAIL_RESUME,
    rythme: { chaque: 'minute' },
    async executer(passage) {
      await travail.passer(passage.prevuLe);
    },
  });
}
