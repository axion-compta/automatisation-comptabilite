import { describe, expect, it } from 'vitest';
import {
  ETATS_LIGNE,
  alerteReleveManquant,
  controleSolde,
  dejaImporte,
  demandeFacturesManquantes,
  estimation,
  etatLigne,
  explication,
  facteur,
  questionImport,
  reponsesPretes,
  ribChange,
  type CodeExplication,
  type CodeQuestionImport,
} from '../mots.js';

// Assemblés pour ne pas figurer en clair dans le dépôt (comme la garde des textes).
const INTERDITS = [
  ['con', 'forme'],
  ['sans ', 'erreur'],
  ['garan', 'ti'],
  ['juri', 'ste'],
  ['P', 'DP'],
  ['lett', 'rage'],
].map((p) => p.join(''));
const TUTOIEMENT = /(^|[^\p{L}])(tu|toi|ton|ta|tes|t')([^\p{L}]|$)/iu;
const CODES: CodeExplication[] = [
  'rattache',
  'propose',
  'hesite',
  'sans_piece',
  'a_qualifier',
  'neutralisee',
  'ignoree',
];
const QUESTIONS: CodeQuestionImport[] = ['format_date', 'quel_compte', 'profil_a_choisir'];
const V = { objet: 'ce virement', piece: 'V-031', autrePiece: 'V-034', tiers: 'Client Fictif', montant: '600,00 €' };

function tousLesTextes(): string[] {
  return [
    ...ETATS_LIGNE.map(etatLigne),
    ...CODES.flatMap((c) => [explication(c, V), explication(c)]),
    ...['montant', 'delai', 'reference', 'alias', 'inconnu'].map((n) =>
      facteur(n, { montant: '1 200,00 €', jours: 4, reference: 'R-1', alias: 'Fictiva' }),
    ),
    ...QUESTIONS.flatMap((q) => [questionImport(q).question, ...questionImport(q).reponses]),
    alerteReleveManquant('septembre', 'Banque Fictive'),
    alerteReleveManquant('septembre'),
    ...(['verifie', 'ecart', 'impossible'] as const).flatMap((e) => [controleSolde(e), controleSolde(e, '2,00 €')]),
    dejaImporte('04/11/2026'),
    ...[0, 1, 3].map((n) => demandeFacturesManquantes(n, 'Fictiva Telecom', '186,00 €')),
    ...reponsesPretes,
    estimation,
    ribChange('Fournisseur Fictif'),
    ribChange(''),
  ];
}

describe('textes banque', () => {
  it('neuf-etats-ont-un-libelle', () => {
    expect(ETATS_LIGNE).toHaveLength(9);
    const libelles = ETATS_LIGNE.map(etatLigne);
    expect(new Set(libelles).size).toBe(9);
    for (const l of libelles) expect(l.trim().length).toBeGreaterThan(0);
  });
  it('singulier-et-pluriel', () => {
    expect(demandeFacturesManquantes(3, 'Fictiva Telecom', '186,00 €')).toBe(
      'Il manque 3 factures de Fictiva Telecom (186,00 € au total).',
    );
    expect(demandeFacturesManquantes(1, 'Fictiva Telecom', '62,00 €')).toBe(
      'Il manque 1 facture de Fictiva Telecom (62,00 € au total).',
    );
    expect(demandeFacturesManquantes(0, 'Fictiva Telecom', '0,00 €')).toBe(
      'Il ne manque aucune facture de Fictiva Telecom.',
    );
    expect(facteur('delai', { jours: 1 })).toBe('payé 1 jour après la facture');
    expect(facteur('delai', { jours: 4 })).toBe('payé 4 jours après la facture');
    expect(facteur('delai', { jours: 0 })).toBe('payé 0 jour après la facture');
  });
  it('exemple-de-la-spec-rattache', () => {
    const v = { objet: 'ce prélèvement', piece: 'FA-2026-0142', tiers: 'Fictiva Telecom' };
    expect(explication('rattache', v)).toBe('Je rattache ce prélèvement à la facture FA-2026-0142 de Fictiva Telecom.');
    expect(explication('hesite', V)).toBe(
      'Ce virement de 600,00 € de Client Fictif paie-t-il la facture V-031 ou V-034 ?',
    );
    expect(facteur('montant', { montant: '1 200,00 €' })).toBe('1 200,00 € des deux côtés');
    expect(alerteReleveManquant('septembre')).toBe('Il manque le relevé de septembre.');
    expect(dejaImporte('04/11/2026')).toBe('Ce relevé est déjà importé (le 04/11/2026)');
    expect(controleSolde('impossible')).toBe('Je ne peux pas vérifier le solde de ce relevé');
    expect(estimation).toBe('estimation');
  });
  it('question-format-date-deux-reponses', () => {
    expect(questionImport('format_date').reponses).toHaveLength(2);
    expect(questionImport('quel_compte').reponses).toEqual([]);
    expect(reponsesPretes).toHaveLength(4);
  });
  it('vouvoiement', () => {
    for (const t of tousLesTextes()) expect(t).not.toMatch(TUTOIEMENT);
    expect(explication('a_qualifier')).toBe('Indiquez-moi à quoi correspond cette ligne.');
  });
  it('mots-bannis-absents', () => {
    for (const t of tousLesTextes()) for (const m of INTERDITS) expect(t.toLowerCase()).not.toContain(m.toLowerCase());
  });
  it('aucun-calcul', () => {
    expect(facteur('montant', { montant: 'abc' })).toBe('abc des deux côtés');
    expect(demandeFacturesManquantes(2, 'Fictiva', 'beaucoup')).toContain('(beaucoup au total)');
    expect(controleSolde('ecart', '12,34 €')).toContain('12,34 €');
  });
  it('fournisseur-vide-et-guillemets', () => {
    expect(demandeFacturesManquantes(2, '', '10,00 €')).toBe('Il manque 2 factures (10,00 € au total).');
    expect(demandeFacturesManquantes(2, '   ', '10,00 €')).not.toContain('de  ');
    expect(demandeFacturesManquantes(0, '', '0,00 €')).toBe('Il ne manque aucune facture.');
    expect(ribChange('')).toBe(
      'Le RIB de ce fournisseur a changé : confirmez par téléphone au numéro habituel avant de payer.',
    );
    expect(ribChange('Fournisseur Fictif')).toContain('Le RIB de Fournisseur Fictif a changé');
    expect(explication('rattache', { piece: 'F-1', tiers: 'Maison "Fictive"' })).toBe(
      'Je rattache cette ligne à la facture F-1 de Maison "Fictive".',
    );
    expect(explication('propose', { piece: 'F-1', tiers: 'Atelier Fictif' })).toBe(
      "Je vous propose de rattacher cette ligne à la facture F-1 d'Atelier Fictif.",
    );
  });
});
