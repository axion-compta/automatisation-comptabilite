import { describe, expect, it } from 'vitest';
import { e45 } from './e45';
import { profilCodes as p } from './profil-codes';

const CODES = {
  blocages: ['forme_hors_perimetre', 'societe_cotee', 'commissaire_aux_comptes', 'paie', 'plusieurs_pays', 'siege_exclu', 'code_postal_invalide', 'forme_sans_regle', 'forme_refusee_mvp'],
  etats: ['incomplet', 'a_confirmer', 'complet', 'regime_tva_a_confirmer', 'tva_non_calculee', 'siren_absent'],
  identifiants: ['siren_invalide', 'tva_cle_fausse', 'vies_non_verifie', 'sirene_saisie_manuelle'],
  statuts: ['confirme', 'a_confirmer', 'vide', 'je_ne_sais_pas', 'a_verifier'],
  confiances: ['sur', 'a_verifier', 'douteux'],
  origines: ['document', 'sirene', 'vies', 'saisie_personne', 'proposition_ia', 'import_fichier'],
} as const;
type Famille = keyof typeof CODES;
const familles = Object.keys(CODES) as Famille[];
const phrases = (f: Famille): string[] => Object.values(p[f]);
const toutes = [...familles.flatMap(phrases), ...Object.values(e45.champs), ...Object.values(e45.boutons), e45.titre, e45.mention, e45.principe];
const MOTS = [['con', 'forme'], ['sans ', 'erreur'], ['garan', 'ti'], ['juri', 'ste'], ['P', 'DP'], ['je', 'ter'], ['je', 'tez']].map((m) => m.join(''));

describe('textes des codes du profil', () => {
  it('chaque-code-a-sa-phrase', () => {
    for (const f of familles) {
      expect(Object.keys(p[f]).sort(), f).toEqual([...CODES[f]].sort());
      for (const c of CODES[f]) {
        const phrase = p.phraseDeCode(f, c);
        expect(phrase, `${f}.${c}`).toBe((p[f] as Record<string, string>)[c]);
        expect(phrase).not.toBe('Information à vérifier');
      }
    }
  });

  it('aucun-mot-interdit', () => {
    for (const t of toutes) for (const m of MOTS) expect(t.toLowerCase(), t).not.toContain(m.toLowerCase());
  });

  it('vouvoiement', () => {
    const tu = /(?<![\p{L}\p{N}_])(tu|ton|ta|tes|toi|te)(?![\p{L}\p{N}_])/iu;
    for (const t of toutes) expect(tu.test(t), t).toBe(false);
    expect(tu.test('Tu peux')).toBe(true);
  });

  it('confiance-sans-pourcentage', () => {
    for (const t of phrases('confiances')) expect(t).not.toMatch(/[%\d]/);
    expect(phrases('confiances')).toHaveLength(3);
  });

  it('code-inconnu-phrase-neutre', () => {
    for (const c of ['', 'inconnu', 'toString', '__proto__', 'constructor', 'siren_invalide ']) {
      expect(p.phraseDeCode('blocages', c)).toBe('Information à vérifier');
    }
    expect(p.phraseDeCode('inconnue' as Famille, 'paie')).toBe('Information à vérifier');
    expect(p.phraseDeCode('constructor' as Famille, 'paie')).toBe('Information à vérifier');
    expect(p.phraseDeCode('etats', 'siege_exclu')).toBe('Information à vérifier');
  });

  it('phrases-de-la-spec-exactes', () => {
    expect(p.phraseDeCode('etats', 'regime_tva_a_confirmer')).toBe('Votre régime de TVA est encore à confirmer');
    expect(p.phraseDeCode('etats', 'tva_non_calculee')).toBe('TVA non calculée : régime à confirmer');
    expect(p.phraseDeCode('blocages', 'commissaire_aux_comptes')).toBe("Une société avec un commissaire aux comptes n'est pas prise en charge pour l'instant");
    expect(p.phraseDeCode('identifiants', 'siren_invalide')).toBe("Ce numéro SIREN n'est pas valide : vérifiez les 9 chiffres");
    expect(e45.principe).toBe("Chaque changement dit son effet avant d'être fait");
    expect(e45.mention).toBe('Préparé par IA, à valider');
  });

  it('aucune-chaine-vide', () => {
    for (const t of toutes) {
      expect(t.trim().length, t).toBeGreaterThan(0);
      expect(t).toBe(t.trim());
    }
    expect(e45.titre).toBe('Mon entreprise');
    expect(Object.values(e45.boutons)).toEqual(['Modifier', "Voir l'effet", 'Confirmer', 'Voir la source']);
  });
});
