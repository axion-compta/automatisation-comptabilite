import { empreinteChainee, empreinteInitiale, ErreurJournal } from './canonique.js';
import type { EntreeJournal } from './chaine.js';

export type DefautChaine = 'modifiee' | 'supprimee' | 'inseree' | 'societe_melangee' | 'fin_tronquee' | 'tete_divergente';
export type TeteSignee = { sequence: number; empreinte: string };
export type ParametresVerification = { societeId: string; creeLe: string; teteSignee?: TeteSignee };
export type ResultatVerification =
  | { ok: true; tete: { societeId: string; sequence: number; empreinte: string } }
  | { ok: false; defaut: DefautChaine; sequence: number; evenement: 'audit.chaine_rompue' };

const rompue = (defaut: DefautChaine, sequence: number): ResultatVerification => ({
  ok: false,
  defaut,
  sequence,
  evenement: 'audit.chaine_rompue',
});

/** Vrai si l'empreinte stockée et le lien au précédent correspondent au recalcul. */
function empreinteJuste(e: unknown, precedente: string): boolean {
  if (e === null || typeof e !== 'object') return false;
  const { empreinte, ...contenu } = e as Record<string, unknown>;
  if (contenu.empreintePrecedente !== precedente) return false;
  try {
    return empreinteChainee(precedente, contenu) === empreinte;
  } catch {
    return false;
  }
}

/** Relit la chaîne sans rien croire des empreintes stockées : tout est recalculé. */
export function verifierChaine(entrees: readonly EntreeJournal[], p: ParametresVerification): ResultatVerification {
  if (!Array.isArray(entrees)) throw new ErreurJournal('contenu_invalide');
  const empreintes = [empreinteInitiale(p.societeId, p.creeLe)];
  for (const e of entrees) {
    const attendue = empreintes.length;
    const brut = e as unknown as Record<string, unknown> | null;
    if (brut === null || typeof brut !== 'object') return rompue('modifiee', attendue);
    if (brut.societeId !== p.societeId) return rompue('societe_melangee', attendue);
    const seq = brut.sequence;
    if (typeof seq !== 'number' || !Number.isSafeInteger(seq)) return rompue('modifiee', attendue);
    if (seq < attendue) return rompue('inseree', seq);
    if (seq > attendue) return rompue('supprimee', attendue);
    if (!empreinteJuste(e, empreintes[attendue - 1] as string)) return rompue('modifiee', attendue);
    empreintes.push(e.empreinte);
  }
  const derniere = empreintes.length - 1;
  const signee = p.teteSignee;
  if (signee !== undefined) {
    const s = signee?.sequence;
    if (typeof s !== 'number' || !Number.isSafeInteger(s) || s < 0) return rompue('tete_divergente', derniere);
    if (s > derniere) return rompue('fin_tronquee', derniere);
    if (empreintes[s] !== signee.empreinte) return rompue('tete_divergente', s);
  }
  return { ok: true, tete: { societeId: p.societeId, sequence: derniere, empreinte: empreintes[derniere] as string } };
}
