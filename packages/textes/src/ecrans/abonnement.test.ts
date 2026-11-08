import { describe, expect, it } from 'vitest';
import { abonnement } from './abonnement.js';

const garde = (await import(new URL('../../../../outils/gardes/textes.mjs', import.meta.url).href)) as { MOTS_INTERDITS: string[] };
const ETATS = ['ESSAI', 'DELAI_DE_GRACE', 'LECTURE_SEULE', 'SUSPENDU', 'RESILIE'] as const;
const CODES = ['ETAT_ACCES', 'ACCORD_MANQUANT', 'PALIER_INCONNU', 'PALIER_IDENTIQUE', 'PALIER_NON_SUPERIEUR', 'PAS_DE_REMISE', 'DEJA_ACCUSE', 'EMPREINTE_DIFFERENTE', 'GEL_DEJA_ACTIF', 'GEL_INACTIF', 'VERSION_PERIMEE', 'DOCUMENT_ABSENT'];
const CAUSES = ['periode_essai', 'impaye_signale', 'pause', 'arrete', 'contrat_termine'];

const feuilles = (o: unknown): string[] =>
  typeof o === 'object' && o !== null ? Object.values(o).flatMap(feuilles) : [String(o)];

const toutes = (): string[] => [
  ...feuilles(abonnement),
  ...ETATS.flatMap((e) => [abonnement.banniere[e].prochaineEtape('12 mars')]),
  abonnement.reprise(1), abonnement.reprise(20),
  abonnement.jauge.valeur('72', '100'), abonnement.jauge.estimation('95'), abonnement.jauge.seuilAtteint('80 pour cent'),
];

describe('textes de l’abonnement', () => {
  it('cinq-etats-non-actifs-ont-un-texte', () => {
    expect(Object.keys(abonnement.banniere).sort()).toEqual([...ETATS].sort());
    for (const e of ETATS) {
      const b = abonnement.banniere[e];
      expect(b.titre.trim().length).toBeGreaterThan(0);
      expect(b.consequence.trim().length).toBeGreaterThan(0);
      expect(b.prochaineEtape('12 mars')).toContain('12 mars');
    }
    expect(Object.keys(abonnement.causes).sort()).toEqual([...CAUSES].sort());
    expect(abonnement.liens.portail_abonnement).toBe('Abonnement et factures');
    expect(abonnement.liens.contacter_axion).toBe('Contacter Axion');
  });

  it('aucun-mot-interdit', () => {
    expect(garde.MOTS_INTERDITS.length).toBeGreaterThan(0);
    for (const t of toutes()) {
      for (const m of garde.MOTS_INTERDITS) expect(t.toLowerCase(), t).not.toContain(m.toLowerCase());
    }
  });

  it('aucun-montant', () => {
    for (const t of toutes()) expect(/€|euro|prix|tarif/i.test(t), t).toBe(false);
  });

  it('vouvoiement', () => {
    const tutoiement = /(?<![\p{L}\p{N}_])(tu|ton|ta|tes)(?![\p{L}\p{N}_])/iu;
    expect(tutoiement.test('Tu peux')).toBe(true);
    for (const t of toutes()) {
      expect(tutoiement.test(t), t).toBe(false);
      expect(t, t).not.toContain('!');
    }
  });

  it('reprise-singulier-pluriel-et-cas-limites', () => {
    expect(abonnement.reprise(1)).toBe('1 pièce reçue pendant la pause a été traitée.');
    expect(abonnement.reprise(20)).toBe('20 pièces reçues pendant la pause ont été traitées.');
    for (const n of [0, -1, 1.5, NaN, Infinity, -Infinity]) expect(abonnement.reprise(n), String(n)).toBe('');
  });

  it('tous-les-codes-d-erreur-ont-un-message', () => {
    expect(Object.keys(abonnement.erreurs).sort()).toEqual([...CODES].sort());
    for (const c of CODES) expect(abonnement.erreurs[c as keyof typeof abonnement.erreurs].trim().length, c).toBeGreaterThan(0);
  });

  it('aucun-pourcentage-en-dur', () => {
    for (const t of toutes()) expect(/\d\s*%/.test(t), t).toBe(false);
    expect(abonnement.jauge.seuilAtteint('XX')).toContain('XX');
    expect(abonnement.jauge.valeur('72', '100')).toBe('72 sur 100');
    expect(abonnement.jauge.estimation('95')).toContain('Estimation');
    expect(abonnement.jauge.depasse).toContain('continuent');
  });
});
