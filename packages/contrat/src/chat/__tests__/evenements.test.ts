import { describe, expect, it } from 'vitest';
import { CODES_ERREUR, ISSUES, NIVEAUX, TYPES_EVENEMENT } from '../../../../noyau/src/chat/types.js';
import { lireEvenement, schemaDemande } from '../evenements.js';

const LONGUEUR = 50;
const demande = { message_id: 'm1', conversation_id: 'c1', texte: 'Bonjour', puces: [{ type: 'ecran', ref: 'ecritures' }], canal: 'clavier' };
const carte = { id: 'k1', titre_code: 'carte.titre', source: { type: 'ecriture', id: 'e1' }, type: 'tva', montant_centimes: 100, devise: 'EUR' };
const choix = (n: number) => Array.from({ length: n }, (_, i) => ({ code: `c${i}`, libelle_code: `choix.${i}` }));
const EVENEMENTS: Record<string, Record<string, unknown>> = {
  'tour.debut': { id: 1, type: 'tour.debut' },
  etape: { id: 2, type: 'etape', etape: 'lue_a' },
  texte: { id: 3, type: 'texte', texte: 'Voici' },
  carte: { id: 4, type: 'carte', carte },
  proposition: { id: 5, type: 'proposition', proposition_id: 'p1', niveau: NIVEAUX[0], nombre_objets: 2 },
  question: { id: 6, type: 'question', choix: choix(2) },
  erreur: { id: 7, type: 'erreur', code: CODES_ERREUR[0] },
  'tour.fin': { id: 8, type: 'tour.fin', issue: ISSUES[0], cout_micro_centimes: 0 },
};
const ev = (type: string, patch: Record<string, unknown>) => lireEvenement({ ...EVENEMENTS[type], ...patch });

describe('contrat des événements du chat', () => {
  const schema = schemaDemande(LONGUEUR);
  it('demande-valide', () => {
    expect(schema.safeParse(demande).success).toBe(true);
    expect(schema.safeParse({ ...demande, texte: 'x'.repeat(LONGUEUR) }).success).toBe(true);
    expect(schema.safeParse({ ...demande, canal: 'fax' }).success).toBe(false);
    expect(schema.safeParse({ ...demande, message_id: '' }).success).toBe(false);
    expect(schema.safeParse({ ...demande, conversation_id: '' }).success).toBe(false);
    expect(schema.safeParse({ ...demande, puces: [{ type: 'autre', ref: 'r' }] }).success).toBe(false);
  });
  it('demande-texte-trop-long', () => {
    expect(schema.safeParse({ ...demande, texte: 'x'.repeat(LONGUEUR + 1) }).success).toBe(false);
  });
  it('demande-texte-vide', () => {
    expect(schema.safeParse({ ...demande, texte: '' }).success).toBe(false);
  });
  it('demande-champ-societe-refuse', () => {
    expect(schema.safeParse({ ...demande, societe_id: 's1' }).success).toBe(false);
    expect(schema.safeParse({ ...demande, tenant_id: 't1' }).success).toBe(false);
  });
  it('longueur-max-invalide', () => {
    for (const v of [0, -1, 2.5, Number.NaN, Infinity]) expect(() => schemaDemande(v)).toThrow();
  });
  it('huit-evenements-lus', () => {
    expect(Object.keys(EVENEMENTS)).toEqual([...TYPES_EVENEMENT]);
    for (const [type, brut] of Object.entries(EVENEMENTS)) expect(lireEvenement(brut)?.type, type).toBe(type);
    expect(ev('proposition', { montant_total_centimes: 500 })).not.toBeNull();
    expect(ev('proposition', { montant_total_centimes: 5.5 })).toBeNull();
    expect(ev('proposition', { nombre_objets: -1 })).toBeNull();
    expect(ev('carte', { carte: { ...carte, type: 'inconnue' } })).toBeNull();
    expect(ev('texte', { id: 1.5 })).toBeNull();
    expect(ev('texte', { id: -1 })).toBeNull();
  });
  it('type-inconnu-donne-null', () => {
    for (const v of [{ id: 1, type: 'nouveau' }, [], 42, 'texte', null, undefined, {}, [EVENEMENTS['texte']]]) {
      expect(lireEvenement(v)).toBeNull();
    }
  });
  it('question-un-ou-six-choix-refusee', () => {
    for (const n of [1, 6, 0]) expect(ev('question', { choix: choix(n) })).toBeNull();
    for (const n of [2, 5]) expect(ev('question', { choix: choix(n) })).not.toBeNull();
  });
  it('erreur-code-hors-liste-null', () => {
    expect(ev('erreur', { code: 'code_invente' })).toBeNull();
    for (const c of CODES_ERREUR) expect(ev('erreur', { code: c })).not.toBeNull();
    expect(ev('tour.fin', { issue: 'autre' })).toBeNull();
  });
  it('cout-negatif-ou-decimal-null', () => {
    for (const v of [-1, 1.5, Number.NaN, Infinity, '3']) expect(ev('tour.fin', { cout_micro_centimes: v })).toBeNull();
    expect(ev('tour.fin', { cout_micro_centimes: 7 })).not.toBeNull();
  });
});
