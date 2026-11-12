import { describe, expect, it } from 'vitest';
import { comparerLecteurs, type ComparaisonChamp } from '../comparaison.js';
import { lireAvecRegles } from '../lecteur-b.js';
import { PIECES_ERREURS, PIECES_SAINES, TAUX_PDB, TYPES_ERREUR, type PieceErreur } from './pieces-erreurs.js';

const convention = { decimal: ',', ordreDate: 'JMA' } as const;

function comparer(p: PieceErreur): ComparaisonChamp[] {
  const b = lireAvecRegles({ texte: p.texte, source: 'texte_pdf', convention, tauxConnusPdb: [TAUX_PDB] });
  return comparerLecteurs(p.champsA, b.champs, p.texte);
}
const signale = (c: ComparaisonChamp | undefined): boolean => c !== undefined && (c.accord !== 'accord' || c.douteux);
const detectee = (p: PieceErreur): boolean => signale(comparer(p).find((c) => c.nom === p.champ));

describe('banc d’erreurs semées', () => {
  it('banc-au-moins-98-pour-cent', () => {
    expect(PIECES_ERREURS.length).toBeGreaterThanOrEqual(100);
    const manquees = PIECES_ERREURS.filter((p) => !detectee(p)).map((p) => p.id);
    expect(1 - manquees.length / PIECES_ERREURS.length, `non détectées : ${manquees.join(', ')}`).toBeGreaterThanOrEqual(0.98);
  });

  it('chaque-type-d-erreur-represente', () => {
    for (const type of TYPES_ERREUR) {
      const lot = PIECES_ERREURS.filter((p) => p.erreur === type);
      expect(lot.length, type).toBeGreaterThanOrEqual(10);
      expect(lot.filter(detectee).length / lot.length, type).toBeGreaterThanOrEqual(0.9);
    }
    expect(new Set(PIECES_ERREURS.map((p) => p.id)).size).toBe(PIECES_ERREURS.length);
  });

  it('piece-sans-erreur-non-signalee', () => {
    expect(PIECES_SAINES.length).toBeGreaterThanOrEqual(10);
    for (const p of PIECES_SAINES) {
      const r = comparer(p);
      expect(r.length, p.id).toBe(p.champsA.length);
      expect(r.filter(signale), p.id).toEqual([]);
    }
  });
});
