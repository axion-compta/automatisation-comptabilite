import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AlerteSchema, QueryAlertes, ReponseAlertes, ReponseCompteurs } from '../domaines/alertes.js';
import { creerServiceAlertes } from '../domaines/alertes-service.js';
import { genererOpenapi } from '../openapi.js';

const ids = (l: { body: { regle: string }[] }) => l.body.map((a) => a.regle);

describe('contrat alertes : service en mémoire', () => {
  it('liste-triee', () => {
    const l = creerServiceAlertes().lister();
    expect(ids(l)).toEqual(['ALR-01', 'ALR-05', 'ALR-04', 'ALR-09', 'ALR-08', 'ALR-02', 'ALR-03', 'ALR-06', 'ALR-10', 'ALR-07', 'ALR-11']);
    expect(l.total).toBe(11);
    expect(ids(creerServiceAlertes().lister({ limite: 2, decalage: 1 }))).toEqual(['ALR-05', 'ALR-04']);
  });

  it('filtre-etat', () => {
    const s = creerServiceAlertes();
    expect(ids(s.lister({ etat: 'ouverte' }))).toEqual(['ALR-01', 'ALR-05', 'ALR-04', 'ALR-09', 'ALR-08']);
    expect(ids(s.lister({ etat: 'reportee' }))).toEqual(['ALR-02', 'ALR-10']);
    expect(ids(s.lister({ entree: 'banque' }))).toEqual(['ALR-09', 'ALR-03']);
    expect(s.lister({ etat: 'resolue', entree: 'banque' })).toEqual({ body: [], decalage: 0, total: 0 });
  });

  it('compteurs-par-entree', () => {
    const { parEntree } = creerServiceAlertes().compteurs().body;
    expect(parEntree).toEqual({
      declarations: { ouvertes: 2, urgentes: 2, pointExclamation: true },
      mois: { ouvertes: 2, urgentes: 2, pointExclamation: true },
      banque: { ouvertes: 1, urgentes: 1, pointExclamation: true },
      activite: { ouvertes: 1, urgentes: 0, pointExclamation: false },
      factures: { ouvertes: 1, urgentes: 0, pointExclamation: false },
    });
    expect(parEntree['documents']).toBeUndefined();
  });

  it('alertes-du-jour-trois-et-total', () => {
    const { cartes, urgentesTotal } = creerServiceAlertes().compteurs().body.alertesDuJour;
    expect(urgentesTotal).toBe(5);
    expect(cartes.map((c) => c.regle)).toEqual(['ALR-01', 'ALR-05', 'ALR-02']);
    expect(cartes.every((c) => AlerteSchema.safeParse(c).success)).toBe(true);
  });

  it('point-exclamation-urgent-ou-bloquant', () => {
    const { parEntree } = creerServiceAlertes().compteurs().body;
    const l = creerServiceAlertes().lister().body;
    for (const [entree, c] of Object.entries(parEntree)) {
      const actives = l.filter((a) => a.entreeMenu === entree && (a.etat === 'ouverte' || a.etat === 'reportee'));
      expect(c.pointExclamation).toBe(actives.some((a) => a.gravite === 'urgent' || a.gravite === 'bloquant'));
      expect(c.ouvertes).toBe(actives.length);
    }
  });

  it('aucun-montant-ni-tiers-dans-le-schema', () => {
    expect(Object.keys(AlerteSchema.shape).sort()).toEqual(['echeanceLe', 'entreeMenu', 'etat', 'gravite', 'id', 'lien', 'ouverteLe', 'regle', 'titreCode', 'version']);
    const ok = { id: 'a', regle: 'ALR-01', gravite: 'info', etat: 'ouverte', entreeMenu: 'mois', ouverteLe: '2026-10-15', version: 1, titreCode: 'ALR-01', lien: '/alertes' };
    expect(AlerteSchema.safeParse(ok).success).toBe(true);
    for (const extra of [{ montantCentimes: 100 }, { nomTiers: 'Société Fictive' }]) expect(AlerteSchema.safeParse({ ...ok, ...extra }).success).toBe(false);
    const proprietes = (n: unknown): string[] => (n !== null && typeof n === 'object' ? Object.entries(n).flatMap(([k, v]) => (k === 'properties' ? [...Object.keys(v as object), ...Object.values(v as object).flatMap(proprietes)] : proprietes(v))) : []);
    const noms = proprietes(z.toJSONSchema(ReponseAlertes)).concat(proprietes(z.toJSONSchema(ReponseCompteurs)));
    expect(noms).toContain('titreCode');
    expect(noms.filter((n) => /montant|tiers|nom|iban|siren/i.test(n))).toEqual([]);
    const chemins = Object.keys((genererOpenapi() as { paths: Record<string, unknown> }).paths);
    expect(chemins).toEqual(expect.arrayContaining(['/exercices/{exercice}/alertes', '/exercices/{exercice}/compteurs']));
    expect(JSON.stringify(creerServiceAlertes().lister())).not.toMatch(/montant|tiers|€/);
  });

  it('requete-stricte', () => {
    expect(QueryAlertes.safeParse({ etat: 'inconnu' }).success).toBe(false);
    expect(QueryAlertes.safeParse({ limite: '0' }).success).toBe(false);
    expect(QueryAlertes.safeParse({ limite: '101' }).success).toBe(false);
    expect(QueryAlertes.safeParse({ limite: '1.5' }).success).toBe(false);
    expect(QueryAlertes.safeParse({ decalage: '-1' }).success).toBe(false);
    expect(QueryAlertes.safeParse({ x: '1' }).success).toBe(false);
    expect(QueryAlertes.safeParse({ etat: 'ouverte', limite: '100', decalage: '0' }).success).toBe(true);
  });
});
