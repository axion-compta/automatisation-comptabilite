import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../../argent/index.js';
import { verifierEcriture } from '../../../ecritures/modele.js';
import type { ParametreLu } from '../../regles/commun.js';
import { proposerEcritureCession } from '../cession.js';
import type { EntreeCession } from '../cession.js';

const c = (n: number): Centimes => n as Centimes;
const TAUX_TEST = '2000';
const param = (statut: ParametreLu['statut'], valeur: string | null = TAUX_TEST): ParametreLu => ({
  cle: 'tva.cession_bien_meuble',
  valeur,
  statut,
});
const ARRONDIS = ['demi-superieur', 'demi-pair', 'inferieur', 'superieur'] as const;
const COMPTES = { creance: '462000', produit: '775000', tvaCollectee: '445710' };
const entree = (surcharge: Partial<EntreeCession> = {}): EntreeCession => ({
  prixHt: c(100000),
  tvaAchatDeduite: true,
  parametre: param('valide'),
  comptes: COMPTES,
  date: '2026-03-15',
  journal: 'OD',
  arrondi: 'demi-superieur',
  ...surcharge,
});
const montants = (e: ReturnType<typeof proposerEcritureCession>) => {
  if (e.etat !== 'propose') throw new Error('attendu : propose');
  return e.ecriture.lignes.map((l) => [l.compte, l.debit, l.credit]);
};

describe('cession d un bien meuble', () => {
  it('CT-31 ecriture', () => {
    const r = proposerEcritureCession(entree());
    expect(montants(r)).toEqual([
      ['462000', 120000, 0],
      ['775000', 0, 100000],
      ['445710', 0, 20000],
    ]);
    if (r.etat === 'propose') {
      expect(r.ecriture.date).toBe('2026-03-15');
      expect(r.ecriture.journal).toBe('OD');
    }
  });

  it('parametre-a-verifier-refuse', () => {
    for (const statut of ['a_verifier', 'non_verifie', 'absent'] as const) {
      expect(proposerEcritureCession(entree({ parametre: param(statut) }))).toEqual({ etat: 'refuse', code: 'parametre_non_valide' });
    }
    expect(proposerEcritureCession(entree({ parametre: param('valide', null) }))).toEqual({ etat: 'refuse', code: 'parametre_non_valide' });
    // le paramètre passe avant l'historique
    expect(proposerEcritureCession(entree({ parametre: param('a_verifier'), tvaAchatDeduite: null }))).toEqual({ etat: 'refuse', code: 'parametre_non_valide' });
    // un taux valide mais nul ou négatif donne une écriture invalide : verifierEcriture la refuse
    expect(() => proposerEcritureCession(entree({ parametre: param('valide', '0') }))).toThrowError(expect.objectContaining({ code: 'ligne_nulle' }));
    expect(() => proposerEcritureCession(entree({ parametre: param('valide', '-2000') }))).toThrowError(expect.objectContaining({ code: 'montant_negatif' }));
  });

  it('historique-absent-question', () => {
    expect(proposerEcritureCession(entree({ tvaAchatDeduite: null }))).toEqual({ etat: 'refuse', code: 'historique_absent' });
  });

  it('tva-achat-non-deduite', () => {
    expect(proposerEcritureCession(entree({ tvaAchatDeduite: false }))).toEqual({ etat: 'refuse', code: 'sans_tva' });
  });

  it('ecriture-equilibree-1000-cas', () => {
    let graine = 12345;
    const suivant = (): number => {
      graine = (graine * 1103515245 + 12345) % 2147483648;
      return graine;
    };
    for (let i = 0; i < 1000; i++) {
      const prix = (suivant() % 10000000) + 1;
      const r = proposerEcritureCession(entree({ prixHt: c(prix), arrondi: ARRONDIS[i % ARRONDIS.length] ?? 'inferieur' }));
      if (r.etat !== 'propose') throw new Error('attendu : propose');
      expect(verifierEcriture(r.ecriture).equilibree).toBe(true);
      expect(r.ecriture.lignes[1]?.credit).toBe(prix);
    }
  });

  it('jamais-validee', () => {
    const r = proposerEcritureCession(entree());
    expect(r.etat === 'propose' && r.ecriture.statut).toBe('propose');
  });

  it('prix-invalide', () => {
    for (const prix of [Number.NaN, 0, -1, 1.5, Number.POSITIVE_INFINITY]) {
      expect(() => proposerEcritureCession(entree({ prixHt: prix as Centimes }))).toThrowError(expect.objectContaining({ code: 'entree_invalide' }));
    }
    // le prix invalide est refusé même si le paramètre ne l'est pas
    expect(() => proposerEcritureCession(entree({ prixHt: c(0), parametre: param('a_verifier') }))).toThrow();
  });
});
