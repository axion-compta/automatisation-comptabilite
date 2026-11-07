import { describe, expect, it } from 'vitest';
import { COLONNES_REGISTRE, modelePrerempli, registreCsv, validerLigne, type LigneRegistre } from '../registre.js';

const garde = (await import(new URL('../../../../../outils/gardes/textes.mjs', import.meta.url).href)) as {
  analyserMotsInterdits: (texte: string, nom: string) => string[];
};
const DATE = '2026-03-01';
const ligne = (o: Partial<LigneRegistre> = {}): LigneRegistre => ({ ...modelePrerempli(DATE)[0]!, ...o });
const codes = (l: LigneRegistre): string[] => {
  const r = validerLigne(l);
  return r.ok ? [] : r.codes;
};

describe('registre', () => {
  it('modele-huit-traitements-valides', () => {
    const m = modelePrerempli(DATE);
    expect(m).toHaveLength(8);
    expect(new Set(m.map((l) => l.traitement)).size).toBe(8);
    for (const l of m) {
      expect(validerLigne(l)).toEqual({ ok: true });
      expect(l.responsable).toBe('la société');
      expect(l.base_legale_proposee.endsWith(' (à vérifier)')).toBe(true);
      expect(l.source).toBe('spec 08 fichier 06');
      expect(l.date_releve).toBe(DATE);
    }
    expect(m.map((l) => l.traitement).join(' ')).not.toMatch(/voix/i);
  });

  it('colonne-manquante-refusee', () => {
    for (const c of COLONNES_REGISTRE.filter((x) => x !== 'controle_croise')) {
      expect(codes(ligne({ [c]: '' }))).toContain('colonne_manquante');
      expect(codes(ligne({ [c]: '   ' }))).toContain('colonne_manquante');
    }
    expect(codes(ligne({ controle_croise: '' }))).toEqual([]);
  });

  it('duree-en-chiffres-refusee', () => {
    for (const duree of ['10 ans', '6', 'parametre:', 'param:x', 'parametre:a b']) {
      expect(codes(ligne({ duree }))).toEqual(['valeur_interdite']);
    }
    expect(codes(ligne({ duree: 'parametre:duree_pieces' }))).toEqual([]);
  });

  it('transfert-mal-forme-refuse', () => {
    for (const transfert_hors_ue of ['oui', 'oui:', 'Non', 'peut-etre', 'non:x']) {
      expect(codes(ligne({ transfert_hors_ue }))).toEqual(['valeur_interdite']);
    }
    expect(codes(ligne({ transfert_hors_ue: 'oui:clauses types' }))).toEqual([]);
    expect(codes(ligne({ transfert_hors_ue: 'non' }))).toEqual([]);
  });

  it('date-releve-invalide-refusee', () => {
    for (const date_releve of ['2026-02-30', '01/03/2026', '2026-13-01']) {
      expect(codes(ligne({ date_releve }))).toEqual(['date_invalide']);
    }
  });

  it('approuvee-sans-controle-croise-refusee', () => {
    expect(codes(ligne({ approuvee: true, controle_croise: '' }))).toEqual(['colonne_manquante']);
    expect(codes(ligne({ approuvee: true, controle_croise: ' ' }))).toEqual(['colonne_manquante']);
    expect(codes(ligne({ approuvee: true, controle_croise: 'revu par Will' }))).toEqual([]);
    expect(codes(ligne({ approuvee: false, controle_croise: '' }))).toEqual([]);
  });

  it('csv-en-tete-et-ordre', () => {
    expect(COLONNES_REGISTRE).toHaveLength(13);
    const lignes = modelePrerempli(DATE);
    const lu = registreCsv(lignes).replace('﻿', '').split('\r\n');
    expect(lu[0]).toBe(COLONNES_REGISTRE.map((c) => `"${c}"`).join(';'));
    expect(lu).toHaveLength(lignes.length + 2);
    expect(lu[1]!.startsWith(`"${lignes[0]!.traitement}";"la société"`)).toBe(true);
    expect(registreCsv([]).replace('﻿', '')).toBe(lu[0] + '\r\n');
  });

  it('aucun-mot-interdit', () => {
    expect(garde.analyserMotsInterdits(registreCsv(modelePrerempli(DATE)), 'registre.csv')).toEqual([]);
  });
});
