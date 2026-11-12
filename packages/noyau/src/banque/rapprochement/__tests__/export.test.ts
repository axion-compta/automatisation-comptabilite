import { describe, expect, it } from 'vitest';
import { centimes } from '../../../argent/index.js';
import type { LigneBancaire } from '../../types.js';
import { exporterRapprochement } from '../export.js';
import type { LigneExport } from '../export.js';

const ligne = (i: number, extra: Partial<LigneBancaire> = {}): LigneBancaire => ({
  id: `l${i}`, societeId: 's1', compteId: 'c1', releveId: 'r1', rang: i, dateOperation: '2025-03-04', montant: centimes(-123456),
  devise: 'EUR', libelleBrut: `Fournisseur fictif ${i}`, moyen: 'virement', etatTechnique: 'completee', etatRapprochement: 'RAPPROCHEE', ...extra,
});
const BOM = String.fromCodePoint(0xfeff);
const corps = (csv: string): string[] => csv.slice(BOM.length).split('\r\n').filter((l) => l !== '');

describe('export du rapprochement', () => {
  it('export-une-ligne-par-ligne-bancaire', () => {
    const lignes: LigneExport[] = [{ ligne: ligne(1), pieceId: 'p1' }, { ligne: ligne(2, { etatRapprochement: 'SANS_PIECE' }) }, { ligne: ligne(3) }];
    const l = corps(exporterRapprochement(lignes, 's1'));
    expect(l).toHaveLength(4); // en-tête + 3
    expect(l[0]).toBe('"Date";"Libellé";"Montant";"État";"Pièce liée"');
    expect(l[1]).toBe('04/03/2025;"Fournisseur fictif 1";-1234,56;"RAPPROCHEE";"p1"');
    expect(l[2]).toBe('04/03/2025;"Fournisseur fictif 2";-1234,56;"SANS_PIECE";""');
    expect(corps(exporterRapprochement([], 's1'))).toHaveLength(1);
  });

  it('separateur-et-decimale', () => {
    const csv = exporterRapprochement([{ ligne: ligne(1, { montant: centimes(5), libelleBrut: 'a;b "c"' }) }], 's1');
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(corps(csv)[1]).toBe('04/03/2025;"a;b ""c""";0,05;"RAPPROCHEE";""');
    expect(corps(exporterRapprochement([{ ligne: ligne(1, { montant: centimes(100000) }) }], 's1'))[1]).toContain(';1000,00;');
  });

  it('aucune-donnee-hors-societe', () => {
    const csv = exporterRapprochement([{ ligne: ligne(1) }, { ligne: ligne(2, { societeId: 's2', libelleBrut: 'Autre société' }) }], 's1');
    expect(csv).not.toContain('Autre société');
    expect(corps(csv)).toHaveLength(2);
  });

  it('neutralise les formules du libellé', () => {
    expect(corps(exporterRapprochement([{ ligne: ligne(1, { libelleBrut: '=1+1' }) }], 's1'))[1]).toContain('"\'=1+1"');
  });
});
