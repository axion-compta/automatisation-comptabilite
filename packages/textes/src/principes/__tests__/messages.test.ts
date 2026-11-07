import { describe, expect, it } from 'vitest';
import { messagePrincipe, messagesPrincipes, raisonIndicateurVide } from '../messages.js';

const CODES = [
  'ecritureValidee',
  'periodeCloturee',
  'hypothese',
  'memoireCorrection',
  'aucune_donnee',
  'donnee_absente',
  'pas_de_point_de_comparaison',
  'apresImmatriculation',
  'mentionDeclaration',
  'geste_humain_requis',
  'permission_manquante',
  'reauth_requise',
  'passage_direct_interdit',
  'pilote_trop_court',
  'motif_obligatoire',
  'introuvable',
] as const;

// Mots interdits assemblés par morceaux, comme outils/gardes/textes.mjs.
const INTERDITS = [['con', 'forme'], ['sans ', 'erreur'], ['garan', 'ti'], ['juri', 'ste'], ['P', 'DP']].map((p) =>
  p.join(''),
);

describe('messagesPrincipes', () => {
  it('phrase-ecriture-validee-exacte', () => {
    expect(messagesPrincipes.ecritureValidee).toBe(
      'Cette écriture est validée : je peux la corriger par une contre-passation.',
    );
    expect(messagesPrincipes.periodeCloturee).toBe(
      'Cette période est clôturée : je propose la correction sur la période ouverte.',
    );
    expect(messagesPrincipes.hypothese).toBe('Hypothèse, à confirmer');
    expect(messagesPrincipes.memoireCorrection).toBe("Je m'en souviens pour cette société");
    expect(messagesPrincipes.geste_humain_requis).toBe(
      "Cette action demande l'accord d'une personne : elle n'est jamais faite automatiquement.",
    );
    expect(messagesPrincipes.reauth_requise).toBe('Confirmez votre identité pour continuer.');
  });

  it('mention-declaration-exacte', () => {
    expect(messagesPrincipes.mentionDeclaration).toBe(
      'Préparé par IA, à valider. La responsabilité de la déclaration reste la vôtre et celle de votre expert-comptable.',
    );
    expect(messagesPrincipes.aucune_donnee).toBe('Aucune vente enregistrée.');
    expect(messagesPrincipes.pas_de_point_de_comparaison).toBe('Pas de point de comparaison');
    expect(messagesPrincipes.apresImmatriculation).toBe('Disponible après immatriculation');
  });

  it('chaque-code-a-un-texte', () => {
    expect(Object.keys(messagesPrincipes).sort()).toEqual([...CODES].sort());
    for (const c of CODES) expect(messagePrincipe(c)).toBe(messagesPrincipes[c]);
    expect(raisonIndicateurVide('aucune_donnee')).toBe(messagesPrincipes.aucune_donnee);
    expect(raisonIndicateurVide('donnee_absente')).toBe(messagesPrincipes.donnee_absente);
    expect(raisonIndicateurVide('pas_de_point_de_comparaison')).toBe(messagesPrincipes.pas_de_point_de_comparaison);
    expect(Object.isFrozen(messagesPrincipes)).toBe(true);
  });

  it('aucun-texte-vide', () => {
    for (const c of CODES) {
      const t = messagesPrincipes[c];
      expect(t.trim()).not.toBe('');
      expect(t).toBe(t.trim());
      expect(t.length).toBeGreaterThan(8);
    }
  });

  it('aucun-mot-interdit', () => {
    for (const c of CODES) {
      for (const mot of INTERDITS) {
        expect(messagesPrincipes[c].toLowerCase()).not.toContain(mot.toLowerCase());
      }
      expect(messagesPrincipes[c]).not.toMatch(/%/);
    }
  });

  it('introuvable-identique', () => {
    expect(messagesPrincipes.introuvable).toBe('Élément introuvable.');
    expect(messagePrincipe('introuvable')).toBe(messagesPrincipes.introuvable);
  });
});
