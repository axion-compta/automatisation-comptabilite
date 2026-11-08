import type { Enveloppe } from './enveloppe.js';

export interface BoiteEnvoi { deposer(e: Enveloppe): void }
export interface UniteDeTravail { executer<R>(travail: (tx: { boite: BoiteEnvoi }) => Promise<R>): Promise<R> }
export interface StockEnvoi {
  enAttente(limite: number): Promise<readonly Enveloppe[]>;
  marquerPubliee(id: string): Promise<void>;
}
export interface Publieur { publier(e: Enveloppe): Promise<void> }
export type ResultatRelais = { publiees: number; arret: 'vide' | 'limite' | 'echec' };

/** Publie dans l'ordre de dépôt (au moins une fois) ; s'arrête au premier échec sans recopier son message. */
export async function relayer(stock: StockEnvoi, publieur: Publieur, limite: number): Promise<ResultatRelais> {
  if (!Number.isInteger(limite) || limite < 0) throw new RangeError('limite invalide');
  const lot = await stock.enAttente(limite);
  let publiees = 0;
  for (const e of lot) {
    try {
      await publieur.publier(e);
    } catch {
      return { publiees, arret: 'echec' };
    }
    await stock.marquerPubliee(e.id);
    publiees += 1;
  }
  return { publiees, arret: lot.length < limite ? 'vide' : 'limite' };
}
