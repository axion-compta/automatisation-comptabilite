import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { empreinteSha256 } from '../../documents/empreinte.js';
import { validerJustifiee } from '../etats.js';
import {
  ajouterLien,
  ErreurLienPiece,
  exigerJustification,
  refuserModification,
  type LienPieceEcriture,
} from '../lien-piece.js';
import type { Ecriture } from '../modele.js';

const EMPREINTE_A = empreinteSha256('piece fictive A');
const EMPREINTE_B = empreinteSha256('piece fictive B');

function lien(pieceId: string, ecritureId: string, empreinte = EMPREINTE_A): LienPieceEcriture {
  return {
    pieceId,
    ecritureId,
    empreintePiece: empreinte,
    auteur: { type: 'ia', id: 'agent-fictif' },
    cree_le: '2026-02-01T10:00:00Z',
  };
}
function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurLienPiece) return e.code;
    throw e;
  }
  return undefined;
}
function ecriture(motif?: string): Ecriture {
  return {
    id: 'e1',
    journal: 'AC',
    date: '2026-01-15',
    statut: 'propose',
    lignes: [
      { compte: '607', libelle: 'Achat fictif', debit: centimes(1000), credit: centimes(0) },
      { compte: '401', libelle: 'Achat fictif', debit: centimes(0), credit: centimes(1000) },
    ],
    ...(motif === undefined ? {} : { motif }),
  };
}

describe('lien pièce-écriture', () => {
  it('deux-pieces-une-ecriture', () => {
    const liste = ajouterLien(ajouterLien([], lien('p1', 'e1')), lien('p2', 'e1', EMPREINTE_B));
    expect(liste).toHaveLength(2);
    expect(liste.filter((l) => l.ecritureId === 'e1')).toHaveLength(2);
  });

  it('une-piece-deux-ecritures', () => {
    const liste = ajouterLien(ajouterLien([], lien('p1', 'e1')), lien('p1', 'e2'));
    expect(liste.filter((l) => l.pieceId === 'p1')).toHaveLength(2);
  });

  it('doublon-exact-refuse', () => {
    const base = ajouterLien([], lien('p1', 'e1'));
    expect(code(() => ajouterLien(base, lien('p1', 'e1')))).toBe('lien_en_double');
    expect(code(() => ajouterLien(base, lien('p2', 'e1')))).toBeUndefined();
    expect(code(() => ajouterLien(base, lien('p1', 'e1', EMPREINTE_B)))).toBeUndefined();
    // entrée non modifiée
    expect(base).toHaveLength(1);
  });

  it('empreinte-invalide-refusee', () => {
    for (const mauvaise of ['', 'abc', EMPREINTE_A.toUpperCase(), EMPREINTE_A + '0', 'g'.repeat(64)]) {
      expect(code(() => ajouterLien([], lien('p1', 'e1', mauvaise)))).toBe('empreinte_invalide');
    }
  });

  it('modification-refusee-ajout-seul', () => {
    expect(code(() => refuserModification())).toBe('lien_ajout_seul');
  });

  it('sans-piece-ni-motif-validation-refusee', () => {
    const liens = [lien('p1', 'autre')];
    expect(code(() => exigerJustification('e1', liens, ''))).toBe('piece_ou_motif_requis');
    expect(code(() => exigerJustification('e1', liens, '   '))).toBe('piece_ou_motif_requis');
    expect(code(() => validerJustifiee(ecriture(), [], 'N1', 'u', '2026-02-01', ''))).toBe(
      'piece_ou_motif_requis',
    );
  });

  it('sans-piece-avec-motif-validation-acceptee', () => {
    const v = validerJustifiee(ecriture(), [], 'N1', 'u', '2026-02-01', 'Ticket perdu');
    expect(v.statut).toBe('valide');
    const avecPiece = validerJustifiee(ecriture(), [lien('p1', 'e1')], 'N2', 'u', '2026-02-01', '');
    expect(avecPiece.numero).toBe('N2');
  });
});
