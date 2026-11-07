import { describe, expect, it } from 'vitest';
import { centimes } from '../../../argent/index.js';
import type { ChampLu } from '../../types.js';
import { comparerXmlVisuel } from '../xml-visuel.js';

const ch = (nom: string, valeur: string, lecteur: 'xml' | 'A' = 'xml', cts?: number): ChampLu => ({ nom, valeur, source: lecteur === 'xml' ? 'xml' : 'texte_pdf', lecteur, ...(cts === undefined ? {} : { valeurCentimes: centimes(cts) }) });
const xml = [ch('ttc', '1 200,00', 'xml', 120000), ch('numero', 'F-2026/001'), ch('date_piece', '2026-03-01'), ch('fournisseur_siren', '123456789')];
const vis = [ch('ttc', '1200,00 EUR', 'A', 120000), ch('numero', 'F 2026.001', 'A'), ch('date_piece', '2026-03-01', 'A'), ch('fournisseur_siren', '123 456 789', 'A')];
const ctx = { sirenSociete: '987654321' };

describe('comparerXmlVisuel', () => {
  it('accord-complet', () => {
    expect(comparerXmlVisuel(xml, vis, ctx)).toEqual({ decision: 'accord', ecarts: [], valeursRetenues: xml });
    expect(comparerXmlVisuel(xml, vis, { ...ctx, sirenDestinataireXml: '987 654 321' }).decision).toBe('accord');
  });
  it('ttc-different-a-verifier', () => {
    const r = comparerXmlVisuel(xml, [ch('ttc', '1 260,00', 'A', 126000)], ctx);
    expect(r).toMatchObject({ decision: 'a_verifier', motif: 'xml_different_du_visuel', ecarts: [{ nom: 'ttc', valeurXml: '1 200,00', valeurVisuelle: '1 260,00' }] });
    expect(comparerXmlVisuel([ch('ttc', 'x', 'xml', 0)], [ch('ttc', 'x', 'A', 1)], ctx).decision).toBe('a_verifier');
    expect(comparerXmlVisuel([ch('ttc', '5,00')], [ch('ttc', '6,00', 'A')], ctx).decision).toBe('a_verifier');
    expect(comparerXmlVisuel([ch('ttc', '5,00')], [ch('ttc', '5,00', 'A')], ctx).decision).toBe('accord');
  });
  it('numero-normalise-sans-ecart', () => {
    expect(comparerXmlVisuel([ch('numero', 'ab-1/2.3 4')], [ch('numero', 'AB1234', 'A')], ctx).decision).toBe('accord');
    const r = comparerXmlVisuel([ch('numero', 'F-1')], [ch('numero', 'F-2', 'A')], ctx);
    expect(r.ecarts).toEqual([{ nom: 'numero', valeurXml: 'F-1', valeurVisuelle: 'F-2' }]);
  });
  it('champ-absent-du-visuel-ignore', () => {
    expect(comparerXmlVisuel(xml, [], ctx).decision).toBe('accord');
    expect(comparerXmlVisuel([], vis, ctx).decision).toBe('accord');
    expect(comparerXmlVisuel(xml, [ch('numero', '', 'A')], ctx).ecarts).toEqual([]);
    const r = comparerXmlVisuel(xml, [ch('date_piece', '2026-03-02', 'A'), ch('fournisseur_siren', '111111111', 'A')], ctx);
    expect(r.ecarts.map((e) => e.nom)).toEqual(['date_piece', 'fournisseur_siren']);
    expect(comparerXmlVisuel([], [ch('fournisseur_siren', '123456789', 'A')], { ...ctx, sirenEmetteurXml: '999999999' }).ecarts).toHaveLength(1);
  });
  it('destinataire-different-refus', () => {
    const r = comparerXmlVisuel(xml, [ch('ttc', '9,00', 'A', 900)], { ...ctx, sirenDestinataireXml: '111111111' });
    expect(r).toMatchObject({ decision: 'refus', motif: 'destinataire_different' });
    expect(comparerXmlVisuel(xml, vis, { ...ctx, sirenDestinataireXml: '' }).decision).toBe('accord');
    expect(comparerXmlVisuel(xml, vis, { sirenSociete: '' , sirenDestinataireXml: '123' }).decision).toBe('refus');
  });
  it('xml-fait-foi', () => {
    const diff = [ch('ttc', '1 260,00', 'A', 126000)];
    expect(comparerXmlVisuel(xml, diff, ctx).valeursRetenues).toEqual(xml);
    expect(comparerXmlVisuel(xml, diff, { ...ctx, sirenDestinataireXml: '1' }).valeursRetenues).toEqual(xml);
  });
  it('listes-vides-accord', () => {
    expect(comparerXmlVisuel([], [], ctx)).toEqual({ decision: 'accord', ecarts: [], valeursRetenues: [] });
    expect(comparerXmlVisuel([], [], { sirenSociete: '' })).toMatchObject({ decision: 'accord' });
  });
});
