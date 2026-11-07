import { describe, expect, it } from 'vitest';
import { analyserReleve } from '../../../noyau/src/banque/import/analyse.js';
import type { ContexteAnalyse, EntreeReleve } from '../../../noyau/src/banque/import/analyse.js';
import { fichiersDeReference } from '../banque-fichiers.js';
import type { FichierReference } from '../banque-fichiers.js';

const fichiers = fichiersDeReference();
const entree = (f: FichierReference): EntreeReleve =>
  f.format === 'pdf' ? { format: 'pdf', pages: f.pages! } : f.format === 'csv' ? { format: 'csv', texte: f.texte! } : { format: f.format, texte: f.texte! };
const contexte = (f: FichierReference): ContexteAnalyse => ({
  ...(f.profil ? { profil: f.profil } : {}), ...(f.reglesPdf ? { reglesPdf: f.reglesPdf } : {}),
  comptes: [{ id: 'C1', ferme: false }], compteChoisi: 'C1', taillesApercu: 10, limitesXml: { profondeurMax: 20, noeudsMax: 2000 },
});
const lire = (f: FichierReference) => analyserReleve(entree(f), contexte(f));

describe('banque-fichiers', () => {
  it('dix-fichiers', () => {
    expect(fichiers.map((f) => f.banque)).toEqual(Array.from({ length: 10 }, (_, i) => `Banque Exemple ${i + 1}`));
    const formats = fichiers.map((f) => f.format);
    const n = (x: string) => formats.filter((y) => y === x).length;
    expect([n('csv'), n('ofx1'), n('ofx2'), n('camt053'), n('pdf')]).toEqual([4, 2, 1, 2, 1]);
    expect(fichiers.filter((f) => f.format === 'csv' && f.texte!.includes('Total;')).length).toBe(1);
    expect(fichiers.some((f) => f.texte?.includes('<Sts>PDNG</Sts>'))).toBe(true);
    expect(fichiers.some((f) => (f.texte?.match(/<Stmt>/g) ?? []).length === 2)).toBe(true);
  });
  it('chaque-fichier-lu-sans-question', () => {
    for (const f of fichiers) {
      const r = lire(f);
      expect(r.questions, f.banque).toEqual([]);
      expect(r.etat, f.banque).toBe('apercu');
      expect(r.releves.every((x) => x.rattachement.type === 'compte')).toBe(true);
      expect(r.compteurs.rejetees, f.banque).toBe(0);
    }
  });
  it('nombre-de-lignes-attendu', () => {
    for (const f of fichiers) expect(lire(f).compteurs.importees, f.banque).toBe(f.attendu.lignes);
    const attente = fichiers.find((f) => f.texte?.includes('PDNG'))!;
    expect(lire(attente).releves[0]!.releve.lignes.filter((l) => l.etatTechnique === 'en_attente')).toHaveLength(1);
  });
  it('soldes-attendus', () => {
    for (const f of fichiers) {
      const [premier, ...autres] = lire(f).releves;
      expect(premier!.releve.soldeOuverture, f.banque).toBe(f.attendu.soldeOuverture);
      expect(premier!.releve.soldeCloture, f.banque).toBe(f.attendu.soldeCloture);
      for (const x of [premier!, ...autres]) expect(x.controle.controle, f.banque).toBe(f.attendu.controle);
    }
  });
  it('pdf-falsifie-refuse', () => {
    const f = fichiers.find((x) => x.format === 'pdf')!;
    const pages = f.pages!.map((p) => ({ ...p, lignes: p.lignes.map((l) => (l.startsWith('Solde final') ? 'Solde final 1,00' : l)) }));
    expect(pages).not.toEqual(f.pages);
    const r = analyserReleve({ format: 'pdf', pages }, contexte(f));
    expect([r.etat, r.motifRefus]).toEqual(['refuse', 'solde_pdf_faux']);
  });
  it('graine-fixe-memes-fichiers', () => {
    expect(JSON.stringify(fichiersDeReference())).toBe(JSON.stringify(fichiers));
    expect(JSON.stringify(fichiersDeReference(7))).not.toBe(JSON.stringify(fichiers));
    for (const g of [-1, Number.NaN, 1.5, Infinity]) expect(() => fichiersDeReference(g)).toThrow(RangeError);
  });
});
