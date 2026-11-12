import { describe, expect, it } from 'vitest';
import {
  accepterMention,
  ajouterLigne,
  ajouterVersionRapport,
  ErreurJournal,
  ouvrirJournal,
  rejouer,
  type ParametresJournal,
} from '../journal.js';

const H1 = 'a'.repeat(64);
const H2 = 'b'.repeat(64);
const H3 = 'c'.repeat(64);
const params: ParametresJournal = {
  versionRegles: 'regles-3',
  versionConsignes: 'consignes-2',
  modeles: ['modele-lecture-1', 'modele-controle-4'],
  versionParametres: 'param-7',
};
const refus = (f: () => unknown, code: string): void => {
  try {
    f();
  } catch (e) {
    expect((e as { code?: string }).code).toBe(code);
    return;
  }
  throw new Error('refus attendu : ' + code);
};

describe('journal de reprise', () => {
  it('journal-porte-les-versions', () => {
    const j = ouvrirJournal(params);
    expect(j.versions).toEqual(params);
    expect(j.lignes).toEqual([]);
    // copie défensive : modifier l'entrée ne change pas le journal
    const modeles = ['m1'];
    const j2 = ouvrirJournal({ ...params, modeles });
    modeles.push('m2');
    expect(j2.versions.modeles).toEqual(['m1']);
    // ajout seul : l'ancien journal n'est pas modifié
    const j3 = ajouterLigne(j, { etape: 'lecture', entreeEmpreinte: H1, sortieEmpreinte: H2 });
    expect(j.lignes).toHaveLength(0);
    expect(j3.lignes).toEqual([{ etape: 'lecture', entreeEmpreinte: H1, sortieEmpreinte: H2 }]);
    expect(j3.versions).toEqual(params);
    refus(() => ajouterLigne(j, { etape: ' ', entreeEmpreinte: H1, sortieEmpreinte: H2 }), 'ligne_invalide');
    for (const mauvaise of ['zz', H2.toUpperCase(), 'a'.repeat(63)]) {
      refus(() => ajouterLigne(j, { etape: 'x', entreeEmpreinte: H1, sortieEmpreinte: mauvaise }), 'ligne_invalide');
    }
  });

  it('rapport-versionne-sans-ecrasement', () => {
    let j = ouvrirJournal(params);
    expect(j.versionsRapport).toEqual([]);
    j = ajouterVersionRapport(j, { empreinte: H1, produitLe: '2026-11-01T10:00:00Z' });
    j = ajouterVersionRapport(j, { empreinte: H2, produitLe: '2026-11-02T10:00:00Z' });
    expect(j.versionsRapport.map((v) => v.version)).toEqual([1, 2]);
    expect(j.versionsRapport[0]).toEqual({ version: 1, empreinte: H1, produitLe: '2026-11-01T10:00:00Z' });
    // même contenu redéposé : nouvelle version, jamais d'écrasement
    j = ajouterVersionRapport(j, { empreinte: H1, produitLe: '2026-11-03T10:00:00Z' });
    expect(j.versionsRapport.map((v) => v.version)).toEqual([1, 2, 3]);
    expect(j.versionsRapport[0]?.empreinte).toBe(H1);
    for (const mauvais of [{ empreinte: 'court' }, { produitLe: 'hier' }]) {
      refus(() => ajouterVersionRapport(j, { empreinte: H1, produitLe: '2026-11-03T10:00:00Z', ...mauvais }), 'rapport_invalide');
    }
  });

  it('mentions-acceptees-tracees', () => {
    let j = ouvrirJournal(params);
    j = accepterMention(j, { mention: 'Pièce illisible, reprise à la main', par: 'Camille Test', horodatage: '2026-11-05T09:30:00Z' });
    j = accepterMention(j, { mention: 'Écart de pied accepté', par: 'Camille Test', horodatage: '2026-11-05T09:31:00Z' });
    expect(j.mentionsAcceptees).toHaveLength(2);
    expect(j.mentionsAcceptees[1]).toEqual({ mention: 'Écart de pied accepté', par: 'Camille Test', horodatage: '2026-11-05T09:31:00Z' });
    const ok = { mention: 'm', par: 'p', horodatage: '2026-11-05T09:30:00Z' };
    for (const mauvais of [{ mention: '' }, { par: '  ' }, { horodatage: 'pas une date' }, { horodatage: '2026-13-45T00:00:00Z' }, { horodatage: '2026-02-30T00:00:00Z' }]) {
      refus(() => accepterMention(j, { ...ok, ...mauvais }), 'mention_invalide');
    }
  });

  it('rejeu-a-l-identique', () => {
    let j = ouvrirJournal(params);
    j = ajouterLigne(j, { etape: 'lecture', entreeEmpreinte: H1, sortieEmpreinte: H2 });
    j = ajouterLigne(j, { etape: 'controle', entreeEmpreinte: H2, sortieEmpreinte: H3 });
    const appels: string[] = [];
    expect(rejouer(j, (etape, entree) => (appels.push(etape + ':' + entree), etape === 'lecture' ? H2 : H3))).toBe(true);
    expect(appels).toEqual(['lecture:' + H1, 'controle:' + H2]);
    // une seule empreinte différente (dernière ligne, puis première) rend le rejeu faux
    expect(rejouer(j, (etape) => (etape === 'lecture' ? H2 : H1))).toBe(false);
    expect(rejouer(j, (etape) => (etape === 'lecture' ? H1 : H3))).toBe(false);
    // journal vide : rien à contredire
    expect(rejouer(ouvrirJournal(params), () => H1)).toBe(true);
  });

  it('version-manquante-refusee', () => {
    for (const champ of ['versionRegles', 'versionConsignes', 'versionParametres'] as const) {
      for (const valeur of ['', '   ', undefined, 3]) {
        refus(() => ouvrirJournal({ ...params, [champ]: valeur } as never), 'version_manquante');
      }
    }
    for (const modeles of [[], ['ok', ' '], undefined, 'modele']) {
      refus(() => ouvrirJournal({ ...params, modeles } as never), 'version_manquante');
    }
    expect(() => ouvrirJournal({ ...params, versionRegles: '' })).toThrow(ErreurJournal);
  });
});
