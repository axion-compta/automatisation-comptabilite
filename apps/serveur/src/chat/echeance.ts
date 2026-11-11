// Échéance des conversations et préférences du chat : liste ce qui est échu et en demande l'effacement à la console.
// Le module ne supprime jamais. Aucune durée dans le code : elle vient de paramètres datés (D88), vides par défaut.
// Durée absente, vide, non valide ou non entière : rien n'est échu, rien n'est effacé. Jamais pendant un gel.
import { ajouterJours, comparerDates } from '../../../../packages/noyau/src/dates/civiles.js';
import type { Gel } from '../../../../packages/noyau/src/conservation/regles.js';
import { ErreurParametre, parametreAuJour, utilisablePourOfficiel, type ParametreLegal } from '../../../../packages/parametres/src/au-jour.js';
import { envoyerEffacements, type PortConsoleEffacement, type SuiviEffacements } from '../rgpd/effacement-console.js';

export const CLE_DUREE_CONVERSATION = 'chat.conversation_duree_jours';
export const CLE_DUREE_PREFERENCE = 'chat.preference_duree_jours';

export type ElementChat = {
  id: string;
  sorte: 'conversation' | 'preference';
  societeId: string;
  /** Date civile AAAA-MM-JJ de la dernière activité. */
  derniereActivite: string;
};

/** Durée en jours lue au jour D ; undefined si rien d'utilisable (rien n'est alors effacé). */
function dureeJours(parametres: readonly ParametreLegal[], cle: string, aujourdhui: string): number | undefined {
  let ligne: ParametreLegal;
  try {
    ligne = parametreAuJour(parametres, cle, 'FR', aujourdhui);
  } catch (e) {
    if (e instanceof ErreurParametre) return undefined;
    throw e;
  }
  if (!utilisablePourOfficiel(ligne) || !/^\d+$/.test(ligne.valeur)) return undefined;
  const n = Number(ligne.valeur);
  return Number.isSafeInteger(n) && n > 0 ? n : undefined;
}

/** Éléments échus : dernière activité + durée au plus tard la veille du jour D. Liste vide par défaut. */
export function listerEchus(
  elements: readonly ElementChat[], parametres: readonly ParametreLegal[] = [], aujourdhui: string = '',
): ElementChat[] {
  if (aujourdhui === '') return [];
  const durees = {
    conversation: dureeJours(parametres, CLE_DUREE_CONVERSATION, aujourdhui),
    preference: dureeJours(parametres, CLE_DUREE_PREFERENCE, aujourdhui),
  };
  return elements.filter((e) => {
    const d = durees[e.sorte];
    return d !== undefined && comparerDates(ajouterJours(e.derniereActivite, d), aujourdhui) < 0;
  });
}

export async function demanderEffacementsEchus(p: {
  elements: readonly ElementChat[]; parametres: readonly ParametreLegal[]; gels: readonly Gel[]; aujourdhui: string;
  console: PortConsoleEffacement; suivi: SuiviEffacements;
}): Promise<{ envoyes: number; raison?: 'gel_actif' }> {
  const echus = listerEchus(p.elements, p.parametres, p.aujourdhui);
  const parSociete = new Map<string, ElementChat[]>();
  for (const e of echus) parSociete.set(e.societeId, [...(parSociete.get(e.societeId) ?? []), e]);
  let envoyes = 0;
  for (const [societeId, liste] of parSociete) {
    const r = await envoyerEffacements({
      societeId, gels: p.gels, aujourdhui: p.aujourdhui, console: p.console, suivi: p.suivi,
      aEffacer: liste.map((e) => ({ objetId: e.id, decisionId: `echeance-chat-${p.aujourdhui}-${e.sorte}-${e.id}` })),
    });
    if (r.raison === 'gel_actif') return { envoyes, raison: 'gel_actif' };
    envoyes += r.envoyes;
  }
  return { envoyes };
}
