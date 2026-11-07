import { describe, expect, it } from 'vitest';
import { AppelIa, CHAMPS_INTERDITS, DecisionIa } from '../journal-ia.js';

const appel = {
  id: 'a1', agent: 'classeur', piece_id: 'p1', alias: 'rapide', modele: 'modele-x', version_modele: 'v1',
  fournisseur: 'four-a', region: 'eu-1', jetons_entree: 120, jetons_sortie: 30,
  cout_micro_centimes: 450, duree_ms: 800, issue: 'ok',
};
const decision = {
  id: 'd1', quand: '2030-01-01T10:00:00Z', agent: 'classeur', etape: 'classee',
  demandeur: { sorte: 'personne', id: 'u1' }, conversation_id: 'c1', objet: { type: 'piece', id: 'p1' },
  proposition: 'compte_606', source_proposition: 'historique', confiance: 'sur', motif: 'Fournisseur déjà classé',
  sources_legales: ['DEC-001:art39@2030'], appel_id: 'a1', cout_micro_centimes: 450,
};
const ok = (s: { safeParse: (v: unknown) => { success: boolean } }, v: unknown) => s.safeParse(v).success;
const sans = (o: Record<string, unknown>, ...cles: string[]) =>
  Object.fromEntries(Object.entries(o).filter(([k]) => !cles.includes(k)));

describe('journal de l’IA', () => {
  it('appel-valide', () => {
    expect(ok(AppelIa, appel)).toBe(true);
    expect(ok(AppelIa, { ...sans(appel, 'piece_id'), conversation_id: 'c1' })).toBe(true);
    expect(ok(AppelIa, { ...appel, en_trop: 1 })).toBe(false);
    for (const i of ['reponse', '', 5]) expect(ok(AppelIa, { ...appel, issue: i })).toBe(false);
  });

  it('decision-valide', () => {
    expect(ok(DecisionIa, decision)).toBe(true);
    expect(ok(DecisionIa, { ...decision, demandeur: { sorte: 'systeme' } })).toBe(true);
    expect(ok(DecisionIa, { ...decision, demandeur: { sorte: 'systeme', id: 'u1' } })).toBe(false);
    expect(ok(DecisionIa, { ...decision, demandeur: { sorte: 'robot' } })).toBe(false);
    expect(ok(DecisionIa, { ...decision, en_trop: 1 })).toBe(false);
    expect(ok(DecisionIa, { ...decision, objet: { type: 'piece', id: 'p1', x: 1 } })).toBe(false);
  });

  it('champ-texte-refuse', () => {
    expect(CHAMPS_INTERDITS).toHaveLength(6);
    for (const c of CHAMPS_INTERDITS) {
      expect(ok(AppelIa, { ...appel, [c]: 'x' })).toBe(false);
      expect(ok(DecisionIa, { ...decision, [c]: 'x' })).toBe(false);
    }
  });

  it('cout-negatif-ou-decimal-refuse', () => {
    for (const v of [-1, 0.5, NaN, Infinity, -Infinity, '5', 2 ** 53]) {
      for (const k of ['cout_micro_centimes', 'jetons_entree', 'jetons_sortie', 'duree_ms']) {
        expect(ok(AppelIa, { ...appel, [k]: v })).toBe(false);
      }
      expect(ok(DecisionIa, { ...decision, cout_micro_centimes: v })).toBe(false);
    }
    expect(ok(AppelIa, { ...appel, cout_micro_centimes: 0 })).toBe(true);
  });

  it('source-legale-mal-formee', () => {
    for (const s of ['DEC-001:', 'X:Y@1', '', 'DEC-001:art39', 'DEC-001:@1', 'DEC-001:a@']) {
      expect(ok(DecisionIa, { ...decision, sources_legales: [s] })).toBe(false);
    }
    expect(ok(DecisionIa, { ...decision, sources_legales: [] })).toBe(true);
  });

  it('motif-trop-long', () => {
    expect(ok(DecisionIa, { ...decision, motif: 'a'.repeat(200) })).toBe(true);
    expect(ok(DecisionIa, { ...decision, motif: 'a'.repeat(201) })).toBe(false);
  });

  it('ni-piece-ni-conversation-refuse', () => {
    expect(ok(AppelIa, sans(appel, 'piece_id'))).toBe(false);
    expect(ok(DecisionIa, sans(decision, 'conversation_id'))).toBe(false);
    expect(ok(DecisionIa, { ...decision, piece_id: 'p1' })).toBe(true);
  });

  it('confiance-hors-liste', () => {
    for (const c of ['haute', '', 'SUR', 1, null]) expect(ok(DecisionIa, { ...decision, confiance: c })).toBe(false);
    expect(ok(DecisionIa, { ...decision, source_proposition: 'devin' })).toBe(false);
  });

  it('iban-fictif-dans-le-motif-refuse', () => {
    const iban = 'FR76' + '0'.repeat(23);
    const groupes = 'FR76 ' + ['0000', '0000', '0000', '0000', '000'].join(' ');
    for (const m of [iban, `Payé sur ${iban} hier`, groupes, iban.toLowerCase()]) {
      expect(ok(DecisionIa, { ...decision, motif: m })).toBe(false);
    }
    expect(ok(DecisionIa, { ...decision, motif: 'Facture FR2030 classée' })).toBe(true);
  });
});
