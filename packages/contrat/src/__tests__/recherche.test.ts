import { describe, expect, it } from 'vitest';
import { genererOpenapi } from '../index.js';
import { creerServiceRecherche, construireIndex, type ReponseService } from '../domaines/recherche-service.js';
import { CorpsRecherche } from '../domaines/recherche.js';

const s = creerServiceRecherche();
const ok = (r: ReponseService) => {
  if ('erreur' in r) throw new Error(r.erreur);
  return r;
};

describe('recherche', () => {
  it('q-dans-le-corps-pas-dans-l-url', () => {
    const op = (genererOpenapi() as { paths: Record<string, Record<string, { parameters: { name: string }[]; requestBody: unknown }>> }).paths['/recherche']?.['post'];
    expect(op?.parameters.map((p) => p.name)).not.toContain('q');
    expect(op?.parameters).toEqual([]);
    expect(JSON.stringify(op?.requestBody)).toContain('"q"');
  });

  it('q-trop-court-400', () => {
    expect(s.chercher({ q: 'a' })).toEqual({ erreur: 'requete_invalide' });
    expect(s.chercher({ q: ' é ' })).toEqual({ erreur: 'requete_invalide' });
    expect(CorpsRecherche.safeParse({ q: 'a' }).success).toBe(false);
  });

  it('q-trop-long-400', () => {
    expect(s.chercher({ q: 'a'.repeat(201) })).toEqual({ erreur: 'requete_invalide' });
    expect(CorpsRecherche.safeParse({ q: 'a'.repeat(201) }).success).toBe(false);
    expect(CorpsRecherche.safeParse({ q: '😀'.repeat(200) }).success).toBe(true);
    expect(CorpsRecherche.safeParse({ q: '😀'.repeat(201) }).success).toBe(false);
  });

  it('champ-inconnu-400', () => {
    expect(CorpsRecherche.safeParse({ q: 'facture', extra: 1 }).success).toBe(false);
    for (const limite of [0, 21, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(CorpsRecherche.safeParse({ q: 'facture', limite }).success).toBe(false);
    }
    expect(CorpsRecherche.safeParse({ q: 'facture', types: ['chat'] }).success).toBe(false);
  });

  it('vide-200-rien-trouve', () => {
    expect(ok(s.chercher({ q: 'zzzzqqq' }))).toEqual({ resultats: [], mot: 'rien_trouve' });
  });

  it('script-echappe-dans-l-extrait', () => {
    const r = ok(s.chercher({ q: '<script>alert(1)</script>', types: ['piece'] }));
    expect(r.resultats.length).toBeGreaterThan(0);
    for (const x of r.resultats) expect(x.extrait).not.toMatch(/<(?!\/?mark>)/);
    expect(r.resultats[0]?.extrait).toContain('&lt;');
  });

  it('piece-sensible-exclue', () => {
    expect(ok(s.chercher({ q: 'Camille' })).resultats).toEqual([]);
    expect(ok(s.chercher({ q: 'bulletin-fictif' })).resultats.filter((x) => x.type === 'piece')).toEqual([]);
    expect(construireIndex().some((e) => e.id === 'pc-4')).toBe(false);
  });

  it('montant-trouve-exactement', () => {
    const e = construireIndex().find((x) => x.type === 'ecriture' && x.montants?.length);
    const cents = e?.montants?.[0] ?? 0;
    const texte = `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}`;
    const ids = ok(s.chercher({ q: texte, types: ['ecriture'] })).resultats.map((x) => x.id);
    expect(ids).toContain(e?.id);
    expect(ok(s.chercher({ q: '0,01', types: ['ecriture'] })).resultats).toEqual([]);
  });

  it('siren-trouve-le-tiers', () => {
    const r = ok(s.chercher({ q: '123 456 782', types: ['tiers'] }));
    expect(r.resultats.length).toBeGreaterThan(0);
    expect(r.resultats.every((x) => x.type === 'tiers')).toBe(true);
  });

  it('pagination-par-curseur', () => {
    const p1 = ok(s.chercher({ q: 'facture', limite: 2 }));
    expect(p1.resultats).toHaveLength(2);
    expect(p1.curseurSuivant).toBeDefined();
    const p2 = ok(s.chercher({ q: 'facture', limite: 2, curseur: p1.curseurSuivant }));
    expect(p2.resultats.map((x) => x.id)).not.toEqual(p1.resultats.map((x) => x.id));
    expect(s.chercher({ q: 'facture', curseur: 'pas-un-curseur' })).toEqual({ erreur: 'curseur_invalide' });
  });
});
