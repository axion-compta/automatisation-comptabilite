import { describe, expect, it } from 'vitest';
import { ErreurParametre, type ParametreLegal } from '../au-jour.js';
import {
  ErreurPaquet,
  comparerAvecDerniere,
  identifiantParametre,
  regleAuJour,
  rejouer,
  type PaquetParametres,
  type UtilisationParametre,
} from '../paquet.js';

// Valeurs INVENTÉES pour les tests : 2 000 points de base jusqu'au 31/12/2026,
// 2 100 points de base dès le 01/01/2027. Aucune valeur légale réelle.
function ligne(sur: Partial<ParametreLegal> = {}): ParametreLegal {
  return {
    cle: 'fictif.taux_a',
    pays: 'XX',
    valeur: '2000',
    effet_debut: '2026-01-01',
    effet_fin: '2027-01-01',
    statut: 'valide',
    source: 'source fictive',
    date_releve: '2026-01-01',
    ...sur,
  };
}
const ANCIENNE = ligne();
const NOUVELLE = ligne({ valeur: '2100', effet_debut: '2027-01-01', effet_fin: null });
const P1_SIMPLE: PaquetParametres = { version: 'v1', lignes: [ANCIENNE] };
const P2: PaquetParametres = { version: 'v2', lignes: [ANCIENNE, NOUVELLE] };

// Calcul à la main : 100 000 centimes × points de base ÷ 10 000.
const VENTE = 100_000;
const tva = (pdb: number): number => (VENTE * pdb) / 10_000;

function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurPaquet || e instanceof ErreurParametre) return e.code;
    throw e;
  }
  return undefined;
}
describe('regleAuJour', () => {
  it('r1-31-decembre-ancienne-valeur', () => {
    const r = regleAuJour(P2, 'fictif.taux_a', 'XX', '2026-12-31');
    expect(r.ligne.valeur).toBe('2000');
    expect(tva(Number(r.ligne.valeur))).toBe(20_000);
  });
  it('r1-1er-janvier-nouvelle-valeur', () => {
    const r = regleAuJour(P2, 'fictif.taux_a', 'XX', '2027-01-01');
    expect(r.ligne.valeur).toBe('2100');
    expect(tva(Number(r.ligne.valeur))).toBe(21_000);
  });
  it('r1-version-du-paquet-portee', () => {
    const r = regleAuJour(P2, 'fictif.taux_a', 'XX', '2027-06-01');
    expect(r.versionPaquet).toBe('v2');
    expect(r.parametreId).toBe('fictif.taux_a|XX|2027-01-01');
    expect(r.parametreId).toBe(identifiantParametre(NOUVELLE));
  });
  it('statut-non-valide-a-verifier', () => {
    expect(regleAuJour(P2, 'fictif.taux_a', 'XX', '2026-06-01').aVerifier).toBe(false);
    for (const statut of ['non_verifie', 'a_verifier'] as const) {
      const p = { version: 'v3', lignes: [ligne({ statut })] };
      const r = regleAuJour(p, 'fictif.taux_a', 'XX', '2026-06-01');
      expect(r.aVerifier).toBe(true);
      expect(r.ligne.valeur).toBe('2000');
    }
  });
  it('meme-entree-meme-sortie', () => {
    const a = regleAuJour(P2, 'fictif.taux_a', 'XX', '2027-02-02');
    const b = regleAuJour(P2, 'fictif.taux_a', 'XX', '2027-02-02');
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
  it('entrees-invalides-refusees', () => {
    expect(code(() => regleAuJour({ version: 'v0', lignes: [] }, 'fictif.taux_a', 'XX', '2026-06-01'))).toBe(
      'parametre_absent',
    );
    expect(code(() => regleAuJour(P2, '', 'XX', '2026-06-01'))).toBe('cle_vide');
    for (const pays of ['XXX', 'X']) {
      expect(code(() => regleAuJour(P2, 'fictif.taux_a', pays, '2026-06-01'))).toBe('pays_invalide');
    }
    for (const d of ['2026-6-1', '', 'demain', '01/06/2026', '2026-13-01']) {
      expect(code(() => regleAuJour(P2, 'fictif.taux_a', 'XX', d))).toBe('date_invalide');
    }
    expect(code(() => regleAuJour({ version: '', lignes: [ANCIENNE] }, 'fictif.taux_a', 'XX', '2026-06-01'))).toBe(
      'version_vide',
    );
    expect(code(() => regleAuJour(P2, 'fictif.taux_a', 'YY', '2026-06-01'))).toBe('parametre_absent');
  });
});
const UTILISATION: UtilisationParametre = {
  ecritureId: 'ec-1',
  parametreId: 'fictif.taux_a|XX|2026-01-01',
  versionPaquet: 'v1',
  dateReference: '2026-12-31',
};
describe('rejouer', () => {
  it('r2-rejeu-2027-garde-la-version-2026', () => {
    // Écriture validée en 2026 avec v1 ; v2 existe, mais le rejeu reste sur v1.
    const v1: PaquetParametres = { version: 'v1', lignes: [ANCIENNE] };
    const v2: PaquetParametres = { version: 'v2', lignes: [{ ...ANCIENNE, valeur: '2050' }, NOUVELLE] };
    const r = rejouer(UTILISATION, [v1, v2]);
    expect(r.valeur).toBe('2000');
    expect(tva(Number(r.valeur))).toBe(20_000);
  });
  it('version-inconnue-refusee', () => {
    expect(code(() => rejouer({ ...UTILISATION, versionPaquet: 'v9' }, [P1_SIMPLE, P2]))).toBe('version_inconnue');
    expect(code(() => rejouer(UTILISATION, []))).toBe('version_inconnue');
    expect(code(() => rejouer({ ...UTILISATION, versionPaquet: '' }, [P1_SIMPLE]))).toBe('version_vide');
  });
  it('parametre-inconnu-et-versions-en-double-refuses', () => {
    expect(code(() => rejouer({ ...UTILISATION, parametreId: 'autre|XX|2026-01-01' }, [P1_SIMPLE]))).toBe(
      'parametre_inconnu',
    );
    expect(code(() => rejouer(UTILISATION, [P1_SIMPLE, P1_SIMPLE]))).toBe('version_en_double');
  });
});
describe('comparerAvecDerniere', () => {
  it('nouvelle-version-seulement-proposee-en-brouillon', () => {
    const v1: PaquetParametres = { version: 'v1', lignes: [ligne({ effet_fin: null })] };
    const v2: PaquetParametres = { version: 'v2', lignes: [ligne({ effet_fin: null, valeur: '2100' })] };
    const r = comparerAvecDerniere({ ...UTILISATION, dateReference: '2026-06-01' }, [v1, v2]);
    expect(r).toMatchObject({ identique: false, proposition: 'brouillon' });
    if (r.identique) throw new Error('attendu : différent');
    expect(r.ancienne.valeur).toBe('2000');
    expect(r.nouvelle.valeur).toBe('2100');
    // Rien n'est remplacé : le rejeu reste sur la version enregistrée.
    expect(rejouer(UTILISATION, [v1, v2]).valeur).toBe('2000');
  });
  it('identique-quand-la-derniere-ne-change-rien', () => {
    expect(comparerAvecDerniere(UTILISATION, [P1_SIMPLE, { version: 'v2', lignes: [{ ...ANCIENNE }] }])).toEqual({
      identique: true,
    });
    expect(comparerAvecDerniere(UTILISATION, [P1_SIMPLE])).toEqual({ identique: true });
  });
  it('statut-different-n-est-pas-identique', () => {
    const v2 = { version: 'v2', lignes: [ligne({ statut: 'a_verifier' })] };
    expect(comparerAvecDerniere(UTILISATION, [P1_SIMPLE, v2]).identique).toBe(false);
  });
  it('refus-versions-en-double', () => {
    expect(code(() => comparerAvecDerniere(UTILISATION, [P1_SIMPLE, P1_SIMPLE]))).toBe('version_en_double');
    expect(code(() => comparerAvecDerniere(UTILISATION, []))).toBe('version_inconnue');
  });
});
