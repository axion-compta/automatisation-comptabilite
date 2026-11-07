import { describe, expect, it } from 'vitest';
import { ErreurPiece, type Accord, type SourceChamp } from '../../types.js';
import { classementAutomatiquePermis, confianceInterne, confiancePiece, motDeConfiance, situation, type BaremeConfiance, type ChampMot, type EntreeConfiance, type SeuilsConfiance } from '../confiance.js';

// Barème et seuils inventés pour le test : valeurs toutes différentes pour repérer toute confusion.
const BAREME: BaremeConfiance = { xml: 99, accordTextePdf: 91, accordOcr: 82, aSeul: 73, visionSeule: 64, echec: 15 };
const SEUILS: SeuilsConfiance = { sur: 80, douteux: 40 };
const entree = (source: SourceChamp, accord: Accord, extra: Partial<EntreeConfiance> = {}): EntreeConfiance => ({ source, accord, citationRetrouvee: true, controlesPasses: true, ...extra });
const m = (nom: string, mot: ChampMot['mot']): ChampMot => ({ nom, mot });

describe('confiance interne', () => {
  it('xml-donne-bareme-xml', () => {
    expect(confianceInterne(entree('xml', 'seul_a'), BAREME)).toBe(99);
    expect(confianceInterne(entree('xml', 'accord'), BAREME)).toBe(99);
    expect(situation(entree('xml', 'seul_b'))).toBe('xml');
  });
  it('accord-pdf-et-ocr', () => {
    expect(confianceInterne(entree('texte_pdf', 'accord'), BAREME)).toBe(91);
    expect(confianceInterne(entree('ocr', 'accord'), BAREME)).toBe(82);
    expect(confianceInterne(entree('vision', 'accord'), BAREME)).toBe(91);
    expect(confianceInterne(entree('texte_pdf', 'seul_a'), BAREME)).toBe(73);
    expect(confianceInterne(entree('ocr', 'seul_b'), BAREME)).toBe(73);
    expect(confianceInterne(entree('texte_pdf', 'seul_b', { citationRetrouvee: false }), BAREME)).toBe(73);
    expect(confianceInterne(entree('vision', 'seul_b'), BAREME)).toBe(73);
  });
  it('desaccord-donne-echec', () => {
    expect(confianceInterne(entree('texte_pdf', 'desaccord'), BAREME)).toBe(15);
    expect(confianceInterne(entree('xml', 'desaccord'), BAREME)).toBe(15);
    expect(confianceInterne(entree('ocr', 'accord', { controlesPasses: false }), BAREME)).toBe(15);
    expect(confianceInterne(entree('xml', 'seul_a', { controlesPasses: false }), BAREME)).toBe(15);
    expect(situation(entree('vision', 'seul_b', { controlesPasses: false }))).toBe('echec');
  });
  it('citation-introuvable-donne-echec', () => {
    expect(confianceInterne(entree('texte_pdf', 'accord', { citationRetrouvee: false }), BAREME)).toBe(15);
    expect(confianceInterne(entree('xml', 'seul_a', { citationRetrouvee: false }), BAREME)).toBe(15);
    expect(situation(entree('vision', 'seul_a', { citationRetrouvee: false }))).toBe('echec');
    expect(situation(entree('vision', 'seul_a'))).toBe('aSeul');
  });
  it('mots-aux-bornes', () => {
    const cas: [number, string][] = [[100, 'sur'], [80, 'sur'], [79, 'a_verifier'], [41, 'a_verifier'], [40, 'a_verifier'], [39, 'douteux'], [0, 'douteux'], [Number.NaN, 'douteux'], [-5, 'douteux']];
    expect(cas.map(([v]) => motDeConfiance(v, SEUILS))).toEqual(cas.map(([, mot]) => mot));
    expect(motDeConfiance(Number.POSITIVE_INFINITY, SEUILS)).toBe('sur');
    expect(motDeConfiance(1, { sur: 1, douteux: 0 })).toBe('sur');
    expect(motDeConfiance(0, { sur: 1, douteux: 0 })).toBe('a_verifier');
  });
  it('piece-prend-le-plus-faible-critique', () => {
    expect(confiancePiece([m('ttc', 'sur'), m('numero', 'a_verifier'), m('date_piece', 'sur')])).toBe('a_verifier');
    expect(confiancePiece([m('numero', 'sur'), m('ttc', 'douteux'), m('date_piece', 'a_verifier')])).toBe('douteux');
    expect(confiancePiece([m('tva@2000', 'a_verifier'), m('ttc', 'sur')])).toBe('a_verifier');
    expect(confiancePiece([m('ttc', 'sur'), m('fournisseur_siren', 'sur')])).toBe('sur');
    expect(confiancePiece([m('ttc', 'a_verifier'), m('numero', 'douteux')])).toBe('douteux');
  });
  it('champ-non-critique-ignore-pour-la-piece', () => {
    expect(confiancePiece([m('ttc', 'sur'), m('devise', 'douteux'), m('langue', 'a_verifier')])).toBe('sur');
    expect(classementAutomatiquePermis([m('ttc', 'sur'), m('devise', 'douteux')])).toBe(true);
    expect(classementAutomatiquePermis([m('ttc', 'sur'), m('numero', 'a_verifier')])).toBe(false);
    expect(classementAutomatiquePermis([m('ttc', 'douteux')])).toBe(false);
  });
  it('aucun-critique-douteux', () => {
    expect(confiancePiece([])).toBe('douteux');
    expect(confiancePiece([m('devise', 'sur')])).toBe('douteux');
    expect(classementAutomatiquePermis([])).toBe(false);
    expect(classementAutomatiquePermis([m('devise', 'sur')])).toBe(false);
  });
  it('reglage-invalide-refuse', () => {
    const seuils = (sur: number, douteux: number): SeuilsConfiance => ({ sur, douteux });
    for (const s of [seuils(40, 80), seuils(80, 80), seuils(101, 40), seuils(80, -1), seuils(-1, -2), seuils(Number.NaN, 40), seuils(80, Number.NaN), seuils(80.5, 40), seuils(80, 1.5), seuils(Number.POSITIVE_INFINITY, 40)]) {
      expect(() => motDeConfiance(50, s)).toThrow(ErreurPiece);
      expect(() => motDeConfiance(50, s)).toThrow(expect.objectContaining({ code: 'reglage_invalide' }));
    }
    expect(motDeConfiance(100, seuils(100, 0))).toBe('sur');
    for (const v of [101, -1, Number.NaN, 1.5, Number.POSITIVE_INFINITY]) {
      for (const cle of Object.keys(BAREME) as (keyof BaremeConfiance)[]) {
        expect(() => confianceInterne(entree('xml', 'accord'), { ...BAREME, [cle]: v })).toThrow(expect.objectContaining({ code: 'reglage_invalide' }));
      }
    }
    expect(confianceInterne(entree('xml', 'accord'), { ...BAREME, xml: 100 })).toBe(100);
    expect(confianceInterne(entree('xml', 'accord'), { ...BAREME, xml: 0 })).toBe(0);
  });
});
