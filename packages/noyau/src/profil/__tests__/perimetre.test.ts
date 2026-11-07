import { describe, expect, it } from 'vitest';
import { ErreurProfil } from '../types.js';
import { bloqueALaDate, verifierPerimetre } from '../perimetre.js';
import type { ReponsesPerimetre } from '../perimetre.js';

const REGLES = { formesHorsPerimetre: ['FORME_X'], prefixesPostauxExclus: ['99', '998'] };
const VIDES = { formesHorsPerimetre: [], prefixesPostauxExclus: [] };
const OK: ReponsesPerimetre = {
  formeLue: 'FORME_Y',
  cotee: false,
  commissaireAuxComptes: 'non',
  paie: false,
  plusieursPays: false,
  codePostalSiege: '12345',
};
const avec = (p: Partial<ReponsesPerimetre>): ReponsesPerimetre => ({ ...OK, ...p });
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurProfil ? e.code : 'autre';
  }
  return undefined;
};

describe('perimetre', () => {
  it('cas de base : rien ne bloque', () => {
    expect(verifierPerimetre(OK, REGLES)).toEqual({ bloque: false, motifs: [], questionsAvantCloture: [], aPoser: [] });
  });

  it('commissaire-oui-bloque-p15', () => {
    const r = verifierPerimetre(avec({ commissaireAuxComptes: 'oui' }), REGLES);
    expect(r.bloque).toBe(true);
    expect(r.motifs).toEqual(['commissaire_aux_comptes']);
  });

  it('commissaire-je-ne-sais-pas-question-p15', () => {
    const r = verifierPerimetre(avec({ commissaireAuxComptes: 'je_ne_sais_pas' }), REGLES);
    expect(r.bloque).toBe(false);
    expect(r.motifs).toEqual([]);
    expect(r.questionsAvantCloture).toEqual(['commissaire_aux_comptes']);
  });

  it('siege-exclu-p16', () => {
    for (const cp of ['99123', '99812', '99000']) {
      const r = verifierPerimetre(avec({ codePostalSiege: cp }), REGLES);
      expect(r.motifs).toEqual(['siege_exclu']);
      expect(r.bloque).toBe(true);
    }
    expect(verifierPerimetre(avec({ codePostalSiege: '98999' }), REGLES).bloque).toBe(false);
  });

  it('forme-hors-perimetre-p17', () => {
    const r = verifierPerimetre(avec({ formeLue: 'FORME_X' }), REGLES);
    expect(r.motifs).toEqual(['forme_hors_perimetre']);
    expect(r.bloque).toBe(true);
    expect(verifierPerimetre(avec({ formeLue: 'FORME_XX' }), REGLES).bloque).toBe(false);
  });

  it('plusieurs-motifs-tous-rendus', () => {
    const r = verifierPerimetre(
      { formeLue: 'FORME_X', cotee: true, commissaireAuxComptes: 'oui', paie: true, plusieursPays: true, codePostalSiege: '99100' },
      REGLES,
    );
    expect(r.motifs).toEqual(['forme_hors_perimetre', 'societe_cotee', 'commissaire_aux_comptes', 'paie', 'plusieurs_pays', 'siege_exclu']);
    const inverse = verifierPerimetre(
      { plusieursPays: true, paie: true, commissaireAuxComptes: 'oui', cotee: true, formeLue: 'FORME_X', codePostalSiege: '99100' },
      REGLES,
    );
    expect(inverse.motifs).toEqual(r.motifs);
  });

  it('null-jamais-non', () => {
    const r = verifierPerimetre(avec({ paie: null }), REGLES);
    expect(r.bloque).toBe(false);
    expect(r.motifs).toEqual([]);
    expect(r.aPoser).toEqual(['paie']);
    const tous = verifierPerimetre(avec({ cotee: null, plusieursPays: null, codePostalSiege: null, paie: null }), REGLES);
    expect(tous.aPoser).toEqual(['cotee', 'paie', 'plusieurs_pays', 'code_postal_siege']);
    expect(tous.bloque).toBe(false);
  });

  it('code-postal-invalide', () => {
    for (const cp of ['1234', '12a45', '', ' 12345', '12345 ', '123456', '1 345', '१२३४५']) {
      const r = verifierPerimetre(avec({ codePostalSiege: cp }), VIDES);
      expect(r.motifs).toEqual(['code_postal_invalide']);
      expect(r.bloque).toBe(true);
    }
  });

  it('listes-vides-rien-d-exclu', () => {
    const r = verifierPerimetre(avec({ formeLue: 'FORME_X', codePostalSiege: '99100' }), VIDES);
    expect(r.bloque).toBe(false);
    expect(r.motifs).toEqual([]);
  });

  it('prefixes de longueurs differentes', () => {
    const seul = { formesHorsPerimetre: [], prefixesPostauxExclus: ['998'] };
    expect(verifierPerimetre(avec({ codePostalSiege: '99100' }), seul).bloque).toBe(false);
    expect(verifierPerimetre(avec({ codePostalSiege: '99800' }), seul).bloque).toBe(true);
    const court = { formesHorsPerimetre: [], prefixesPostauxExclus: ['99'] };
    expect(verifierPerimetre(avec({ codePostalSiege: '99800' }), court).bloque).toBe(true);
  });

  it('prefixe de liste invalide refuse', () => {
    expect(code(() => verifierPerimetre(OK, { formesHorsPerimetre: [], prefixesPostauxExclus: [''] }))).toBe('prefixe_invalide');
  });

  it('transfert-en-cours-d-annee', () => {
    const hist = [
      { effetDebut: '2026-06-15', codePostal: '99100' },
      { effetDebut: '2020-01-01', codePostal: '12345' },
    ];
    expect(bloqueALaDate(hist, '2026-06-14', REGLES)).toBe(false);
    expect(bloqueALaDate(hist, '2026-06-15', REGLES)).toBe(true);
    expect(bloqueALaDate(hist, '2026-06-16', REGLES)).toBe(true);
    expect(bloqueALaDate(hist, '2019-12-31', REGLES)).toBe(false);
    expect(bloqueALaDate([], '2026-06-16', REGLES)).toBe(false);
    expect(bloqueALaDate([{ effetDebut: '2026-01-01', codePostal: '12a45' }], '2026-02-01', REGLES)).toBe(true);
  });

  it('historique : dates invalides refusees', () => {
    expect(code(() => bloqueALaDate([{ effetDebut: '2026-02-30', codePostal: '12345' }], '2026-03-01', REGLES))).toBe('date_invalide');
    expect(code(() => bloqueALaDate([], '', REGLES))).toBe('date_invalide');
  });
});
