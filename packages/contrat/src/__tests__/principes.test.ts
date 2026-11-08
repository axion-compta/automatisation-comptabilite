import { describe, expect, it } from 'vitest';
import { Indicateur } from '../domaines/principes.js';
import { genererOpenapi } from '../openapi.js';

type Document = { paths?: Record<string, Record<string, { operationId?: string }>> };

describe('contrat : principes', () => {
  it('route-gestes-dans-openapi', () => {
    const doc = genererOpenapi() as Document;
    expect(doc.paths?.['/gestes-humains']?.get?.operationId).toBe('listerGestesHumains');
  });

  it('indicateur-accepte-les-trois-etats', () => {
    expect(Indicateur.safeParse({ etat: 'ok', valeur: 3 }).success).toBe(true);
    expect(Indicateur.safeParse({ etat: 'ok', valeur: 0 }).success).toBe(true);
    expect(Indicateur.safeParse({ etat: 'vide', valeur: null, raison: 'aucune écriture' }).success).toBe(true);
    expect(Indicateur.safeParse({ etat: 'donnee_manquante', valeur: null, raison: 'import absent' }).success).toBe(true);
  });

  it('indicateur-refuse-zero-sans-donnee', () => {
    expect(Indicateur.safeParse({ etat: 'vide', valeur: 0, raison: 'x' }).success).toBe(false);
    expect(Indicateur.safeParse({ etat: 'vide', valeur: 0 }).success).toBe(false);
    expect(Indicateur.safeParse({ etat: 'donnee_manquante', valeur: 0, raison: 'x' }).success).toBe(false);
    expect(Indicateur.safeParse({ etat: 'vide', valeur: null }).success).toBe(false);
    expect(Indicateur.safeParse({ etat: 'ok', valeur: null }).success).toBe(false);
    expect(Indicateur.safeParse({ etat: 'ok', valeur: Number.NaN }).success).toBe(false);
    expect(Indicateur.safeParse({ etat: 'ok', valeur: Number.POSITIVE_INFINITY }).success).toBe(false);
  });
});
