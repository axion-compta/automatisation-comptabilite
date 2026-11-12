import { unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { empreinteSha256 } from '../../documents/empreinte.js';
import { construireInventaire, ErreurInventaire, reclasserLigne, validerInventaire } from '../inventaire.js';
import { classerDocument } from '../types-document.js';

// Noms, contenus et dates INVENTÉS pour les tests.
const EXERCICES = [
  { id: 'ex-2024', debut: '2024-01-01', fin: '2024-12-31' },
  { id: 'ex-2025', debut: '2025-01-01', fin: '2025-12-31' },
];
const encode = (t: string) => new TextEncoder().encode(t);

function zipDe200() {
  const entrees: Record<string, Uint8Array> = {};
  for (let i = 0; i < 200; i += 1) entrees[`pieces/doc-${String(i).padStart(3, '0')}.pdf`] = encode(`contenu ${i}`);
  const enfants = unzipSync(zipSync(entrees));
  return Object.entries(enfants).map(([nom, octets]) => ({ nom, octets }));
}

describe('inventaire de reprise', () => {
  it('zip-200-fichiers-inventorie', () => {
    const inv = construireInventaire(zipDe200(), EXERCICES);
    expect(inv.lignes).toHaveLength(200);
    expect(new Set(inv.lignes.map((l) => l.nom)).size).toBe(200);
    expect(inv.validation).toBeNull();
  });

  it('empreinte-par-fichier', () => {
    const inv = construireInventaire(zipDe200(), EXERCICES);
    const l = inv.lignes.find((x) => x.nom === 'pieces/doc-007.pdf');
    expect(l?.empreinte).toBe(empreinteSha256(encode('contenu 7')));
    expect(l?.empreinte).toMatch(/^[0-9a-f]{64}$/);
  });

  it('doublon-par-empreinte', () => {
    const inv = construireInventaire(
      [
        { nom: 'a.pdf', octets: encode('x') },
        { nom: 'b.pdf', octets: encode('y') },
        { nom: 'copie-de-a.pdf', octets: encode('x') },
        { nom: 'autre-copie.pdf', octets: encode('x') },
      ],
      EXERCICES,
    );
    expect(inv.lignes.map((l) => l.doublonDe)).toEqual([null, null, 'a.pdf', 'a.pdf']);
  });

  it('rattachement-exercice-par-date', () => {
    const f = (nom: string, date?: string) => ({ nom, octets: encode(nom), ...(date ? { date } : {}) });
    const inv = construireInventaire(
      [
        f('balance-2024-12-31.csv'),
        f('grand-livre-20250101.csv'),
        f('releve-2025-12-31.pdf'),
        f('bilan-2026-01-01.pdf'),
        f('sans-date.pdf'),
        f('releve-2024-06-30.pdf', '2025-03-15'),
        f('date-impossible-2025-02-30.pdf'),
        f('x.pdf', 'pas-une-date'),
        f('123456789FEC20251231.txt'),
        f('piece-12345678-2024-03-31.pdf'),
      ],
      EXERCICES,
    );
    expect(inv.lignes.map((l) => l.exercice)).toEqual([
      'ex-2024', 'ex-2025', 'ex-2025', null, null, 'ex-2025', null, null, 'ex-2025', 'ex-2024',
    ]);
  });

  it('type-inconnu-a-classer', () => {
    expect(classerDocument('FEC_2025.txt', 'text/plain')).toBe('fec');
    expect(classerDocument('Balance générale 2025.xlsx', 'application/octet-stream')).toBe('balance');
    expect(classerDocument('grand-livre.csv', 'text/csv')).toBe('grand_livre');
    expect(classerDocument('Bilan.pdf', 'application/pdf')).toBe('bilan');
    expect(classerDocument('compte-de-resultat.pdf', 'application/pdf')).toBe('compte_de_resultat');
    expect(classerDocument('liasse-fiscale.pdf', 'application/pdf')).toBe('liasse');
    expect(classerDocument('Relevé janvier.pdf', 'application/pdf')).toBe('releve');
    expect(classerDocument('statuts-signes.pdf', 'application/pdf')).toBe('statuts');
    expect(classerDocument('photo-vacances.jpg', 'image/jpeg')).toBe('a_classer');
    expect(classerDocument('', '')).toBe('a_classer');
    const inv = construireInventaire([{ nom: 'mystere.bin', octets: encode('?') }], EXERCICES);
    expect(inv.lignes[0]?.type).toBe('a_classer');
    const reclasse = reclasserLigne(inv, 'mystere.bin', 'autre');
    expect(reclasse.lignes[0]?.type).toBe('autre');
    expect(() => reclasserLigne(inv, 'absent.bin', 'autre')).toThrow(ErreurInventaire);
    expect(() => reclasserLigne(inv, 'mystere.bin', 'inventé' as never)).toThrow(ErreurInventaire);
  });

  it('validation-inventaire-par-une-personne', () => {
    const inv = construireInventaire([{ nom: 'a.pdf', octets: encode('x') }], EXERCICES);
    const v = validerInventaire(inv, 'p-lea', '2026-11-12T10:00:00Z');
    expect(v.validation).toEqual({ par: 'p-lea', le: '2026-11-12T10:00:00Z' });
    expect(inv.validation).toBeNull();
    for (const [p, h] of [['', '2026-11-12T10:00:00Z'], ['  ', '2026-11-12T10:00:00Z'], ['p-lea', ''], ['p-lea', 'hier'], ['p-lea', '2026-11-12']] as const) {
      expect(() => validerInventaire(inv, p, h)).toThrow(ErreurInventaire);
    }
  });

  it('inventaire-valide-fige', () => {
    const inv = construireInventaire([{ nom: 'a.pdf', octets: encode('x') }], EXERCICES);
    const v = validerInventaire(inv, 'p-lea', '2026-11-12T10:00:00Z');
    expect(() => reclasserLigne(v, 'a.pdf', 'autre')).toThrow(/inventaire_valide/);
    expect(() => validerInventaire(v, 'p-max', '2026-11-13T10:00:00Z')).toThrow(/inventaire_valide/);
    expect(() => {
      (v.lignes as unknown as unknown[]).push({});
    }).toThrow();
    expect(() => {
      (v.lignes[0] as { type: string }).type = 'bilan';
    }).toThrow();
    expect(v.validation?.par).toBe('p-lea');
  });
});
