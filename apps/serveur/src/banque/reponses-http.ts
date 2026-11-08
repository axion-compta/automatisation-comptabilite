// Réponses HTTP communes du bloc banque et idempotence (ADR 0002). Aucun libellé, montant ni IBAN dans un corps de refus.
import { createHash } from 'node:crypto';
import { CleIdempotence } from '../../../../packages/contrat/src/schemas.js';
import { ErreurDepot } from './depot.js';
export type ReponseHttp = { statut: 200 | 202 | 400 | 403 | 404 | 409 | 422; corps: unknown };
export const reponse = (statut: ReponseHttp['statut'], code: string): ReponseHttp => ({ statut, corps: { code } });
export function versHttp(e: unknown): ReponseHttp {
  if (!(e instanceof ErreurDepot)) throw e;
  return reponse(e.code === 'acces_refuse' ? 403 : e.code === 'inconnu' ? 404 : e.code === 'version_perimee' ? 409 : 422, e.code);
}
export const proteger = (f: () => Promise<ReponseHttp>): Promise<ReponseHttp> => f().catch(versHttp);
export interface RegistreIdempotence {
  lire(societeId: string, cle: string): Promise<{ empreinteCorps: string; reponse: ReponseHttp } | undefined>;
  noter(societeId: string, cle: string, empreinteCorps: string, reponse: ReponseHttp): Promise<void>;
}
export function creerRegistreMemoire(): RegistreIdempotence {
  const notes = new Map<string, { empreinteCorps: string; reponse: ReponseHttp }>();
  return {
    lire: async (s, c) => notes.get(`${s}\u001f${c}`),
    noter: async (s, c, empreinteCorps, rep) => void notes.set(`${s}\u001f${c}`, { empreinteCorps, reponse: rep }),
  };
}
const trier = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(trier) : v !== null && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, x]) => [k, trier(x)])) : v;
export const empreinteCorps = (corps: unknown): string => createHash('sha256').update(JSON.stringify(trier(corps)) ?? 'null').digest('hex');
/** Seules les réponses réussies sont notées : un refus peut être rejoué une fois la cause levée. */
export async function avecIdempotence(registre: RegistreIdempotence, societeId: string, cle: string, corps: unknown, executer: () => Promise<ReponseHttp>): Promise<ReponseHttp> {
  if (!CleIdempotence.safeParse(cle).success) return reponse(400, 'cle_invalide');
  const emp = empreinteCorps(corps);
  const vu = await registre.lire(societeId, cle);
  if (vu) return vu.empreinteCorps === emp ? vu.reponse : reponse(409, 'cle_reutilisee');
  const rep = await executer();
  if (rep.statut < 300) await registre.noter(societeId, cle, emp, rep);
  return rep;
}
