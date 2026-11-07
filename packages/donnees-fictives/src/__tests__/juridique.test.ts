import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { sirenValide } from '../generateur.js';
import { genererJuridique, serialiserJuridique } from '../juridique.js';

const EMPREINTE = '63f60f3edf626fcb27010fdb5047b0ba3b593c1ff4a1c18c99abe110d912b7bb';
const sha = (t: string): string => createHash('sha256').update(t).digest('hex');
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function dateValide(s: string): boolean {
  if (!DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

describe('obligations juridiques fictives', () => {
  const jeu = genererJuridique();
  const sarl = jeu.obligations.find((o) => o.forme === 'FORME_A');
  const sci = jeu.obligations.find((o) => o.forme === 'FORME_SCI');
  if (!sarl || !sci) throw new Error('sociétés manquantes');

  it('meme-graine-meme-empreinte', () => {
    expect(sha(serialiserJuridique(jeu))).toBe(EMPREINTE);
    expect(serialiserJuridique(genererJuridique())).toBe(serialiserJuridique(jeu));
    expect(serialiserJuridique(genererJuridique(1))).not.toBe(serialiserJuridique(jeu));
    for (const g of [0, -1, -20260101, Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      expect(serialiserJuridique(genererJuridique(g))).toBe(serialiserJuridique(genererJuridique(g)));
    }
    const cles = Object.keys(JSON.parse(serialiserJuridique(jeu)) as object);
    expect(cles).toEqual([...cles].sort());
  });

  it('deux-societes-siren-fictifs', () => {
    expect(jeu.obligations.map((o) => o.societeSiren)).toEqual(['123456782', '987654324']);
    for (const o of jeu.obligations) {
      expect(sirenValide(o.societeSiren)).toBe(true);
      expect(o.mention).toBe('prepare_par_ia');
    }
  });

  it('sci-sans-convocation-ni-confidentialite', () => {
    expect(sci.rapportGestion.statut).toBe('non_applicable');
    expect(sci.convocation).toEqual({ applicable: false, dateAssemblee: null, dateLimite: null, rappel: null, cartes: [] });
    expect(sci.confidentialite.proposee).toBe(false);
    expect(sci.confidentialite.choix).toBeNull();
    expect(sci.cartes.map((c) => c.code)).toEqual(['deposer_convention']);
  });

  it('sarl-question-effectif', () => {
    expect(sarl.rapportGestion.statut).toBe('brouillon');
    expect(sarl.rapportGestion.questions).toEqual(['effectif']);
    expect(sarl.convocation.applicable).toBe(true);
    expect(sarl.convocation.rappel).not.toBeNull();
  });

  it('ecart-50-000', () => {
    const carte = sarl.cartes.find((c) => c.code === 'ecart_montant');
    expect(carte?.ecartCentimes).toBe(50000);
    expect(Number.isInteger(carte?.ecartCentimes)).toBe(true);
  });

  it('dates-valides-et-ordonnees', () => {
    for (const g of [0, -5, 1, 20260101, 987654321]) {
      const c = (genererJuridique(g).obligations[0] ?? sarl).convocation;
      for (const d of [c.dateAssemblee, c.dateLimite, c.rappel]) {
        expect(d !== null && dateValide(d)).toBe(true);
      }
      expect(c.rappel as string < (c.dateLimite as string)).toBe(true);
      expect(c.dateLimite as string < (c.dateAssemblee as string)).toBe(true);
    }
  });

  it('option-vide-listes-vides', () => {
    expect(genererJuridique(GRAINE_TEST, { vide: true }).obligations).toEqual([]);
    expect(genererJuridique(undefined, { vide: true }).version).toBe(1);
  });

  it('aucun-mot-interdit', () => {
    const interdits = [['con', 'forme'], ['sans ', 'erreur'], ['garan', 'ti'], ['juri', 'ste'], ['P', 'DP']].map((p) => p.join('').toLowerCase());
    const texte = serialiserJuridique(jeu).toLowerCase();
    for (const mot of interdits) expect(texte).not.toContain(mot);
    expect(texte).not.toMatch(/@(?!exemple\.fr)/);
  });
});

const GRAINE_TEST = 7;
