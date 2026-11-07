import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { genererFrais, serialiserFrais, type JeuFrais } from '../frais.js';

const EMPREINTE = '6b7c03fb3222f2f2e6f132634bccd3d591c4de928eb246f8548b53ead7858d9e';
const sha = (j: JeuFrais): string => createHash('sha256').update(serialiserFrais(j)).digest('hex');
const STATUTS = ['brouillon', 'a_completer', 'propose', 'valide', 'rembourse', 'en_compte_courant', 'exclu_paye_societe', 'refuse', 'perso'];
// Taux et parties fixes du barème réel : aucun ne doit apparaître dans le jeu.
const TAUX_REELS = ['0,529', '0,316', '0,370', '0,606', '0,340', '0,407', '0,636', '0,357', '0,427', '0,665', '0,374', '0,447', '0,697', '0,394', '0,470', '0,603', '0,339', '0,405', '0,632', '0,356', '0,425', '0,661', '0,373', '0,445', '0,525', '0,314', '0,368'];
const FIXES_REELS = ['1065', '1330', '1395', '1457', '1515', '1320', '1387', '1448', '1482'];

describe('frais fictifs', () => {
  const jeu = genererFrais();
  const texte = serialiserFrais(jeu);
  it('meme-graine-meme-empreinte', () => {
    expect(sha(jeu)).toBe(EMPREINTE);
    expect(sha(genererFrais())).toBe(sha(jeu));
    for (const g of [1, 0, -5]) {
      expect(sha(genererFrais(g))).toBe(sha(genererFrais(g)));
      expect(sha(genererFrais(g))).not.toBe(sha(jeu));
    }
    for (const g of [NaN, Infinity, 1.5]) expect(() => genererFrais(g)).toThrow(RangeError);
    const triee = (v: unknown): boolean =>
      Array.isArray(v) ? v.every(triee) : v !== null && typeof v === 'object' ? Object.keys(v).join() === Object.keys(v).sort().join() && Object.values(v).every(triee) : true;
    expect(triee(JSON.parse(texte))).toBe(true);
  });
  it('exemple-de-la-demo-present', () => {
    const cherche = (m: number) => jeu.frais.find((f) => f.montantTtc === m);
    expect(cherche(6400)).toMatchObject({ payeur: 'societe', statut: 'exclu_paye_societe' });
    expect(cherche(4500)).toMatchObject({ justificatifPerdu: true, statut: 'a_completer' });
    expect(cherche(4500)?.pieceId).toBeUndefined();
    expect(cherche(1260)).toMatchObject({ payeur: 'personne', statut: 'valide' });
  });
  it('chaque-statut-present', () => {
    for (const s of STATUTS) expect(jeu.frais.some((f) => f.statut === s)).toBe(true);
    for (const p of ['societe', 'personne', 'a_confirmer']) expect(jeu.frais.some((f) => f.payeur === p)).toBe(true);
    expect(jeu.frais.some((f) => f.justificatifPerdu && (f.motifSansJustificatif ?? '') !== '')).toBe(true);
    expect(jeu.frais.some((f) => f.partPersoTtc > 0)).toBe(true);
    const refuses = jeu.frais.filter((f) => f.statut === 'refuse' && f.pieceId !== undefined);
    expect(refuses.some((r) => jeu.frais.some((f) => f.id !== r.id && f.pieceId === r.pieceId))).toBe(true);
    const annees = jeu.trajets.map((t) => jeu.frais.find((f) => f.id === t.fraisId)?.dateDepense.slice(0, 4));
    expect(new Set(annees).size).toBeGreaterThanOrEqual(2);
  });
  it('ids-uniques', () => {
    for (const l of [jeu.personnes, jeu.vehicules, jeu.frais, jeu.lignesBanque, jeu.cartesSociete]) {
      const ids = l.map((x) => x.id);
      expect(ids.length).toBeGreaterThan(0);
      expect(new Set(ids).size).toBe(ids.length);
    }
    for (const t of jeu.trajets) {
      expect(jeu.frais.some((f) => f.id === t.fraisId && f.nature === 'trajet')).toBe(true);
      expect(jeu.vehicules.some((v) => v.id === t.vehiculeId)).toBe(true);
    }
    for (const f of jeu.frais) expect(jeu.personnes.some((p) => p.id === f.personneId)).toBe(true);
    expect(jeu.personnes.length).toBe(2);
  });
  it('emails-exemple-fr', () => {
    for (const p of jeu.personnes) expect(p.email).toMatch(/^[a-z.]+@exemple\.fr$/);
    expect([...texte.matchAll(/[\w.-]+@[\w.-]+/g)].every((m) => m[0].endsWith('@exemple.fr'))).toBe(true);
  });
  it('aucun-iban', () => {
    expect(/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,}/.test(texte)).toBe(false);
  });
  it('vehicule-societe-present', () => {
    expect(jeu.vehicules.map((v) => v.proprietaire).sort()).toEqual(['location', 'personne', 'personne', 'societe']);
    expect(jeu.vehicules.map((v) => v.energie)).toContain('electrique');
    expect(jeu.vehicules.map((v) => v.immatriculation)).toEqual(['XX-000-XX', 'XX-001-XX', 'XX-002-XX', 'XX-003-XX']);
    expect(jeu.trajets.some((t) => jeu.vehicules.find((v) => v.id === t.vehiculeId)?.proprietaire === 'societe')).toBe(true);
  });
  it('parametres-fictifs-marques', () => {
    const cles = new Set(jeu.parametres.map((p) => p.cle));
    expect([...cles].sort()).toEqual(['bareme_ik_majoration_electrique', 'bareme_ik_voiture']);
    expect(jeu.parametres.length).toBeGreaterThanOrEqual(4);
    for (const p of jeu.parametres) {
      expect(p.source).toContain('fictif');
      expect(p.pays).toBe('FR');
    }
    for (const s of ['valide', 'a_verifier']) expect(jeu.parametres.some((p) => p.statut === s)).toBe(true);
    const valeurs = jeu.parametres.map((p) => p.valeur).join('|');
    for (const t of TAUX_REELS) expect(valeurs).not.toContain(t);
    for (const f of FIXES_REELS) expect(valeurs).not.toContain(f);
    expect(() => JSON.parse(jeu.parametres.find((p) => p.cle === 'bareme_ik_voiture')?.valeur ?? '')).not.toThrow();
  });
});
