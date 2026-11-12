import { createHash } from 'node:crypto';
import type { Ecriture } from '../../ecritures/modele.js';
import { centimes } from '../../argent/index.js';
import { REGLES_EQUILIBRE } from '../controles-equilibre.js';
import { REGLES_STRUCTURE } from '../controles-structure.js';
import { describe, expect, it } from 'vitest';
import { messagesDeclarations } from '../../../../textes/src/documents/declarations.js';
import { preparerFecExercice, type EntreePreparationFec, type ProfilFec } from '../production.js';
import { ATTENDU_DIX_HUIT_MOIS } from './banc/attendus-2.js';
import { ATTENDU_FEC_A } from './banc/attendus-1.js';
import { dixHuitMois } from './banc/jeux-2.js';
import { fecA } from './banc/jeux-1.js';
import { COLONNES_BANC, OPTIONS_BANC, type JeuBanc } from './banc/outils.js';

const profilDe = (jeu: JeuBanc, siren: string | null = '123456782'): ProfilFec => ({
  siren,
  contexte: jeu.contexte,
  colonnes: COLONNES_BANC,
  options: OPTIONS_BANC,
  fichier: { finDeLigne: OPTIONS_BANC.finDeLigne, marqueOrdreOctets: false, finDeLigneFinale: false },
  versionLogiciel: '0.0.0-test',
  versionPaquet: '0.0.0-test',
});
const entreeA = (siren: string | null = '123456782', chaine = { ok: true }): EntreePreparationFec => ({
  exercice: { debut: '2025-04-01', fin: '2026-03-31' },
  ecritures: fecA.ecritures,
  profil: profilDe(fecA, siren),
  chaine,
});
const sha = (octets: Uint8Array): string => createHash('sha256').update(octets).digest('hex');

describe('préparation du FEC d’un exercice', () => {
  it('sans-siren-refus-code', () => {
    for (const siren of [null, '', '12345678', '1234567890', 'abcdefghi']) {
      expect(preparerFecExercice(entreeA(siren)), String(siren)).toEqual({ ok: false, code: 'siren_absent' });
    }
    // Le SIREN passe avant la chaîne.
    expect(preparerFecExercice(entreeA(null, { ok: false }))).toEqual({ ok: false, code: 'siren_absent' });
  });

  it('chaine-rompue-refus-code', () => {
    expect(preparerFecExercice(entreeA('123456782', { ok: false }))).toEqual({ ok: false, code: 'chaine_rompue' });
    expect(preparerFecExercice(entreeA('123456782', { ok: true })).ok).toBe(true);
  });

  it('exercice-18-mois-nom-a-la-cloture', () => {
    const r = preparerFecExercice({ exercice: { debut: '2025-01-01', fin: '2026-06-30' }, ecritures: dixHuitMois.ecritures, profil: profilDe(dixHuitMois), chaine: { ok: true } });
    if (!r.ok) throw new Error('refus inattendu');
    expect(r.nomFichier).toBe('123456782FEC20260630.txt');
    expect(new TextDecoder().decode(r.octets)).toBe(ATTENDU_DIX_HUIT_MOIS);
  });

  it('meme-jeu-meme-empreinte', () => {
    const a = preparerFecExercice(entreeA());
    const b = preparerFecExercice(entreeA());
    if (!a.ok || !b.ok) throw new Error('refus inattendu');
    expect(a.sha256).toBe(b.sha256);
    expect(a.nomFichier).toBe(b.nomFichier);
    expect(a.octets).toEqual(b.octets);
    const autre = preparerFecExercice({ ...entreeA(), ecritures: fecA.ecritures.slice(1) });
    if (!autre.ok) throw new Error('refus inattendu');
    expect(autre.sha256).not.toBe(a.sha256);
  });

  it('empreinte-egale-au-banc-1', () => {
    const r = preparerFecExercice(entreeA());
    if (!r.ok) throw new Error('refus inattendu');
    expect(r.sha256).toBe(sha(new TextEncoder().encode(ATTENDU_FEC_A)));
    expect(r.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('rapport-joint', () => {
    const r = preparerFecExercice(entreeA());
    if (!r.ok) throw new Error('refus inattendu');
    expect(r.rapport.sha256).toBe(r.sha256);
    expect(r.rapport.nombreLignes).toBe(8);
    expect([r.rapport.totalDebit, r.rapport.totalCredit]).toEqual([1900000, 1900000]);
    expect(r.rapport.ecartsParRegle).toEqual([]);
    expect(r.rapport.telechargementAutorise).toBe(true);
    // Exercice déclaré trop court : les écritures sortent des bornes, le rapport le signale.
    const hors = preparerFecExercice({ ...entreeA(), exercice: { debut: '2025-06-01', fin: '2026-03-31' } });
    if (!hors.ok) throw new Error('refus inattendu');
    expect(hors.rapport.ecartsParRegle.map((e) => e.regleId)).toContain('FEC-E03');
    expect(hors.rapport.telechargementAutorise).toBe(false);
    expect(r.rapport.reglesVerifiees).toBe(REGLES_STRUCTURE.length + REGLES_EQUILIBRE.length);
    // Un centime d'écart dans une écriture : déséquilibre signalé, téléchargement refusé.
    const [premiere, ...suite] = fecA.ecritures as Ecriture[];
    const [l0, ...lignes] = premiere!.lignes;
    const decale = [{ ...premiere!, lignes: [{ ...l0!, debit: centimes(l0!.debit + 1) }, ...lignes] }, ...suite];
    const desequilibre = preparerFecExercice({ ...entreeA(), ecritures: decale });
    if (!desequilibre.ok) throw new Error('refus inattendu');
    expect(desequilibre.rapport.ecartsParRegle.map((e) => e.regleId)).toContain('FEC-E01');
    expect(desequilibre.rapport.telechargementAutorise).toBe(false);
    // Une écriture sans numéro : champ obligatoire vide (FEC-S05) signalé, téléchargement refusé.
    const sansNumero = preparerFecExercice({ ...entreeA(), ecritures: fecA.ecritures.map((e) => {
      const copie = { ...e };
      delete copie.numero;
      return copie;
    }) });
    if (!sansNumero.ok) throw new Error('refus inattendu');
    expect(sansNumero.rapport.ecartsParRegle.map((e) => e.regleId)).toContain('FEC-S05');
    expect(sansNumero.rapport.telechargementAutorise).toBe(false);
  });

  it('texte-chaine-rompue-present', () => {
    const t = messagesDeclarations.chaine_rompue;
    expect(t.length).toBeGreaterThan(20);
    expect(t).not.toMatch(/[{}]/);
    expect(t.toLowerCase()).toContain('expert-comptable');
    expect(messagesDeclarations.siren_absent).toBe('Ajoutez votre numéro SIREN pour préparer ce fichier');
  });
});
