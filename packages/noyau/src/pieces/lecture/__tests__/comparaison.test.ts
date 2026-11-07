import { describe, expect, it } from 'vitest';
import { centimes } from '../../../argent/index.js';
import type { ChampLu } from '../../types.js';
import { citationRetrouvee, comparerLecteurs, normaliserEspaces, valeursEgales } from '../comparaison.js';

const champ = (nom: string, valeur: string, extra: Partial<ChampLu> = {}): ChampLu => ({ nom, valeur, source: 'texte_pdf', lecteur: 'A', citation: valeur, ...extra });
const ttc = (v: string, c: number, lecteur: 'A' | 'B' = 'A'): ChampLu => champ('ttc', v, { valeurCentimes: centimes(c), lecteur });
const TEXTE = 'Facture F-0101\nTotal TTC : 1 520,00 €\tMerci  Société Exemple';

describe('comparaison des lecteurs', () => {
  it('accord-sur-centimes', () => {
    const r = comparerLecteurs([ttc('1 520,00', 152000)], [ttc('1520.00 EUR', 152000, 'B')], TEXTE);
    expect(r).toEqual([{ nom: 'ttc', accord: 'accord', valeurA: '1 520,00', valeurB: '1520.00 EUR', citationRetrouvee: true, douteux: false }]);
    expect(valeursEgales(ttc('a', 5), ttc('b', 5))).toBe(true);
    expect(valeursEgales(ttc('a', 5), ttc('a', 6))).toBe(false);
    expect(valeursEgales(ttc('x', 0), ttc('x', 0))).toBe(true);
  });
  it('desaccord-ttc-douteux', () => {
    const a = [champ('fournisseur_adresse', '1 rue Exemple', { citation: 'Merci' }), ttc('1 520,00', 152000), champ('devise', 'EUR', { citation: 'TTC' })];
    const b = [champ('fournisseur_adresse', '1 rue Exemple', { lecteur: 'B' }), ttc('1 250,00', 125000, 'B'), champ('devise', 'eur', { lecteur: 'B' })];
    const r = comparerLecteurs(a, b, 'Merci TTC 1 520,00 TTC');
    expect(r.map((c) => [c.nom, c.accord, c.douteux])).toEqual([['devise', 'accord', false], ['fournisseur_adresse', 'accord', false], ['ttc', 'desaccord', true]]);
    const r2 = comparerLecteurs([ttc('1 520,00', 152000)], [ttc('1 250,00', 125000, 'B')], '1 520,00');
    expect(r2[0]).toMatchObject({ accord: 'desaccord', citationRetrouvee: true, douteux: true });
  });
  it('desaccord-non-critique-pas-douteux', () => {
    const r = comparerLecteurs([champ('devise', 'EUR')], [champ('devise', 'GBP', { lecteur: 'B' })], 'EUR');
    expect(r).toEqual([{ nom: 'devise', accord: 'desaccord', valeurA: 'EUR', valeurB: 'GBP', citationRetrouvee: true, douteux: false }]);
    const r2 = comparerLecteurs([champ('tva@2000', '5')], [champ('tva@2000', '6', { lecteur: 'B' })], '5');
    expect(r2[0]).toMatchObject({ accord: 'desaccord', douteux: true });
    for (const nom of ['numero', 'date_piece', 'fournisseur_nom']) expect(comparerLecteurs([champ(nom, 'a')], [champ(nom, 'b', { lecteur: 'B' })], 'a')[0]?.douteux).toBe(true);
  });
  it('seul-a-et-seul-b', () => {
    const r = comparerLecteurs([champ('numero', 'F-1'), champ('langue', 'fr')], [champ('devise', 'EUR', { lecteur: 'B' }), champ('langue', 'fr', { lecteur: 'B' })], 'F-1 fr');
    expect(r.map((c) => [c.nom, c.accord])).toEqual([['devise', 'seul_b'], ['langue', 'accord'], ['numero', 'seul_a']]);
    expect(r[0]).toEqual({ nom: 'devise', accord: 'seul_b', valeurB: 'EUR', citationRetrouvee: false, douteux: false });
    expect(r[2]).toEqual({ nom: 'numero', accord: 'seul_a', valeurA: 'F-1', citationRetrouvee: true, douteux: false });
    expect(comparerLecteurs([], [], TEXTE)).toEqual([]);
  });
  it('citation-retrouvee-malgre-espaces-insecables', () => {
    expect(citationRetrouvee('Total TTC : 1 520,00 €', TEXTE)).toBe(true);
    expect(citationRetrouvee('Facture   F-0101 Total', TEXTE)).toBe(true);
    expect(citationRetrouvee('  Merci Société  ', TEXTE)).toBe(true);
    expect(citationRetrouvee('total ttc', TEXTE)).toBe(false);
    expect(citationRetrouvee('1 520,00', '1 520,00')).toBe(true);
    expect(normaliserEspaces('  a \n\tb  c  ')).toBe('a b c');
    expect(comparerLecteurs([champ('ttc', 'x', { citation: 'Total TTC : 1 520,00 €' })], [], TEXTE)[0]?.douteux).toBe(false);
  });
  it('citation-introuvable-douteux', () => {
    const r = comparerLecteurs([champ('devise', 'EUR', { citation: 'inventée' })], [champ('devise', 'EUR', { lecteur: 'B' })], TEXTE);
    expect(r[0]).toMatchObject({ accord: 'accord', citationRetrouvee: false, douteux: true });
    const r2 = comparerLecteurs([{ nom: 'devise', valeur: 'EUR', source: 'texte_pdf', lecteur: 'A' }], [], TEXTE);
    expect(r2[0]).toMatchObject({ accord: 'seul_a', citationRetrouvee: false, douteux: true });
    expect(comparerLecteurs([], [champ('devise', 'EUR', { lecteur: 'B', citation: 'inventée' })], TEXTE)[0]?.douteux).toBe(false);
  });
  it('citation-vide-introuvable', () => {
    for (const c of ['', ' ', ' \n']) expect(citationRetrouvee(c, TEXTE)).toBe(false);
    expect(citationRetrouvee('', '')).toBe(false);
    expect(citationRetrouvee('a', '')).toBe(false);
    expect(comparerLecteurs([champ('devise', 'EUR', { citation: '' })], [], TEXTE)[0]).toMatchObject({ citationRetrouvee: false, douteux: true });
  });
  it('numero-normalise', () => {
    const egal = (x: string, y: string, nom = 'numero'): boolean => valeursEgales(champ(nom, x), champ(nom, y, { lecteur: 'B' }));
    expect(egal('F 0101', 'F-0101')).toBe(true);
    expect(egal('F/0101', 'f.0101')).toBe(true);
    expect(egal('F 0101', 'F0101')).toBe(true);
    expect(egal('F 0101', 'F-0102')).toBe(false);
    expect(egal('F 0101', 'F-0101', 'fournisseur_nom')).toBe(false);
    expect(egal('Éléphant  Bleu', 'elephant bleu', 'fournisseur_nom')).toBe(true);
    expect(egal('ＡＢＣ', 'abc', 'fournisseur_nom')).toBe(true);
    expect(egal('a', 'b', 'fournisseur_nom')).toBe(false);
    expect(valeursEgales(ttc('1', 5), champ('ttc', '1', { lecteur: 'B' }))).toBe(true);
    expect(valeursEgales(ttc('1', 5), champ('ttc', '2', { lecteur: 'B' }))).toBe(false);
  });
});
