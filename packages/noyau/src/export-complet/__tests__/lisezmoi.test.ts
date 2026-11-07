import { describe, expect, it } from 'vitest';
import { ErreurExploitation } from '../../exploitation/types.js';
import { exportComplet } from '../../../../textes/src/ecrans/export-complet.js';
import { lisezmoi } from '../lisezmoi.js';

const garde = (await import(new URL('../../../../../outils/gardes/textes.mjs', import.meta.url).href)) as {
  analyserMotsInterdits: (texte: string, nom: string) => string[];
};

function code(action: () => unknown): string | undefined {
  try {
    action();
  } catch (e) {
    return e instanceof ErreurExploitation ? e.code : 'autre';
  }
  return undefined;
}

const TOUS = [
  'LISEZMOI.txt',
  'comptable/balance.csv',
  'fec/fec-2026.txt',
  'pieces/index.csv',
  'conversations/conversations.txt',
  'parametrages/regles.jsonl',
];
const AVEC_DATE = { etat: 'date' as const, date: '2033-02-28', source: 'Source fictive' };
const modele: Record<string, string> = exportComplet;
const fabrique = (o: Partial<Parameters<typeof lisezmoi>[0]> = {}): string =>
  lisezmoi({ chemins: TOUS, conservation: AVEC_DATE, modele, ...o });

describe('lisezmoi export complet', () => {
  it('dossiers-presents-seulement', () => {
    const complet = fabrique().split('\r\n');
    for (const t of [exportComplet.dossierFec, exportComplet.dossierComptable, exportComplet.dossierPieces]) {
      expect(complet).toContain(t);
    }
    expect(complet).toContain(exportComplet.dossierConversations);
    expect(complet).toContain(exportComplet.dossierParametrages);
    const partiel = fabrique({ chemins: ['LISEZMOI.txt', 'fec/fec-2026.txt', 'pieces/2026/03/x.pdf'] }).split('\r\n');
    expect(partiel).toContain(exportComplet.dossierFec);
    expect(partiel).toContain(exportComplet.dossierPieces);
    for (const t of [exportComplet.dossierComptable, exportComplet.dossierConversations, exportComplet.dossierParametrages]) {
      expect(partiel).not.toContain(t);
    }
    expect(fabrique({ chemins: [] })).not.toContain(exportComplet.dossierFec);
  });

  it('conservation-avec-date-et-source', () => {
    const t = fabrique();
    expect(t).toContain(exportComplet.conservationDate.replace('{date}', '28/02/2033'));
    expect(t).toContain(exportComplet.conservationSource.replace('{source}', 'Source fictive'));
    expect(t).not.toContain(exportComplet.conservationAConfirmer);
    expect(t).not.toMatch(/[{}]/);
    expect(code(() => fabrique({ conservation: { ...AVEC_DATE, date: '2033-02-30' } }))).toBe('date_invalide');
    expect(code(() => fabrique({ conservation: { ...AVEC_DATE, date: '' } }))).toBe('date_invalide');
    for (const source of ['', '   ']) {
      expect(code(() => fabrique({ conservation: { ...AVEC_DATE, source } }))).toBe('champ_inconnu');
    }
  });

  it('conservation-a-confirmer-sans-annee', () => {
    const t = fabrique({ conservation: { etat: 'a_confirmer' } });
    expect(t).toContain(exportComplet.conservationAConfirmer);
    expect(t).not.toContain('{');
    expect(t).not.toMatch(/\d+\s*ans?(?![\p{L}])/iu);
    expect(t).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(exportComplet.conservationAConfirmer).not.toMatch(/\d/);
  });

  it('fin-de-ligne-crlf', () => {
    const t = fabrique();
    expect(t.endsWith('\r\n')).toBe(true);
    expect(t.endsWith('\r\n\r\n')).toBe(false);
    expect(t.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    expect(t.split('\r\n').length).toBeGreaterThan(5);
  });

  it('placeholder-oublie-refuse', () => {
    expect(code(() => fabrique({ modele: { ...modele, contact: 'Écrivez à {adresse}.' } }))).toBe('champ_inconnu');
    expect(code(() => fabrique({ modele: { ...modele, titre: '{date}' }, conservation: { etat: 'a_confirmer' } }))).toBe('champ_inconnu');
    expect(code(() => fabrique({ modele: { ...modele, conservationDate: 'Date : {jour}' } }))).toBe('champ_inconnu');
  });

  it('cle-de-modele-manquante-refusee', () => {
    for (const cle of Object.keys(modele)) {
      const { [cle]: _retire, ...reste } = modele;
      void _retire;
      expect(code(() => fabrique({ modele: reste })), cle).toBe('champ_inconnu');
    }
    expect(code(() => fabrique({ modele: { ...modele, contact: '' } }))).toBe('champ_inconnu');
  });

  it('aucun-mot-interdit', () => {
    for (const conservation of [AVEC_DATE, { etat: 'a_confirmer' as const }]) {
      expect(garde.analyserMotsInterdits(fabrique({ conservation }), 'LISEZMOI.txt')).toEqual([]);
    }
    expect(garde.analyserMotsInterdits(`${'con'}${'forme'}`, 'x')).not.toEqual([]);
  });
});
