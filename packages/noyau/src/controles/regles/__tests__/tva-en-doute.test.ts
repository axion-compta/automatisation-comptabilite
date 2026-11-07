import { describe, expect, it } from 'vitest';
import { centimes } from '../../../argent/index.js';
import { ecarter } from '../../garde-fou.js';
import { executerControles, type TraceControle } from '../../moteur.js';
import type { ParametreLu } from '../commun.js';
import { motifsDoute, piecesEnDoute, regleCCT02, type PieceTva } from '../tva-en-doute.js';

const c = centimes;
const propre = (pieceId: string, tvaEnJeu = 1000): PieceTva => ({
  pieceId,
  lue: true,
  lisible: true,
  codes: ['DEDUCTIBLE'],
  parametresUtilises: [],
  casParticulier: false,
  quarantaine: false,
  destinataireAConfirmer: false,
  tvaEnJeu: c(tvaEnJeu),
});
const param = (statut: ParametreLu['statut']): ParametreLu => ({ cle: 'tva.exemple', valeur: statut === 'absent' ? null : '1', statut });
const entree = (pieces: readonly PieceTva[]) => ({ periode: '2026-10', pieces });
const evaluer = (pieces: readonly PieceTva[]) => regleCCT02.evaluer(entree(pieces));

describe('CC-T02 TVA en doute', () => {
  it('CT-18', () => {
    const garage: PieceTva = { ...propre('garage-fontaine', 8333), lisible: false };
    expect(motifsDoute(garage)).toEqual(['illisible']);
    expect(evaluer([garage])).toEqual({ resultat: 'ALERTE', valeur: 1, ecartCentimes: 8333 });
    expect(regleCCT02).toMatchObject({ id: 'CC-T02', version: 1, gravite: 'B', actif: true });
    expect(regleCCT02.bloque).toEqual(['tva']);
    expect(regleCCT02.declencheurs).toEqual(['arrivee', 'continu', 'nocturne', 'avant_tva', 'a_la_demande']);
    const traces = executerControles([regleCCT02], [{ type: 'periode', id: '2026-10', donnee: entree([garage]) }], 'avant_tva', 't');
    expect(traces[0]?.resultat).toBe('ALERTE');
  });

  it('CT-19', () => {
    const ticket: PieceTva = { ...propre('ticket-repas', 250), parametresUtilises: [param('a_verifier')] };
    expect(motifsDoute(ticket)).toEqual(['parametre_a_verifier']);
    expect(evaluer([ticket])).toEqual({ resultat: 'ALERTE', valeur: 1, ecartCentimes: 250 });
  });

  it('periode-sans-doute-ok', () => {
    const pieces = [propre('a'), { ...propre('b'), parametresUtilises: [param('valide')], codes: ['DEDUCTIBLE', 'SANS_TVA'] as const }];
    expect(motifsDoute(pieces[1] as PieceTva)).toEqual([]);
    expect(evaluer(pieces)).toEqual({ resultat: 'OK' });
  });

  it('un-seul-motif-suffit', () => {
    const cas: [PieceTva, string][] = [
      [{ ...propre('p'), lue: false }, 'non_lue'],
      [{ ...propre('p'), lisible: false }, 'illisible'],
      [{ ...propre('p'), codes: ['DEDUCTIBLE', 'A_VERIFIER'] }, 'a_verifier'],
      [{ ...propre('p'), parametresUtilises: [param('valide'), param('non_verifie')] }, 'parametre_a_verifier'],
      [{ ...propre('p'), casParticulier: true }, 'cas_particulier'],
      [{ ...propre('p'), quarantaine: true }, 'contenu_suspect'],
      [{ ...propre('p'), destinataireAConfirmer: true }, 'destinataire'],
    ];
    expect(cas).toHaveLength(7);
    for (const [p, motif] of cas) {
      expect(motifsDoute(p)).toEqual([motif]);
      expect(evaluer([propre('ok'), p]).resultat).toBe('ALERTE');
    }
    for (const statut of ['a_verifier', 'non_verifie', 'absent'] as const) {
      expect(motifsDoute({ ...propre('p'), parametresUtilises: [param(statut)] })).toEqual(['parametre_a_verifier']);
    }
  });

  it('plusieurs-motifs-tries', () => {
    const p: PieceTva = {
      ...propre('p'),
      lue: false,
      lisible: false,
      codes: ['A_VERIFIER'],
      parametresUtilises: [param('absent')],
      casParticulier: true,
      quarantaine: true,
      destinataireAConfirmer: true,
    };
    expect(motifsDoute(p)).toEqual(['a_verifier', 'cas_particulier', 'contenu_suspect', 'destinataire', 'illisible', 'non_lue', 'parametre_a_verifier']);
  });

  it('tva-en-jeu-additionnee', () => {
    const pieces = [{ ...propre('b', 700), lue: false }, propre('ignoree', 99999), { ...propre('a', 301), casParticulier: true }];
    const r = piecesEnDoute(pieces);
    expect(r).toEqual({
      nombre: 2,
      tvaEnJeu: 1001,
      pieces: [
        { pieceId: 'a', motifs: ['cas_particulier'] },
        { pieceId: 'b', motifs: ['non_lue'] },
      ],
    });
    expect(evaluer(pieces)).toEqual({ resultat: 'ALERTE', valeur: 2, ecartCentimes: 1001 });
    expect(evaluer([{ ...propre('z', 0), lue: false }])).toEqual({ resultat: 'ALERTE', valeur: 1, ecartCentimes: 0 });
  });

  it('periode-vide-ok', () => {
    expect(piecesEnDoute([])).toEqual({ nombre: 0, tvaEnJeu: 0, pieces: [] });
    expect(evaluer([])).toEqual({ resultat: 'OK' });
    for (const tva of [Number.NaN, Infinity, 1.5, -1]) {
      const p = { ...propre('p'), tvaEnJeu: tva as never };
      expect(() => piecesEnDoute([p])).toThrow(expect.objectContaining({ code: 'entree_invalide' }));
      expect(executerControles([regleCCT02], [{ type: 'periode', id: 'x', donnee: entree([p]) }], 'avant_tva', 't')[0]?.resultat).toBe('IMPOSSIBLE');
    }
  });

  it('ordre-inverse-meme-resultat', () => {
    const pieces = [{ ...propre('c', 5), lue: false }, { ...propre('a', 7), quarantaine: true }, propre('b'), { ...propre('d', 11), lisible: false }];
    const inverse = [...pieces].reverse();
    expect(piecesEnDoute(inverse)).toEqual(piecesEnDoute(pieces));
    expect(piecesEnDoute(pieces).pieces.map((x) => x.pieceId)).toEqual(['a', 'c', 'd']);
    expect(evaluer(inverse)).toEqual(evaluer(pieces));
  });

  it('jamais-ecartable', () => {
    const trace: TraceControle = {
      horodatage: '2026-11-01T10:00:00Z',
      declencheur: 'avant_tva',
      regleId: regleCCT02.id,
      versionRegle: 1,
      objetType: 'periode',
      objetId: '2026-10',
      resultat: 'ALERTE',
    };
    const options = { motif: 'essai', par: 'u1', horodatage: '2026-11-02T10:00:00Z', permissions: ['lever_bloquant'], reauthentifie: true };
    expect(ecarter(trace, options as never)).toEqual({ ok: false, code: 'non_ecartable' });
  });
});
