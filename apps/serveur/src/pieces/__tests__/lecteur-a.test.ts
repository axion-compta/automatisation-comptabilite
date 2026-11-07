import { describe, expect, it } from 'vitest';
import { ErreurPiece } from '../../../../../packages/noyau/src/pieces/types.js';
import { lireAvecModele, type DemandeLecteurA, type EntreeModele, type ModeleTexte } from '../lecteur-a.js';
import { sortieLecteurASchema, VERSION_SCHEMA } from '../schema-lecteur-a.js';

type Reponse = { sortie: string; coutMicroCentimes: number } | Error;

function faux(reponses: Reponse[], estimation = 0): ModeleTexte & { recus: EntreeModele[] } {
  const recus: EntreeModele[] = [];
  return {
    recus,
    estimer: () => estimation,
    completer: async (entree) => {
      recus.push(entree);
      const r = reponses[recus.length - 1];
      if (r === undefined || r instanceof Error) throw r ?? new Error('plus de réponse');
      return r;
    },
  };
}

const champ = { nom: 'numero', valeur: 'F-001', confiance_modele: 80, citation: 'Facture F-001' };
const valide = (extra: object = {}): string => JSON.stringify({ type_piece: 'facture', langue: 'fr', champs: [champ], ...extra });
const ok = (cout = 10): Reponse => ({ sortie: valide(), coutMicroCentimes: cout });
const mauvais = (cout = 10): Reponse => ({ sortie: 'pas du json', coutMicroCentimes: cout });
const demande = (extra: Partial<DemandeLecteurA> = {}): DemandeLecteurA => ({
  texteTransmissible: 'Facture F-001 Total 12,00',
  jetonsOpaques: {},
  depenseMicroCentimes: 0,
  plafondMicroCentimes: 1000,
  versionInvite: 7,
  ...extra,
});

describe('lireAvecModele', () => {
  it('sortie-valide-champs-lus', async () => {
    const m = faux([ok(25)]);
    const r = await lireAvecModele(demande({ depenseMicroCentimes: 5 }), m);
    expect(r).toEqual({
      champs: [{ nom: 'numero', valeur: 'F-001', source: 'modele', lecteur: 'A', citation: 'Facture F-001' }],
      typePropose: 'facture',
      depense: 30,
      version: { schema: VERSION_SCHEMA, invite: 7 },
    });
    expect(m.recus).toHaveLength(1);
    expect(m.recus[0]?.texte).toBe('Facture F-001 Total 12,00');
    expect(m.recus[0]?.versionInvite).toBe(7);
    expect(typeof (r as { champs: { valeur: unknown }[] }).champs[0]?.valeur).toBe('string');
  });

  it('sortie-hors-schema-seconde-tentative-ok', async () => {
    const m = faux([{ sortie: JSON.stringify({ type_piece: 'facture' }), coutMicroCentimes: 10 }, ok(20)]);
    const r = await lireAvecModele(demande(), m);
    expect(m.recus).toHaveLength(2);
    expect(r).toMatchObject({ typePropose: 'facture', depense: 30 });
  });

  it('deux-echecs-sortie-invalide', async () => {
    const m = faux([mauvais(10), { sortie: valide({ langue: 'de' }), coutMicroCentimes: 15 }, ok()]);
    expect(await lireAvecModele(demande(), m)).toEqual({ aVerifier: 'sortie_invalide', depense: 25 });
    expect(m.recus).toHaveLength(2);
  });

  it('champ-en-trop-refuse-par-strict', async () => {
    const m = faux([{ sortie: valide({ calcul: '1' }), coutMicroCentimes: 1 }, { sortie: valide({ champs: [{ ...champ, ttc: 5 }] }), coutMicroCentimes: 1 }]);
    expect(await lireAvecModele(demande(), m)).toEqual({ aVerifier: 'sortie_invalide', depense: 2 });
    const base = { type_piece: 'facture', langue: 'fr', champs: [champ] };
    expect(sortieLecteurASchema.safeParse(base).success).toBe(true);
    expect(sortieLecteurASchema.safeParse({ ...base, en_trop: 1 }).success).toBe(false);
    const limites = [
      { ...base, type_piece: 'autre_type' },
      { ...base, champs: [{ ...champ, confiance_modele: 101 }] },
      { ...base, champs: [{ ...champ, confiance_modele: -1 }] },
      { ...base, champs: [{ ...champ, confiance_modele: 50.5 }] },
      { ...base, champs: [{ ...champ, citation: '' }] },
      { ...base, champs: [{ ...champ, citation: 'x'.repeat(301) }] },
      { ...base, champs: Array.from({ length: 101 }, () => champ) },
    ];
    for (const l of limites) expect(sortieLecteurASchema.safeParse(l).success).toBe(false);
    const bornes = [
      { ...base, champs: [{ ...champ, confiance_modele: 0, citation: 'x' }] },
      { ...base, champs: [{ ...champ, confiance_modele: 100, citation: 'x'.repeat(300) }] },
      { ...base, champs: Array.from({ length: 100 }, () => champ) },
    ];
    for (const b of bornes) expect(sortieLecteurASchema.safeParse(b).success).toBe(true);
  });

  it('plafond-atteint-avant-appel-zero-appel', async () => {
    const m = faux([ok()], 50);
    const r = await lireAvecModele(demande({ depenseMicroCentimes: 960, plafondMicroCentimes: 1000 }), m);
    expect(r).toEqual({ aVerifier: 'plafond_cout', depense: 960 });
    expect(m.recus).toHaveLength(0);
  });

  it('plafond-atteint-entre-deux-tentatives', async () => {
    const m = faux([mauvais(90), ok()], 20);
    const r = await lireAvecModele(demande({ depenseMicroCentimes: 0, plafondMicroCentimes: 100 }), m);
    expect(r).toEqual({ aVerifier: 'plafond_cout', depense: 90 });
    expect(m.recus).toHaveLength(1);
    const arret = faux([mauvais(100), ok()], 0);
    expect(await lireAvecModele(demande({ plafondMicroCentimes: 100 }), arret)).toEqual({ aVerifier: 'plafond_cout', depense: 100 });
    expect(arret.recus).toHaveLength(1);
  });

  it('jetons-opaques-remplaces', async () => {
    const m = faux([ok()]);
    const texte = 'Société Lumière-Test (SIREN 000000001) facture la société Lumière-Test Sud ; Lumière-Test paie.';
    await lireAvecModele(
      demande({ texteTransmissible: texte, jetonsOpaques: { 'Lumière-Test': 'T1', 'Lumière-Test Sud': 'T2', '000000001': 'T3', '': 'T9' } }),
      m,
    );
    expect(m.recus[0]?.texte).toBe('Société T1 (SIREN T3) facture la société T2 ; T1 paie.');
    expect(m.recus[0]?.texte).not.toContain('Lumière');
  });

  it('texte-nul-appel-interdit', async () => {
    const m = faux([ok()]);
    const echec = lireAvecModele(demande({ texteTransmissible: null }), m);
    await expect(echec).rejects.toBeInstanceOf(ErreurPiece);
    await expect(echec).rejects.toMatchObject({ code: 'appel_interdit' });
    expect(m.recus).toHaveLength(0);
  });

  it('modele-en-panne-ia-indisponible', async () => {
    const panne = faux([new Error('hors service')]);
    expect(await lireAvecModele(demande({ depenseMicroCentimes: 4 }), panne)).toEqual({ erreur: 'ia_indisponible', depense: 4 });
    const apres = faux([mauvais(10), new Error('hors service')]);
    expect(await lireAvecModele(demande(), apres)).toEqual({ erreur: 'ia_indisponible', depense: 10 });
    expect(apres.recus).toHaveLength(2);
  });

  it('cout-invalide-refuse', async () => {
    const m = faux([{ sortie: valide(), coutMicroCentimes: Number.NaN }]);
    await expect(lireAvecModele(demande(), m)).rejects.toBeInstanceOf(ErreurPiece);
  });
});
