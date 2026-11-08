import { describe, expect, it } from 'vitest';
import { genererJuridique } from '../../../donnees-fictives/src/juridique.js';
import { ObligationsJuridiques, ParamsJuridique, ReponseObligationsJuridiques } from '../domaines/juridique.js';
import { creerServiceJuridique } from '../domaines/juridique-service.js';
import { genererOpenapi, routesEcritureSansEnTete } from '../openapi.js';

const [sarl, sci] = genererJuridique().obligations;
if (!sarl || !sci) throw new Error('jeu fictif incomplet');

describe('obligations juridiques en mémoire', () => {
  it('obligations-de-la-sarl', () => {
    const o = creerServiceJuridique(sarl.societeSiren).lire('EX2026')!;
    expect(ReponseObligationsJuridiques.parse({ body: o }).body).toEqual(o);
    expect(o).toEqual(sarl);
    expect(o.rapportGestion).toEqual({ statut: 'brouillon', questions: ['effectif'] });
    expect(o.convocation.applicable).toBe(true);
    expect(o.confidentialite).toEqual({ proposee: true, choix: 'non_choisi' });
    expect(o.cartes[0]).toMatchObject({ code: 'ecart_montant', ecartCentimes: 50000 });
  });

  it('obligations-de-la-sci-sans-convocation', () => {
    const o = creerServiceJuridique(sci.societeSiren).lire('EX2026')!;
    expect(ObligationsJuridiques.parse(o)).toEqual(o);
    expect(o.convocation).toEqual({ applicable: false, dateAssemblee: null, dateLimite: null, rappel: null, cartes: [] });
    expect(o.rapportGestion.statut).toBe('non_applicable');
    expect(o.confidentialite).toEqual({ proposee: false, choix: null });
  });

  it('mention-prepare-par-ia', () => {
    for (const o of genererJuridique().obligations) {
      expect(ObligationsJuridiques.parse(o).mention).toBe('prepare_par_ia');
      expect(ObligationsJuridiques.safeParse({ ...o, mention: 'Préparé par une IA' }).success).toBe(false);
      expect(ObligationsJuridiques.safeParse({ ...o, mention: '' }).success).toBe(false);
    }
  });

  it('exercice-inconnu-404', () => {
    const s = creerServiceJuridique(sarl.societeSiren);
    for (const e of ['EX1999', 'ex2026', ' EX2026', 'EX2026%20', '../EX2026']) expect(s.lire(e)).toBeNull();
    expect(creerServiceJuridique('societe-inconnue').lire('EX2026')).toBeNull();
  });

  it('identifiant-vide-refuse', () => {
    expect(ParamsJuridique.safeParse({ exercice: '' }).success).toBe(false);
    expect(ParamsJuridique.safeParse({ exercice: 'E'.repeat(65) }).success).toBe(false);
    expect(ParamsJuridique.safeParse({ exercice: 'EX 2026/é' }).success).toBe(false);
    expect(ParamsJuridique.safeParse({ exercice: 'E'.repeat(64) }).success).toBe(true);
    expect(ParamsJuridique.safeParse({ exercice: 'EX2026' }).success).toBe(true);
  });

  it('openapi-contient-la-route', () => {
    const doc = genererOpenapi() as { paths: Record<string, Record<string, { operationId?: string }>> };
    expect(doc.paths['/exercices/{exercice}/juridique']?.get?.operationId).toBe('lireObligationsJuridiques');
    expect(Object.keys(doc.paths['/exercices/{exercice}/juridique'] ?? {})).toEqual(['get']);
    expect(routesEcritureSansEnTete()).toEqual([]);
  });
});
