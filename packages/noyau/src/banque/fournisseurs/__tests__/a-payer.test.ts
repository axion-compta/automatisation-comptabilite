import { describe, expect, it } from 'vitest';
import { centimes } from '../../../argent/index.js';
import { listeAPayer, type DetteFournisseur } from '../a-payer.js';

const c = centimes;
const AUJ = '2026-03-02';
const meme = (a: string, b: string): boolean => a === b;
const connus = [
  { fournisseurId: 'F1', ibanHache: 'h1' },
  { fournisseurId: 'F2', ibanHache: 'h2' },
  { fournisseurId: 'F3', ibanHache: 'h3' },
];
function dette(o: Partial<DetteFournisseur> & { pieceId: string }): DetteFournisseur {
  return {
    fournisseurId: 'F1',
    echeance: '2026-03-05',
    reste: c(1000),
    ibanHache: 'h1',
    parPrelevement: false,
    rapprochee: false,
    dansLotGenere: false,
    ...o,
  };
}
const trois = [
  dette({ pieceId: 'A', reste: c(120000) }),
  dette({
    pieceId: 'B',
    fournisseurId: 'F2',
    reste: c(83040),
    ibanHache: 'autre',
  }),
  dette({
    pieceId: 'C',
    fournisseurId: 'F3',
    reste: c(200000),
    ibanHache: 'h3',
    echeance: '2026-03-03',
  }),
];
const liste = (d: DetteFournisseur[], h = 7, k = connus) => listeAPayer(d, k, AUJ, h, meme);
const motifs = (d: DetteFournisseur[]) => liste(d).exclues.map((e) => e.motif);

describe('listeAPayer', () => {
  it('t13-1-deux-factures-trois-mille-deux-cents', () => {
    const r = liste(trois);
    expect(r.lignes.map((l) => l.pieceId)).toEqual(['C', 'A']);
    expect(r.total).toBe(320000);
  });
  it('t13-1-alerte-iban', () => {
    const r = liste(trois);
    expect(r.alertesIban).toEqual([{ fournisseurId: 'F2', pieceId: 'B' }]);
    expect(r.exclues).toEqual([{ pieceId: 'B', motif: 'iban_change' }]);
  });
  it('prelevement-exclu', () => {
    expect(motifs([dette({ pieceId: 'P', parPrelevement: true })])).toEqual(['prelevement']);
  });
  it('deja-rapprochee-exclue', () => {
    expect(motifs([dette({ pieceId: 'P', rapprochee: true }), dette({ pieceId: 'Q', reste: c(0) })])).toEqual([
      'deja_payee',
      'deja_payee',
    ]);
  });
  it('dans-un-lot-exclue', () => {
    expect(motifs([dette({ pieceId: 'P', dansLotGenere: true })])).toEqual(['dans_un_lot']);
  });
  it('hors-horizon-exclue', () => {
    const d = [
      dette({ pieceId: 'P', echeance: '2026-03-10' }),
      dette({ pieceId: 'R', echeance: '2026-03-09' }),
      dette({ pieceId: 'V', echeance: '2026-01-01' }),
    ];
    expect(liste(d).lignes.map((l) => l.pieceId)).toEqual(['V', 'R']);
    expect(liste(d, 0).lignes.map((l) => l.pieceId)).toEqual(['V']);
  });
  it('escompte-en-tete', () => {
    const d = [
      dette({ pieceId: 'A', echeance: '2026-03-03' }),
      dette({
        pieceId: 'B',
        echeance: '2026-03-06',
        escompteJusquau: '2026-03-02',
      }),
      dette({
        pieceId: 'C',
        echeance: '2026-03-04',
        escompteJusquau: '2026-03-01',
      }),
    ];
    const r = liste(d);
    expect(r.lignes.map((l) => [l.pieceId, l.escompte])).toEqual([
      ['B', true],
      ['A', false],
      ['C', false],
    ]);
  });
  it('premiere-vue-sans-alerte', () => {
    const sans = dette({ pieceId: 'S' });
    delete sans.ibanHache;
    const d = [dette({ pieceId: 'N', fournisseurId: 'F9', ibanHache: 'x' }), sans];
    const r = liste(d);
    expect(r.alertesIban).toEqual([]);
    expect(r.premiereVue).toEqual([{ fournisseurId: 'F9', pieceId: 'N' }]);
    expect(r.lignes).toHaveLength(2);
  });
  it('tri-stable-et-cas-limites', () => {
    const r = liste([dette({ pieceId: 'Z' }), dette({ pieceId: 'Y' })]);
    expect(r.lignes.map((l) => l.pieceId)).toEqual(['Y', 'Z']);
    expect(liste([])).toMatchObject({ lignes: [], total: 0 });
  });
  it.each([Number.NaN, -1, 1.5, Infinity])('horizon invalide %s', (h) => {
    expect(() => liste([], h)).toThrow(expect.objectContaining({ code: 'horizon_invalide' }));
  });
  it.each([Number.NaN, -5, 1.5, Infinity])('reste invalide %s', (r) => {
    expect(() => liste([dette({ pieceId: 'P', reste: r as never })])).toThrow(
      expect.objectContaining({ code: 'reste_invalide' }),
    );
  });
});
