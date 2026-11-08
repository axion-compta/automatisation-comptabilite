import { describe, expect, it } from 'vitest';
import { genererBanque } from '../../../donnees-fictives/src/banque.js';
import { creerServiceBanque } from '../domaines/banque-service.js';
import { QueryLignes, ReponseComptesBancaires, ReponseExplication, ReponseLignesBancaires } from '../domaines/banque.js';

const jeu = genererBanque();
const s = creerServiceBanque();
const tout = s.lignes()!;

describe('banque en mémoire', () => {
  it('comptes-avec-iban-masque', () => {
    const r = ReponseComptesBancaires.parse(s.comptes());
    expect(r.total).toBe(jeu.comptes.length);
    for (const c of r.body) {
      expect(c.ibanMasque).toMatch(/^[A-Z]{2}\*+\d{4}$/);
      expect(c.devise).toBe('EUR');
    }
    expect(r.body[0]!.soldeCentimes).toBe(jeu.releves.filter((x) => x.compteId === 'BQ1').at(-1)!.soldeCloture);
  });

  it('aucun-iban-complet-dans-les-reponses', () => {
    const texte = JSON.stringify([s.comptes(), tout, ...jeu.lignes.map((l) => s.explication(l.id))]);
    for (const c of jeu.comptes) expect(texte).not.toContain(c.ibanFaux);
    expect(texte).not.toMatch(/[A-Z]{2}\d{2}\d{10,}/);
  });

  it('lignes-filtre-etat', () => {
    ReponseLignesBancaires.parse(tout);
    const sans = s.lignes({ etat: 'SANS_PIECE' })!;
    expect(sans.total).toBe(Object.values(jeu.attendus).filter((a) => 'etat' in a && a.etat === 'SANS_PIECE').length);
    expect(sans.body.every((l) => l.etat === 'SANS_PIECE')).toBe(true);
    expect(s.lignes({ etat: 'IGNOREE' })!.total).toBe(0);
    expect(tout.body.map((l) => l.date)).toEqual(tout.body.map((l) => l.date).sort());
    const inverse = creerServiceBanque({ ...jeu, lignes: [...jeu.lignes].reverse() }).lignes()!;
    expect(inverse.body.map((l) => l.id)).toEqual(tout.body.map((l) => l.id));
    expect(s.lignes({ compte: 'BQ2' })!.total).toBe(0);
    expect(s.lignes({ compte: 'BQ9' })).toBeUndefined();
  });

  it('lignes-filtre-dates-inclusives', () => {
    const d = '2026-10-10';
    const jour = s.lignes({ du: d, au: d })!;
    expect(jour.total).toBeGreaterThan(0);
    expect(jour.body.every((l) => l.date === d)).toBe(true);
    expect(s.lignes({ du: '2026-10-11', au: '2026-10-10' })).toEqual({ body: [], decalage: 0, total: 0 });
    expect(s.lignes({ du: '2027-01-01' })!.total).toBe(0);
  });

  it('lignes-pagination', () => {
    const p = s.lignes({ limite: 5, decalage: 3 })!;
    expect(p.body.map((l) => l.id)).toEqual(tout.body.slice(3, 8).map((l) => l.id));
    expect(p).toMatchObject({ decalage: 3, total: tout.total });
    expect(s.lignes({ decalage: 10_000 })).toEqual({ body: [], decalage: 10_000, total: tout.total });
    for (const q of [{ limite: 0 }, { limite: 101 }, { limite: 1.5 }, { decalage: -1 }, { limite: 'NaN' }, { limite: 'Infinity' }, { decalage: 'Infinity' }, { decalage: 'abc' }, { etat: 'AUTRE' }, { compte: '' }, { du: '10/10/2026' }]) {
      expect(QueryLignes.safeParse(q).success).toBe(false);
    }
    expect(QueryLignes.safeParse({ limite: '100', decalage: '0' }).success).toBe(true);
  });

  it('explication-t05-1', () => {
    const e = ReponseExplication.parse(s.explication('L-001')).body;
    expect(e.codeMot).toBe('rattache');
    expect(e.etat).toBe('RAPPROCHEE');
    expect(e.facteurs.map((f) => f.points)).toEqual([45, 25, 20, 7, 3]);
    expect(e.score).toBe(100);
    expect(s.explication('L-129')!.body).toMatchObject({ codeMot: 'sans_piece', etat: 'SANS_PIECE', facteurs: [] });
  });

  it('ligne-inconnue-404', () => {
    expect(s.explication('L-999')).toBeUndefined();
    expect(s.explication('')).toBeUndefined();
  });
});
