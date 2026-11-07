import { describe, expect, it } from 'vitest';
import { juridique } from '../juridique.js';

const CODES_NOYAU = [
  'saisir_delai_statuts', 'convocation_tardive', 'assemblee_trop_proche', 'completer_bilan_effectif',
  'decision_absente', 'ecart_montant', 'deposer_convention', 'retenue_a_verifier', 'dispense',
] as const;

function tousLesTextes(arg = 'Exemple'): string[] {
  const { cartes, rubriquesSci, ...simples } = juridique;
  const cartesRendues = CODES_NOYAU.map((c) => {
    const carte: unknown = cartes[c];
    return typeof carte === 'function' ? String((carte as (...a: string[]) => string)(arg, arg)) : String(carte);
  });
  return [...Object.values(simples), ...Object.values(rubriquesSci), ...cartesRendues];
}
const normaliser = (t: string): string => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ');
const MOT_REGISTRE = ['regis', 'tre le', 'gal'].join('');

describe('textes juridiques', () => {
  it('chaine-a-exacte', () => {
    expect(juridique.chaineA).toBe('document de travail, ne remplace pas le registre légal');
  });

  it('chaine-b-exacte', () => {
    expect(juridique.chaineB).toBe('à recopier dans votre registre légal');
  });

  it('phrase-du-greffe-exacte', () => {
    expect(juridique.phraseGreffe).toBe('pas de dépôt au greffe pour ce document');
    const occurrences = tousLesTextes().join('\n').toLowerCase().split('greffe').length - 1;
    expect(occurrences).toBe(1);
    expect(juridique.mentionPreparation).toBe('Préparé par IA, à valider');
  });

  it('une-carte-par-code-du-noyau', () => {
    expect(Object.keys(juridique.cartes).sort()).toEqual([...CODES_NOYAU].sort());
    expect(juridique.cartes.saisir_delai_statuts).toBe('Saisissez le délai prévu par vos statuts');
    expect(juridique.cartes.convocation_tardive).toBe('Convocation tardive : à vérifier avec votre expert-comptable');
    expect(juridique.cartes.deposer_convention).toBe('Déposez la convention');
    expect(juridique.cartes.dispense('Source fictive', '2026-01-02')).toContain('Pas de rapport de gestion demandé');
    expect(juridique.cartes.dispense('Source fictive', '2026-01-02')).toContain('Source fictive');
    expect(juridique.cartes.dispense('Source fictive', '2026-01-02')).toContain('2026-01-02');
    expect(juridique.cartes.ecart_montant('1 234,50 €')).toContain('1 234,50 €');
    expect(juridique.cartes.ecart_montant('')).toContain('Écart');
    expect(juridique.cartes.dispense('', '')).toContain('Pas de rapport de gestion demandé');
    expect(juridique.cartes.decision_absente).toContain('À vérifier');
    expect(juridique.cartes.completer_bilan_effectif).toContain('bilan et l’effectif');
    expect(Object.keys(juridique.rubriquesSci)).toHaveLength(['a', 'b', 'c', 'd', 'e', 'f'].length);
    for (const t of tousLesTextes('')) expect(t.trim().length).toBeGreaterThan(0);
  });

  it('vouvoiement', () => {
    for (const t of tousLesTextes()) expect(t).not.toMatch(/(?<!\p{L})(tu|ton|ta|tes)(?!\p{L})/iu);
  });

  it('aucun-mot-interdit', () => {
    const mots = [['con', 'forme'], ['sans ', 'erreur'], ['garan', 'ti'], ['juri', 'ste'], ['P', 'DP']].map((p) => p.join(''));
    for (const t of tousLesTextes()) {
      for (const mot of mots) expect(t.toLowerCase()).not.toContain(mot.toLowerCase());
    }
  });

  it('registre-legal-seulement-dans-a-et-b', () => {
    const { chaineA, chaineB, ...autres } = juridique;
    expect(normaliser(chaineA)).toContain(MOT_REGISTRE);
    expect(normaliser(chaineB)).toContain(MOT_REGISTRE);
    const reste = tousLesTextes().filter((t) => t !== chaineA && t !== chaineB);
    expect(Object.keys(autres)).toContain('cartes');
    for (const t of reste) expect(normaliser(t)).not.toContain(MOT_REGISTRE);
  });
});
