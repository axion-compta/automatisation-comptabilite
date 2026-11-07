import { describe, expect, it } from 'vitest';
import { ReponseExercices, ReponsePlan, listerExercices, listerPlan } from '../domaines/plan.js';
import { ReponseTiers, listerTiers } from '../domaines/tiers.js';

const exercice = { id: 'ex1', libelle: 'Exercice fictif', debut: '2025-01-01', fin: '2025-12-31', statut: 'ouvert' };
const compte = { numero: '411000', libelle: 'Clients', classe: 4, soldeCentimes: 1200 };
const tiers = { code: 'CLI001', nom: 'Client fictif', type: 'client', email: 'client@exemple.fr' };

const schemas = [
  { nom: 'exercices', schema: ReponseExercices, ligne: exercice },
  { nom: 'plan', schema: ReponsePlan, ligne: compte },
  { nom: 'tiers', schema: ReponseTiers, ligne: tiers },
];

describe('schémas de réponse exportés', () => {
  for (const { nom, schema, ligne } of schemas) {
    it(`reponse-${nom}-valide-et-bornes`, () => {
      expect(schema.safeParse({ body: [ligne], decalage: 0, total: 1 }).success).toBe(true);
      expect(schema.safeParse({ body: [], decalage: 0, total: 0 }).success).toBe(true);
      expect(schema.safeParse({ body: [ligne], decalage: 3, total: 10 }).success).toBe(true);
      const invalides: Record<string, unknown> = {
        'decalage négatif': { body: [], decalage: -1, total: 0 },
        'decalage non entier': { body: [], decalage: 1.5, total: 0 },
        'decalage NaN': { body: [], decalage: Number.NaN, total: 0 },
        'decalage infini': { body: [], decalage: Infinity, total: 0 },
        'total négatif': { body: [], decalage: 0, total: -1 },
        'total non entier': { body: [], decalage: 0, total: 2.5 },
        'total NaN': { body: [], decalage: 0, total: Number.NaN },
        'total infini': { body: [], decalage: 0, total: Infinity },
        'body absent': { decalage: 0, total: 0 },
        'body non tableau': { body: ligne, decalage: 0, total: 1 },
        'ligne invalide': { body: [{}], decalage: 0, total: 1 },
        'decalage absent': { body: [], total: 0 },
        'total absent': { body: [], decalage: 0 },
        vide: {},
      };
      for (const [cas, valeur] of Object.entries(invalides)) {
        expect(schema.safeParse(valeur).success, `${nom} : ${cas}`).toBe(false);
      }
    });
  }

  it('reponses-identiques-a-la-sortie-des-routes', () => {
    expect(listerExercices['~orpc'].outputSchema).toBe(ReponseExercices);
    expect(listerPlan['~orpc'].outputSchema).toBe(ReponsePlan);
    expect(listerTiers['~orpc'].outputSchema).toBe(ReponseTiers);
  });
});
