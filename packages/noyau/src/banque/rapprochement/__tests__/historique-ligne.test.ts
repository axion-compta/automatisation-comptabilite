import { describe, expect, it } from 'vitest';
import { centimes } from '../../../argent/index.js';
import type { Lien } from '../../types.js';
import { ErreurHistorique, etatDuLien, historiqueLigne } from '../historique-ligne.js';
import type { EntreeHistorique } from '../historique-ligne.js';

const lien = (extra: Partial<Lien> = {}): Lien => ({
  id: 'k1', groupeId: 'g1', ligneId: 'l1', pieceId: 'p1', montantAffecte: centimes(1000), score: 90,
  facteurs: [], passe: 1, codeRaison: 'exact', proposePar: 'regle', etat: 'propose', version: 1, ...extra,
});
const entree = (action: EntreeHistorique['action'], etat: Lien['etat'], horodatage: string, extra: Partial<Lien> = {}): EntreeHistorique => ({
  action, apres: lien({ etat, ...extra }), horodatage,
});

describe('historique d’une ligne bancaire', () => {
  it('historique-ordonne', () => {
    const desordre = [
      entree('valider', 'valide', '2025-03-02T10:00:00Z'),
      entree('proposer', 'propose', '2025-03-01T10:00:00Z'),
    ];
    const h = historiqueLigne(desordre, 'l1');
    expect(h.map((e) => e.etat)).toEqual(['importee', 'proposee', 'rapprochee']);
    expect(h.map((e) => e.horodatage)).toEqual([undefined, '2025-03-01T10:00:00Z', '2025-03-02T10:00:00Z']);
    // Même horodatage : l'ordre d'arrivée est conservé.
    const egal = historiqueLigne([entree('proposer', 'propose', '2025-03-01T10:00:00Z'), entree('valider', 'valide', '2025-03-01T10:00:00Z')], 'l1');
    expect(egal.map((e) => e.etat)).toEqual(['importee', 'proposee', 'rapprochee']);
    // Aucune entrée : la ligne est seulement importée. Autre ligne ignorée.
    expect(historiqueLigne([], 'l1').map((e) => e.etat)).toEqual(['importee']);
    expect(historiqueLigne([entree('proposer', 'propose', '2025-03-01T10:00:00Z', { ligneId: 'l2' })], 'l1')).toHaveLength(1);
  });

  it('rapprochee-puis-defaite', () => {
    const h = historiqueLigne([
      entree('proposer', 'propose', '2025-03-01T10:00:00Z'),
      entree('valider', 'valide', '2025-03-02T10:00:00Z'),
      entree('defaire', 'defait', '2025-03-03T10:00:00Z'),
    ], 'l1');
    expect(h.map((e) => e.etat)).toEqual(['importee', 'proposee', 'rapprochee', 'defaite']);
    expect(h[3]).toMatchObject({ lienId: 'k1', horodatage: '2025-03-03T10:00:00Z' });
  });

  it('reconstitution-egale-etat-courant', () => {
    for (const [etat, attendu] of [['propose', 'proposee'], ['valide', 'rapprochee'], ['defait', 'defaite']] as const) {
      expect(etatDuLien(lien({ etat }))).toBe(attendu);
    }
    const journal = [
      entree('proposer', 'propose', '2025-03-01T10:00:00Z'),
      entree('valider', 'valide', '2025-03-02T10:00:00Z'),
      entree('defaire', 'defait', '2025-03-03T10:00:00Z'),
    ];
    const courant = lien({ etat: 'defait', version: 3 });
    expect(historiqueLigne(journal, 'l1').at(-1)?.etat).toBe(etatDuLien(courant));
    expect(historiqueLigne(journal.slice(0, 2), 'l1').at(-1)?.etat).not.toBe(etatDuLien(courant));
  });

  it('refuse un horodatage invalide', () => {
    expect(() => historiqueLigne([entree('proposer', 'propose', 'pas-une-date')], 'l1')).toThrow(ErreurHistorique);
  });
});
