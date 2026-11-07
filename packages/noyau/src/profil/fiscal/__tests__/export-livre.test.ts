import { describe, expect, it } from 'vitest';
import { centimes } from '../../../argent/index.js';
import { ErreurProfil } from '../../types.js';
import { exporterLivreCsv, exporterRegistreAchatsCsv, exportPermis } from '../export-livre.js';
import type { LigneAchat, LigneRecette } from '../livre-recettes.js';

const SEP = ';';
const COLS = ['Date', 'Client', 'Montant', 'Mode', 'Reference'];
const rec = (o: Partial<LigneRecette> = {}): LigneRecette => ({
  id: 'r1',
  dateEncaissement: '2026-02-10',
  client: 'Atelier Fictif',
  montantCentimes: centimes(123456),
  modeReglement: 'virement',
  referenceFacture: 'F-1',
  ...o,
});
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurProfil ? e.code : 'autre';
  }
  return undefined;
};
const lignesDe = (s: string): string[] => s.split('\r\n');
const exporter = (l: LigneRecette[]): string => exporterLivreCsv(l, { separateur: SEP, colonnes: COLS });

describe('export du livre en CSV', () => {
  it('en-tete-et-ordre', () => {
    const csv = exporter([rec({ id: 'b', dateEncaissement: '2026-03-01' }), rec({ id: 'z' }), rec({ id: 'a' })]);
    const l = lignesDe(csv);
    expect(l[0]).toBe('Date;Client;Montant;Mode;Reference');
    expect(l).toHaveLength(4);
    expect(l.map((x) => x.slice(0, 10))).toEqual(['Date;Clien', '2026-02-10', '2026-02-10', '2026-03-01']);
    expect(csv.endsWith('\r\n')).toBe(false);
  });

  it('montant-au-format', () => {
    expect(lignesDe(exporter([rec()]))[1]).toBe('2026-02-10;Atelier Fictif;1234,56;virement;F-1');
    expect(lignesDe(exporter([rec({ montantCentimes: centimes(5) })]))[1]).toContain(';0,05;');
  });

  it('separateur-dans-un-champ', () => {
    expect(lignesDe(exporter([rec({ client: 'Dupont;Fils' })]))[1]).toContain(';"Dupont;Fils";');
    const virgule = exporterLivreCsv([rec({ client: 'a;b' })], { separateur: ',', colonnes: COLS });
    expect(lignesDe(virgule)[1]).toBe('2026-02-10,a;b,"1234,56",virement,F-1');
  });

  it('guillemet-double', () => {
    expect(lignesDe(exporter([rec({ client: 'Le "Bon" Coin' })]))[1]).toContain(';"Le ""Bon"" Coin";');
  });

  it('retour-a-la-ligne-dans-un-champ', () => {
    const csv = exporter([rec({ client: 'a\nb' }), rec({ id: 'r2', client: 'c\r\nd' })]);
    expect(csv).toContain('"a\nb"');
    expect(csv).toContain('"c\r\nd"');
  });

  it('injection-de-formule-neutralisee', () => {
    for (const f of ['=SOMME(A1)', '+1', '-1', '@x']) {
      const l = lignesDe(exporter([rec({ client: f })]))[1] as string;
      expect(l).toContain(";'" + f + ';');
    }
    expect(lignesDe(exporter([rec({ client: '=A;B' })]))[1]).toContain(`;"'=A;B";`);
  });

  it('livre-vide-en-tete-seul', () => {
    expect(exporter([])).toBe('Date;Client;Montant;Mode;Reference');
  });

  it('partie-double-refusee', () => {
    expect(code(() => exportPermis('partie_double'))).toBe('export_livre_non_applicable');
    expect(() => exportPermis('livre_recettes')).not.toThrow();
    expect(exportPermis('livre_recettes')).toBe('livre');
  });
});

describe('export CSV : registre des achats et entrées invalides', () => {
  const achat: LigneAchat = {
    id: 'a1',
    date: '2026-01-05',
    fournisseur: '=Fourni',
    montantCentimes: centimes(990),
    modeReglement: 'carte',
    referencePiece: 'P-9',
  };
  it('achats : même règle', () => {
    const csv = exporterRegistreAchatsCsv([achat], { separateur: SEP, colonnes: COLS });
    expect(lignesDe(csv)[1]).toBe("2026-01-05;'=Fourni;9,90;carte;P-9");
    expect(exporterRegistreAchatsCsv([], { separateur: SEP, colonnes: COLS })).toBe(COLS.join(SEP));
  });
  it('entrées invalides refusées', () => {
    expect(code(() => exporter([rec({ montantCentimes: NaN as never })]))).toBe('ligne_invalide');
    expect(code(() => exporterRegistreAchatsCsv([{ ...achat, date: 'x' }], { separateur: SEP, colonnes: COLS }))).toBe('ligne_invalide');
    for (const separateur of ['', '"', '\n', ';;']) {
      expect(code(() => exporterLivreCsv([], { separateur, colonnes: COLS }))).toBe('separateur_invalide');
    }
    expect(code(() => exporterLivreCsv([], { separateur: SEP, colonnes: ['a'] }))).toBe('colonnes_invalides');
  });
});
