import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { sirenValide } from '../generateur.js';
import { genererPieces, serialiserPieces, type JeuPieces } from '../pieces.js';

const EMPREINTE = '15360da515c321b644929d506083372d1faa3c9ff2b7c4636a11f9f8106151dc';
const ETATS = ['recue', 'quarantaine', 'preparee', 'lue', 'prete', 'a_verifier', 'refusee', 'en_erreur', 'en_attente_quota'];
const TYPES = [
  'facture', 'facture_acompte', 'recu', 'ticket', 'avoir', 'annulee', 'reemise', 'montant_zero',
  'releve_fournisseur', 'non_piece', 'plusieurs_factures', 'facture_dans_corps', 'inconnu',
];

describe('banc de pièces fictives', () => {
  const jeu = genererPieces();
  const sha = (j: JeuPieces): string => createHash('sha256').update(serialiserPieces(j)).digest('hex');

  it('meme-graine-meme-empreinte', () => {
    expect(sha(jeu)).toBe(EMPREINTE);
    expect(sha(genererPieces())).toBe(sha(jeu));
    expect(sha(genererPieces(1))).not.toBe(sha(jeu));
    expect(jeu.pieces.length).toBeGreaterThanOrEqual(30);
    for (const p of jeu.pieces) expect(p.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('tous-les-etats-presents', () => {
    expect([...new Set(jeu.pieces.map((p) => p.etat))].sort()).toEqual([...ETATS].sort());
  });

  it('tous-les-types-presents', () => {
    expect([...new Set(jeu.pieces.map((p) => p.typePiece))].sort()).toEqual([...TYPES].sort());
  });

  it('ids-uniques', () => {
    const ids = jeu.pieces.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(jeu.pieces.map((p) => p.sha256)).size).toBe(ids.length);
    expect(new Set(jeu.pieces.map((p) => p.cheminVirtuel)).size).toBe(ids.length);
  });

  it('sensible-sans-texte', () => {
    const sensibles = jeu.pieces.filter((p) => p.sensible);
    expect(sensibles.length).toBeGreaterThan(0);
    for (const p of sensibles) expect(p.texteExtrait).toBe('');
    for (const p of jeu.pieces.filter((x) => !x.sensible)) expect(p.texteExtrait).not.toBe('');
  });

  it('noms-fictifs-seulement', () => {
    for (const p of jeu.pieces) {
      const nom = p.champs.find((c) => c.nom === 'fournisseur_nom')?.valeur ?? '';
      expect(nom, p.id).toMatch(/^(FOURNISSEUR-EXEMPLE|RESTO-EXEMPLE|FOURNISSEUR-\d+)$/);
      const siren = p.champs.find((c) => c.nom === 'fournisseur_siren')?.valeur ?? '';
      expect(sirenValide(siren), p.id).toBe(true);
    }
    expect(serialiserPieces(jeu)).not.toMatch(/@(?!exemple\.fr|\d)|\bFR\d{2}/);
  });

  it('centimes-entiers', () => {
    for (const p of jeu.pieces) {
      for (const c of p.champs) {
        if (c.valeurCentimes !== undefined) {
          expect(Number.isSafeInteger(c.valeurCentimes), p.id + c.nom).toBe(true);
          expect(String(c.valeurCentimes)).toBe(c.valeur);
        }
      }
    }
    const taux = new Set(jeu.pieces.flatMap((p) => p.champs.filter((c) => c.nom.startsWith('ht@')).map((c) => c.nom)));
    expect([...taux].sort()).toEqual(['ht@0', 'ht@1100', 'ht@1900', 'ht@600']);
    const triple = jeu.pieces.find((p) => p.champs.filter((c) => c.nom.startsWith('ht@')).length === 3);
    expect(triple?.champs.find((c) => c.nom === 'ttc')?.valeurCentimes).toBe(39400);
    const quarante = jeu.pieces.filter((p) => p.champs.some((c) => c.nom === 'ttc' && c.valeurCentimes === 4999));
    expect(quarante.map((p) => p.champs.find((c) => c.nom === 'numero')?.valeur)).toEqual(['F-0201', 'F-0202']);
    const douteux = jeu.pieces.filter((p) => p.champs.some((c) => c.mot === 'douteux'));
    expect(douteux).toHaveLength(1);
    expect(douteux[0]?.champs.filter((c) => c.mot === 'douteux').map((c) => c.nom)).toEqual(['ttc']);
  });
});
