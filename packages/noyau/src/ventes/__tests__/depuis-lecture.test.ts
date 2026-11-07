import { describe, expect, it } from 'vitest';
import { pieceDepuisLecture, type ContexteVente, type LectureVente, type LigneLue, type PropositionIA } from '../depuis-lecture.js';

const SOC = { siren: '987654324', tva: 'FR00987654324', nom: 'Atelier Marceau' };
const CTX: ContexteVente = {
  pieceId: 'p1',
  societe: SOC,
  comptesProduit: ['C-BIEN', 'C-SERV'],
  catalogue: [{ motCle: 'conseil', nature: 'service', compteProduit: 'C-SERV' }],
};
const ligne = (o: Partial<LigneLue> = {}): LigneLue => ({ libelle: 'Atelier', htCentimes: 1000, tauxPdb: 600, tvaLueCentimes: 60, ...o });
const lecture = (o: Partial<LectureVente> = {}): LectureVente => ({
  vendeur: { siren: '987 654 324' },
  clientId: 'cli1',
  origine: 'depot',
  numero: 'F-001',
  dateFacture: '2026-03-10',
  texteContientAvoir: false,
  texteContientAcompte: false,
  lignes: [ligne()],
  ...o,
});
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
};
const vente = (l: LectureVente, c = CTX) => {
  const r = pieceDepuisLecture(l, c);
  if (r.circuit !== 'ventes') throw new Error('attendu : ventes');
  return r;
};

describe('pièce de vente depuis la lecture', () => {
  it('vente-reconnue', () => {
    const r = vente(lecture({ dateOperation: '2026-03-09', echeance: '2026-04-10', lignes: [ligne({ libelle: 'Conseil mensuel' })] }));
    expect(r.piece).toEqual({
      id: 'p1', type: 'facture', origine: 'depot', clientId: 'cli1', numero: 'F-001', dateFacture: '2026-03-10',
      dateOperation: '2026-03-09', echeance: '2026-04-10', htCentimes: 1000, tvaCentimes: 60, ttcCentimes: 1060, statut: 'proposee',
    });
    expect(r.lignes).toEqual([
      { libelle: 'Conseil mensuel', htCentimes: 1000, tauxPdb: 600, tvaLueCentimes: 60, nature: 'service', compteProduit: 'C-SERV', codeTva: 'COLLECTEE' },
    ]);
    expect(r.aConfirmer).toEqual([]);
    const nu = vente(lecture({ clientId: undefined as unknown as string }));
    expect('clientId' in nu.piece).toBe(false);
    expect('dateOperation' in nu.piece || 'echeance' in nu.piece).toBe(false);
    expect(vente(lecture({ texteContientAvoir: true })).piece.type).toBe('avoir');
    expect(vente(lecture({ texteContientAcompte: true })).piece.type).toBe('facture_acompte');
  });

  it('achat-renvoye-au-circuit-achats', () => {
    expect(pieceDepuisLecture(lecture({ vendeur: { siren: '111111111', nom: 'Rivoire' } }), CTX)).toEqual({ circuit: 'achats' });
    expect(pieceDepuisLecture(lecture({ vendeur: {} }), CTX)).toEqual({ circuit: 'achats' });
    expect(pieceDepuisLecture(lecture({ vendeur: { nom: 'atelier  MARCEAU' } }), CTX)).toEqual({ circuit: 'a_verifier' });
  });

  it('proposition-hors-liste-a-confirmer', () => {
    const cas: PropositionIA[] = [
      { nature: 'bien', compteProduit: 'C-INCONNU' },
      { nature: 'cadeau', compteProduit: 'C-BIEN' },
      { nature: 'a_confirmer', compteProduit: 'C-BIEN' },
      { nature: 'bien' },
      { compteProduit: 'C-BIEN' },
      { nature: 'bien', compteProduit: 7 },
      {},
    ];
    for (const proposition of cas) {
      const r = vente(lecture({ lignes: [ligne({ libelle: 'zzz', proposition })] }));
      expect(r.lignes[0]).toMatchObject({ nature: 'a_confirmer' });
      expect('compteProduit' in r.lignes[0]!).toBe(false);
      expect(r.piece.statut).toBe('a_verifier');
      expect(r.aConfirmer).toEqual(['ligne 1']);
    }
    const bonne = vente(lecture({ lignes: [ligne({ proposition: { nature: 'bien', compteProduit: 'C-BIEN' } })] }));
    expect(bonne.lignes[0]).toMatchObject({ nature: 'bien', compteProduit: 'C-BIEN' });
    expect(bonne.piece.statut).toBe('proposee');
    const accord = vente(lecture({ lignes: [ligne({ libelle: 'Conseil', proposition: { nature: 'service', compteProduit: 'C-BIEN' } })] }));
    expect(accord.lignes[0]).toMatchObject({ nature: 'service', compteProduit: 'C-SERV' });
    const desaccord = vente(lecture({ lignes: [ligne({ libelle: 'Conseil', proposition: { nature: 'bien', compteProduit: 'C-BIEN' } })] }));
    expect(desaccord.lignes[0]).toMatchObject({ nature: 'a_confirmer' });
    const habitude = vente(lecture({ lignes: [ligne({ libelle: 'x' })] }), { ...CTX, habitude: { nature: 'bien', compteProduit: 'C-BIEN' } });
    expect(habitude.lignes[0]).toMatchObject({ nature: 'bien', compteProduit: 'C-BIEN' });
    const sans = vente(lecture({ lignes: [ligne({ libelle: 'zzz' })] }));
    expect(sans.lignes[0]).toMatchObject({ nature: 'a_confirmer' });
  });

  it('montants-jamais-calcules-par-l-ia', () => {
    const l = lecture({ lignes: [ligne({ htCentimes: 1000, tvaLueCentimes: 60 }), ligne({ htCentimes: 250, tauxPdb: 900, tvaLueCentimes: 23 })] });
    const piegee = { ...l, htCentimes: 9, tvaCentimes: 9, ttcCentimes: 9 } as LectureVente;
    const r = vente(piegee);
    expect([r.piece.htCentimes, r.piece.tvaCentimes, r.piece.ttcCentimes]).toEqual([1250, 83, 1333]);
    expect(vente(lecture({ lignes: [ligne({ htCentimes: -500, tvaLueCentimes: -30 })] })).piece).toMatchObject({ type: 'avoir', ttcCentimes: -530, statut: 'a_verifier' });
    expect(vente(lecture({ lignes: [ligne({ tauxPdb: null, tvaLueCentimes: 0 })] })).lignes[0]!.codeTva).toBe('A_VERIFIER');
    expect(vente(lecture({ lignes: [ligne({ tauxPdb: 600, tvaLueCentimes: 0 })] })).lignes[0]!.codeTva).toBe('A_VERIFIER');
    expect(vente(lecture({ lignes: [ligne({ tauxPdb: null, tvaLueCentimes: 5 })] })).lignes[0]!.codeTva).toBe('A_VERIFIER');
    const negatif = vente(lecture({ lignes: [ligne({ htCentimes: -500, tvaLueCentimes: -30, proposition: { nature: 'bien', compteProduit: 'C-BIEN' } })] }));
    expect(negatif.aConfirmer).toEqual(['type']);
    expect(negatif.piece.statut).toBe('a_verifier');
    const copie = structuredClone(l);
    vente(l);
    expect(l).toEqual(copie);
  });

  it('entrees-invalides-refusees', () => {
    for (const m of [Number.NaN, Infinity, -Infinity, 1.5]) {
      expect(code(() => pieceDepuisLecture(lecture({ lignes: [ligne({ htCentimes: m })] }), CTX))).toBe('montant_invalide');
      expect(code(() => pieceDepuisLecture(lecture({ lignes: [ligne({ tvaLueCentimes: m })] }), CTX))).toBe('montant_invalide');
    }
    for (const t of [Number.NaN, Infinity, 0.5, -600]) {
      expect(code(() => pieceDepuisLecture(lecture({ lignes: [ligne({ tauxPdb: t })] }), CTX))).toBe('taux_invalide');
    }
    expect(code(() => pieceDepuisLecture(lecture({ lignes: [] }), CTX))).toBe('lignes_absentes');
    expect(code(() => pieceDepuisLecture(lecture({ lignes: undefined as unknown as LigneLue[] }), CTX))).toBe('lignes_absentes');
    expect(code(() => pieceDepuisLecture(lecture({ origine: 'web' as never }), CTX))).toBe('origine_invalide');
    expect(code(() => pieceDepuisLecture(lecture({ numero: '  ' }), CTX))).toBe('numero_invalide');
    expect(code(() => pieceDepuisLecture(lecture({ lignes: [ligne({ libelle: '' })] }), CTX))).toBe('libelle_invalide');
    expect(code(() => pieceDepuisLecture(lecture(), { ...CTX, pieceId: '' }))).toBe('id_invalide');
    for (const champ of ['dateFacture', 'dateOperation', 'echeance'] as const) {
      expect(code(() => pieceDepuisLecture(lecture({ [champ]: '2026-02-30' }), CTX))).toBe('date_invalide');
    }
  });
});
