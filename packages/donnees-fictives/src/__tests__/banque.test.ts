import { describe, expect, it } from 'vitest';
import { genererBanque, serialiserBanque } from '../banque.js';

const jeu = genererBanque();
const etats = (e: string) => Object.values(jeu.attendus).filter((a) => 'etat' in a && a.etat === e);

describe('genererBanque', () => {
  it('cent-quarante-lignes', () => {
    expect(jeu.lignes).toHaveLength(140);
    expect(new Set(jeu.lignes.map((l) => l.id)).size).toBe(140);
    expect(jeu.lignes.every((l) => l.compteId === 'BQ1' && l.dateOperation.startsWith('2026-10-'))).toBe(true);
    expect(jeu.lignes.every((l) => Number.isSafeInteger(l.montant))).toBe(true);
    expect(jeu.comptes).toHaveLength(3);
    expect(jeu.societe.nom).toBe('Atelier Fictif SAS');
  });
  it('repartition-cent-vingt-huit-douze', () => {
    expect(Object.keys(jeu.attendus)).toHaveLength(140);
    expect(Object.values(jeu.attendus).filter((a) => 'pieceIds' in a)).toHaveLength(120);
    expect(etats('SANS_PIECE_REQUISE')).toHaveLength(8);
    expect(etats('SANS_PIECE')).toHaveLength(12);
  });
  it('cinq-contreparties-sans-piece', () => {
    const ids = jeu.lignes.filter((l) => jeu.attendus[l.id] && 'etat' in jeu.attendus[l.id]! && (jeu.attendus[l.id] as { etat: string }).etat === 'SANS_PIECE');
    expect(new Set(ids.map((l) => l.contrepartieId)).size).toBe(5);
    expect(ids.every((l) => l.contrepartieId !== undefined)).toBe(true);
  });
  it('graine-fixe-meme-jeu', () => {
    expect(serialiserBanque(genererBanque())).toBe(serialiserBanque(jeu));
    expect(serialiserBanque(genererBanque(42))).toBe(serialiserBanque(genererBanque(42)));
    expect(serialiserBanque(genererBanque(0))).toBe(serialiserBanque(genererBanque(0)));
    const cles = Object.keys(JSON.parse(serialiserBanque(jeu)) as object);
    expect(cles).toEqual([...cles].sort());
  });
  it('autre-graine-autre-jeu', () => {
    expect(serialiserBanque(genererBanque(7))).not.toBe(serialiserBanque(jeu));
    expect(genererBanque(7).lignes).toHaveLength(140);
    for (const g of [-1, Number.NaN, 1.5, Infinity]) expect(() => genererBanque(g)).toThrow(RangeError);
  });
  it('septembre-absent', () => {
    const r = jeu.releves.filter((x) => x.compteId === 'BQ1');
    expect(r).toHaveLength(9);
    expect(r.map((x) => x.periodeDebut)).not.toContain('2026-09-01');
    expect(r[0]!.periodeDebut).toBe('2026-01-01');
    expect(r.at(-1)!.periodeFin).toBe('2026-10-31');
    const somme = jeu.lignes.reduce((s, l) => s + l.montant, 0);
    expect(r.at(-1)!.soldeCloture - r.at(-1)!.soldeOuverture).toBe(somme);
  });
  it('ibans-tous-a-cle-fausse', () => {
    for (const c of jeu.comptes) {
      expect(c.ibanFaux).toMatch(/^FR\d{25}$/);
      const n = BigInt(c.ibanFaux.slice(4) + '1527' + c.ibanFaux.slice(2, 4)) % 97n;
      expect(n).not.toBe(1n);
      expect(c.ibanMasque).toContain('*');
      expect(c.ibanMasque).toHaveLength(c.ibanFaux.length);
    }
  });
  it('attendus-references-existantes', () => {
    const ids = new Set(jeu.pieces.map((p) => p.id));
    for (const a of Object.values(jeu.attendus)) if ('pieceIds' in a) for (const id of a.pieceIds) expect(ids.has(id)).toBe(true);
    const ligneIds = new Set(jeu.lignes.map((l) => l.id));
    expect(Object.keys(jeu.attendus).every((id) => ligneIds.has(id))).toBe(true);
    expect(jeu.explications).toHaveLength(10);
    expect(jeu.explications.every((e) => ligneIds.has(e.ligneId))).toBe(true);
  });
  it('cas-speciaux-de-construction', () => {
    const groupe = Object.values(jeu.attendus).filter((a) => 'pieceIds' in a && a.pieceIds.length === 3);
    expect(groupe).toHaveLength(1);
    expect(jeu.pieces.some((p) => p.devise === 'XXA')).toBe(true);
    const autre = jeu.pieces.filter((p) => p.societeId !== jeu.societe.id);
    expect(autre).toHaveLength(1);
    const cites = Object.values(jeu.attendus).flatMap((a) => ('pieceIds' in a ? a.pieceIds : []));
    expect(cites).not.toContain(autre[0]!.id);
    expect(new Set(cites).size).toBe(cites.length);
  });
});
