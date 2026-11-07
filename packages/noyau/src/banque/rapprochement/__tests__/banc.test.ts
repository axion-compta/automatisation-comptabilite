import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../../argent/index.js';
import { genererBanque } from '../../../../../donnees-fictives/src/banque.js';
import type { LigneBancaire, Moyen, PieceCandidate } from '../../types.js';
import { rapprocherEnTroisOrdres } from '../ordres.js';
import type { Reglage } from '../passes.js';

const bareme = {
  version: 'banc-1', montantExact: 45, montantCentime: 43, contrepartieConnue: 25, contrepartieSimilaire: 15, referenceComplete: 20,
  referenceFin: 8, dateDansTolerance: 7, dateDouble: 3, sensEtMoyen: 3, regleApprise: 15, penalitePartielle: 10, penaliteEcartPeriode: 10,
  joursEcartPeriode: 60, plafond: 100, ecartAmbiguite: 5, plafondAmbigu: 79, seuils: { rapprochee: 95, proposee: 80, douteuse: 60 },
};
const tol = (n: number): Record<Moyen, number> => ({ carte: n, virement: n, prelevement: n, cheque: n, especes: n, frais: n, inconnu: n });
const reglage: Reglage = { bareme, toleranceJours: tol(5), maxAffectation: 20 };

function executer() {
  const jeu = genererBanque();
  const lignes: LigneBancaire[] = jeu.lignes.map(({ montantOrigine, ...l }) => ({
    ...l, montant: l.montant as Centimes, ...(montantOrigine === undefined ? {} : { montantOrigine: montantOrigine as Centimes }), certitudeContrepartie: 'connue',
    etatTechnique: 'completee', etatRapprochement: 'A_QUALIFIER',
  }));
  const pieces = jeu.pieces.map((p) => ({ ...p, montant: p.montant as Centimes, reste: p.montant as Centimes })) as unknown as (PieceCandidate & { reste: Centimes })[];
  const r = rapprocherEnTroisOrdres({ lignes, pieces }, reglage, [101, 202, 303]);
  const liensDe = (id: string): string[] => r.liens.filter((l) => l.ligneId === id).map((l) => l.pieceId ?? '').sort();
  return { jeu, r, liensDe };
}

describe('banc fictif de rapprochement', () => {
  it('banc-zero-faux-lien-rapprochee', () => {
    const { jeu, r, liensDe } = executer();
    const faux = Object.keys(r.etats).filter((id) => {
      if (r.etats[id] !== 'RAPPROCHEE') return false;
      const a = jeu.attendus[id];
      return a === undefined || !('pieceIds' in a) || JSON.stringify(liensDe(id)) !== JSON.stringify([...a.pieceIds].sort());
    });
    expect(faux).toEqual([]);
  });
  it('banc-rappel-calcule', () => {
    const { jeu, r, liensDe } = executer();
    const avecPiece = Object.entries(jeu.attendus).filter(([, a]) => 'pieceIds' in a) as [string, { pieceIds: string[] }][];
    const trouves = avecPiece.filter(([id, a]) => r.etats[id] === 'RAPPROCHEE' && JSON.stringify(liensDe(id)) === JSON.stringify([...a.pieceIds].sort()));
    const rappel = Math.round((trouves.length / avecPiece.length) * 1000) / 10;
    console.log(`RAPPEL_BANC ${trouves.length}/${avecPiece.length} = ${rappel} %`);
    expect(avecPiece.length).toBeGreaterThan(0);
    expect(trouves.length).toBeGreaterThan(0);
  });
});
