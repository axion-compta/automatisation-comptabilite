import { describe, expect, it } from 'vitest';
import type { Enveloppe } from '../enveloppe.js';
import { ErreurEvenement } from '../enveloppe.js';
import { relayer, type BoiteEnvoi, type Publieur, type StockEnvoi, type UniteDeTravail } from '../publication.js';

export type Fabrique = () => { unite: UniteDeTravail; stock: StockEnvoi };

export const brut = (id: string, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  id, type: 'compta.frais.propose', societe_id: 'societe-fictive-1', exercice_id: null, objet_id: 'objet-' + id,
  version: 1, acteur: { type: 'systeme', id: 'acteur-fictif-1' }, canal: 'systeme',
  horodatage: '2026-11-08T10:00:00Z', correlation_id: 'corr-' + id, charge: { statut: 'propose' }, ...extra,
});

const ids = (l: readonly Enveloppe[]): string[] => l.map((e) => e.id);
const publieurTest = (echouer: (e: Enveloppe) => boolean): { publieur: Publieur; recus: string[] } => {
  const recus: string[] = [];
  return { recus, publieur: { publier: (e) => (echouer(e) ? Promise.reject(new Error('detail-interne')) : (recus.push(e.id), Promise.resolve())) } };
};
const deposer = (b: BoiteEnvoi, ...l: string[]): void => l.forEach((i) => b.deposer(brut(i) as unknown as Enveloppe));

/** Test de contrat : tout branchement réel (table, file) doit passer cette suite. */
export function suitePublication(nom: string, fabrique: Fabrique): void {
  describe('suite publication : ' + nom, () => {
    it('depot-visible-apres-validation', async () => {
      const { unite, stock } = fabrique();
      await unite.executer(async (tx) => {
        deposer(tx.boite, 'a');
        expect(await stock.enAttente(9)).toHaveLength(0);
      });
      expect(ids(await stock.enAttente(9))).toEqual(['a']);
    });

    it('echec-de-transaction-rien-en-attente', async () => {
      const { unite, stock } = fabrique();
      const panne = new Error('panne-fictive');
      await expect(unite.executer(async (tx) => (deposer(tx.boite, 'a'), Promise.reject(panne)))).rejects.toBe(panne);
      expect(await stock.enAttente(9)).toHaveLength(0);
    });

    it('depot-hors-transaction-refuse', async () => {
      const { unite } = fabrique();
      const boite = await unite.executer(async (tx) => tx.boite);
      expect(() => deposer(boite, 'a')).toThrow(ErreurEvenement);
      try {
        deposer(boite, 'a');
      } catch (e) {
        expect((e as ErreurEvenement).code).toBe('hors_transaction');
      }
    });

    it('ordre-de-depot-conserve', async () => {
      const { unite, stock } = fabrique();
      await unite.executer(async (tx) => deposer(tx.boite, 'c', 'a'));
      await unite.executer(async (tx) => deposer(tx.boite, 'b'));
      expect(ids(await stock.enAttente(9))).toEqual(['c', 'a', 'b']);
    });

    it('relais-repris-apres-echec', async () => {
      const { unite, stock } = fabrique();
      await unite.executer(async (tx) => deposer(tx.boite, '1', '2', '3'));
      let essais = 0;
      const faux = publieurTest((e) => e.id === '2' && ++essais === 1);
      const r1 = await relayer(stock, faux.publieur, 9);
      expect(r1).toEqual({ publiees: 1, arret: 'echec' });
      expect(JSON.stringify(r1)).not.toContain('detail-interne');
      const r2 = await relayer(stock, faux.publieur, 9);
      expect(r2).toEqual({ publiees: 2, arret: 'vide' });
      expect(faux.recus).toEqual(['1', '2', '3']);
    });

    it('relais-limite-respectee', async () => {
      const { unite, stock } = fabrique();
      await unite.executer(async (tx) => deposer(tx.boite, '1', '2', '3'));
      const faux = publieurTest(() => false);
      expect(await relayer(stock, faux.publieur, 2)).toEqual({ publiees: 2, arret: 'limite' });
      expect(faux.recus).toEqual(['1', '2']);
      expect(ids(await stock.enAttente(9))).toEqual(['3']);
    });

    it('meme-id-une-seule-fois', async () => {
      const { unite, stock } = fabrique();
      await unite.executer(async (tx) => deposer(tx.boite, 'a', 'a'));
      await unite.executer(async (tx) => deposer(tx.boite, 'a', 'b'));
      const faux = publieurTest(() => false);
      await relayer(stock, faux.publieur, 9);
      await unite.executer(async (tx) => deposer(tx.boite, 'a'));
      expect(await stock.enAttente(9)).toHaveLength(0);
      expect(faux.recus).toEqual(['a', 'b']);
    });
  });
}
