// Demande d'effacement à la console : le module ne supprime jamais, il demande. Écrit contre des interfaces (console, suivi) : aucun réseau ni base.
import { purgePossible, type Gel, type RegleConservation } from '../../../../packages/noyau/src/conservation/regles.js';
import { evenementRejeu, aRejouer, remiseEnServicePermise, type Effacement } from '../../../../packages/noyau/src/rgpd/rejeu-effacements.js';
import { proposerPurge, resumePurge, type LignePurge } from '../../../../packages/noyau/src/rgpd/purge-proposee.js';
import { ErreurRgpd, type EvenementPersonne } from '../../../../packages/noyau/src/rgpd/types.js';

export type DemandeConsole = { sorte: 'effacement' | 'purge' | 'rejeu'; societeId: string; objetId: string; decisionId: string };
export type EtatConsole = 'en_attente' | 'fait' | 'refuse';
export type EtatSuivi = 'envoye' | 'fait' | 'refuse';

export interface PortConsoleEffacement {
  demander(d: DemandeConsole): Promise<{ ref: string }>;
  etat(ref: string): Promise<EtatConsole>;
}
export interface SuiviEffacements {
  deja(decisionId: string): Promise<string | undefined>;
  noter(decisionId: string, ref: string, etat: EtatSuivi): Promise<void>;
}

export const gelActif = (gels: readonly Gel[], aujourdhui: string): boolean => {
  const v = purgePossible({ etat: 'a_confirmer', raison: 'aucune_regle' }, { gels, aujourdhui });
  return !v.ok && v.code === 'gel_actif';
};

const vide = (s: unknown): boolean => typeof s !== 'string' || s === '';

function verifierEntrees(aEffacer: readonly { objetId: string; decisionId: string }[]): void {
  const vus = new Set<string>();
  for (const x of aEffacer) {
    if (vide(x.objetId) || vide(x.decisionId)) throw new ErreurRgpd('objet_inconnu');
    if (vus.has(x.decisionId)) throw new ErreurRgpd('doublon');
    vus.add(x.decisionId);
  }
}

async function envoyer(
  sorte: DemandeConsole['sorte'], societeId: string, aEnvoyer: readonly { objetId: string; decisionId: string }[],
  console: PortConsoleEffacement, suivi: SuiviEffacements,
): Promise<number> {
  let envoyes = 0;
  for (const x of aEnvoyer) {
    if ((await suivi.deja(x.decisionId)) !== undefined) continue;
    const { ref } = await console.demander({ sorte, societeId, objetId: x.objetId, decisionId: x.decisionId });
    await suivi.noter(x.decisionId, ref, 'envoye');
    envoyes += 1;
  }
  return envoyes;
}

export async function envoyerEffacements(p: {
  societeId: string; aEffacer: readonly { objetId: string; decisionId: string }[]; gels: readonly Gel[]; aujourdhui: string;
  console: PortConsoleEffacement; suivi: SuiviEffacements;
}): Promise<{ envoyes: number; raison?: 'gel_actif' }> {
  if (gelActif(p.gels, p.aujourdhui)) return { envoyes: 0, raison: 'gel_actif' };
  verifierEntrees(p.aEffacer);
  return { envoyes: await envoyer('effacement', p.societeId, p.aEffacer, p.console, p.suivi) };
}

export async function suivreEffacements(
  refs: readonly { ref: string; decisionId: string }[], console: PortConsoleEffacement, suivi: SuiviEffacements,
): Promise<Record<EtatConsole, number>> {
  const comptes: Record<EtatConsole, number> = { en_attente: 0, fait: 0, refuse: 0 };
  for (const { ref, decisionId } of refs) {
    const etat = await console.etat(ref);
    comptes[etat] += 1;
    if (etat !== 'en_attente') await suivi.noter(decisionId, ref, etat);
  }
  return comptes;
}

// Propose seulement ce que proposerPurge retient ; l'efface la console, après décision tracée.
export async function proposerPurgeQuotidienne(p: {
  societeId: string; lignes: readonly LignePurge[]; regles: readonly RegleConservation[]; gels: readonly Gel[]; aujourdhui: string;
  console: PortConsoleEffacement; suivi: SuiviEffacements;
}): Promise<ReturnType<typeof resumePurge>> {
  const r = proposerPurge(p.lignes, p.regles, { gels: p.gels, aujourdhui: p.aujourdhui });
  const aEnvoyer = r.proposees.map((id) => ({ objetId: id, decisionId: `purge-${p.aujourdhui}-${id}` }));
  await envoyer('purge', p.societeId, aEnvoyer, p.console, p.suivi);
  return resumePurge(r);
}

export async function rejouerAvantRemise(p: {
  societeId: string; effacements: readonly Effacement[]; dumpPrisLe: string; visibles: readonly string[];
  console: PortConsoleEffacement; maintenant: string;
}): Promise<{ permise: boolean; manquants: string[]; encoreVisibles: string[]; evenement: EvenementPersonne }> {
  const attendus = aRejouer(p.effacements, p.dumpPrisLe);
  const rejoues: string[] = [];
  for (const x of attendus) {
    try {
      await p.console.demander({ sorte: 'rejeu', societeId: p.societeId, objetId: x.objet, decisionId: x.decisionId });
      rejoues.push(x.objet);
    } catch {
      // Demande échouée : l'objet reste « manquant », la remise est refusée.
    }
  }
  const verdict = remiseEnServicePermise(attendus.map((x) => x.objet), rejoues, p.visibles);
  return { ...verdict, evenement: evenementRejeu(rejoues.length, p.maintenant) };
}
