import { describe, expect, it } from 'vitest';
import { genererDeclarations } from '../../../../donnees-fictives/src/declarations.js';
import { ajouterVersion, type DocumentProduit, type NouveauDocument, type TypeDocument } from '../historique.js';

const TYPES: TypeDocument[] = ['fec', 'declaration_tva', 'declaration', 'etat', 'pv'];

describe('version de paquet sur tout document préparé', () => {
  it('jeu-fictif-tous-documents-versionnes', () => {
    const jeu = genererDeclarations();
    expect(jeu.declarations.length).toBeGreaterThan(0);
    expect(jeu.fec.length).toBeGreaterThan(0);
    for (const d of jeu.declarations) expect(Number.isInteger(d.versionPaquet) && d.versionPaquet > 0).toBe(true);
    const version = String(jeu.declarations[0]?.versionPaquet);
    let historique: DocumentProduit[] = [];
    const nouveaux: NouveauDocument[] = [
      ...jeu.fec.map((f) => ({ id: f.id, type: 'fec' as const, exerciceId: f.exerciceId, sha256: f.sha256, preparePar: f.preparePar, prepareLe: f.prepareLe, versionPaquet: version })),
      ...jeu.declarations.map((d) => ({ id: d.id, type: 'declaration_tva' as const, exerciceId: d.periodeId, sha256: 'b'.repeat(64), preparePar: 'Assistant fictif', prepareLe: '2026-01-15T09:00:00Z', versionPaquet: String(d.versionPaquet) })),
      ...TYPES.filter((t) => t !== 'fec' && t !== 'declaration_tva').map((t) => ({ id: `doc-${t}`, type: t, exerciceId: 'EX2026', sha256: 'c'.repeat(64), preparePar: 'Assistant fictif', prepareLe: '2026-01-15T09:00:00Z', versionPaquet: version })),
    ].map((d) => ({ ...d, statut: 'a_valider' as const, versionLogiciel: '0.0.0-test', resultatControles: 'ok' as const }));
    for (const n of nouveaux) historique = ajouterVersion(historique, n);
    expect(historique).toHaveLength(nouveaux.length);
    for (const d of historique) expect(d.versionPaquet).toMatch(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
    expect(new Set(historique.map((d) => d.type))).toEqual(new Set(TYPES));
    // la même chaîne sans version est refusée pour chaque type
    for (const t of TYPES) {
      const sans = { ...(nouveaux.find((n) => n.type === t) as NouveauDocument), id: 'sans', versionPaquet: '' };
      expect(() => ajouterVersion([], sans)).toThrow(/Version de paquet/);
    }
  });
});
