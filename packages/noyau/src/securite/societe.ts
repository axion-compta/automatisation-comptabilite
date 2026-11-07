export type EntreeSociete = {
  societeSession: string;
  societeChemin?: string;
  societesDuCorps: readonly string[];
  societesDeLaPersonne: readonly string[];
};
export type VerdictSociete =
  | { ok: true; societeId: string }
  | { ok: false; raison: 'societe_unique' | 'non_authentifie' };

export const REPONSE_INTROUVABLE: Readonly<{ statut: 404; code: 'introuvable' }> = Object.freeze({
  statut: 404,
  code: 'introuvable',
});

export function verifierSocieteDeLaRequete(e: EntreeSociete): VerdictSociete {
  const s = e.societeSession;
  if (typeof s !== 'string' || s === '') return { ok: false, raison: 'non_authentifie' };
  const melange =
    !e.societesDeLaPersonne.includes(s) ||
    (e.societeChemin !== undefined && e.societeChemin !== s) ||
    e.societesDuCorps.some((c) => c !== s);
  return melange ? { ok: false, raison: 'societe_unique' } : { ok: true, societeId: s };
}

export function lireDansSociete<T extends { societeId: string }>(
  objet: T | undefined,
  societeId: string,
): T | typeof REPONSE_INTROUVABLE {
  return objet !== undefined && objet.societeId === societeId ? objet : REPONSE_INTROUVABLE;
}
