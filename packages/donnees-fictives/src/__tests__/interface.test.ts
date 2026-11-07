import { describe, expect, it } from 'vitest';
import { sirenValide } from '../generateur.js';
import { genererInterface } from '../interface.js';

const pleine = () => genererInterface().profils.pleine;

describe('données fictives du lot 15', () => {
  it('meme-graine-meme-jeu', () => {
    expect(JSON.stringify(genererInterface(7))).toBe(JSON.stringify(genererInterface(7)));
    expect(JSON.stringify(genererInterface(7))).not.toBe(JSON.stringify(genererInterface(8)));
    expect(genererInterface().version).toBe(1);
  });

  it('toutes-les-regles-presentes', () => {
    const codes = new Set(pleine().alertes.map((a) => a.regle));
    for (let i = 1; i <= 11; i++) expect(codes.has(`ALR-${String(i).padStart(2, '0')}`)).toBe(true);
    expect(codes.size).toBe(11);
    expect(new Set(pleine().alertes.map((a) => a.entreeMenu)).size).toBeGreaterThanOrEqual(5);
    expect(pleine().alertes.every((a) => a.version >= 1 && a.cle.startsWith(a.regle))).toBe(true);
  });

  it('tous-les-etats-et-gravites', () => {
    const a = pleine().alertes;
    expect([...new Set(a.map((x) => x.etat))].sort()).toEqual(['ignoree', 'ouverte', 'reportee', 'resolue', 'resolue_auto']);
    expect([...new Set(a.map((x) => x.gravite))].sort()).toEqual(['a_faire', 'bloquant', 'info', 'urgent']);
    expect(a.filter((x) => x.gravite === 'urgent' || x.gravite === 'bloquant').length).toBeGreaterThanOrEqual(4);
  });

  it('echeance-sans-date-et-a-verifier', () => {
    const e = pleine().echeances;
    expect(e.some((x) => x.dateLimite === undefined)).toBe(true);
    const verif = e.find((x) => x.aVerifier);
    expect(verif?.sourceUrl).toMatch(/^https:\/\/exemple\.invalid\//);
    expect(e.some((x) => x.faite)).toBe(true);
  });

  it('textes-hostiles-presents', () => {
    const textes = pleine().pieces.map((p) => p.texteLu);
    expect(textes).toContain('<script>alert(1)</script>');
    expect(textes).toContain('=HYPERLINK("x")');
    expect(textes.some((t) => t.includes('1 234,50 €') && t.includes('123456782') && t.includes('Été'))).toBe(true);
    expect(pleine().pieces.some((p) => p.sensible)).toBe(true);
    expect(pleine().pieces.some((p) => !p.sensible)).toBe(true);
    const termes = pleine().termes;
    expect(termes.map((t) => t.validePar)).toEqual([0, 1, 2, 3]);
    expect(termes.every((t) => t.simple !== '' && t.comptable !== '' && t.survol !== '')).toBe(true);
    const n = pleine().notifications;
    expect(n.some((x) => x.lue) && n.some((x) => !x.lue)).toBe(true);
    const s = pleine().sousIndicateurs;
    expect(s).toHaveLength(5);
    expect(s.filter((x) => 'absent' in x)).toHaveLength(1);
    expect(pleine().regroupement).toHaveLength(3);
  });

  it('profil-vide-vraiment-vide', () => {
    const v = genererInterface().profils.vide;
    for (const k of ['sousIndicateurs', 'regroupement', 'alertes', 'echeances', 'pieces', 'termes', 'notifications'] as const) {
      expect(v[k]).toEqual([]);
    }
  });

  it('demonstration-marquee', () => {
    for (const p of Object.values(genererInterface().profils)) {
      expect(p.definitionsDemonstration.demonstration).toBe(true);
      expect(p.seuilsDemonstration.demonstration).toBe(true);
      expect(p.seuilsDemonstration.orangePourCent).toBeLessThanOrEqual(p.seuilsDemonstration.vertPourCent);
    }
    expect(pleine().jourDeReference).toBe('2026-10-15');
  });

  it('aucune-donnee-reelle', () => {
    const json = JSON.stringify(genererInterface());
    for (const m of json.matchAll(/[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+)/g)) expect(m[1]).toBe('exemple.fr');
    expect(json).not.toMatch(/[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,}/);
    for (const m of json.matchAll(/SIREN (\d{9})/g)) expect(sirenValide(m[1] as string)).toBe(true);
    for (const m of json.matchAll(/https?:\/\/[^"\s]+/g)) expect(m[0]).toMatch(/^https:\/\/exemple\.invalid\//);
  });
});
