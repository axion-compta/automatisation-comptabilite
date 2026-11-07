import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../../argent/index.js';
import { ErreurControle } from '../commun.js';
import type { ParametreLu } from '../commun.js';
import { regleCCT07, traiterRepas } from '../repas.js';
import type { EntreeRepas, NatureRepas } from '../repas.js';

const c = (n: number): Centimes => n as Centimes;
const CLE = 'tva.test_part';
const param = (valeur: string | null, statut: ParametreLu['statut'] = 'valide'): ParametreLu => ({ cle: CLE, valeur, statut });
const entree = (nature: NatureRepas, tva: number, motif: string | undefined, p: ParametreLu): EntreeRepas => ({
  nature,
  tva: c(tva),
  parametre: p,
  ...(motif === undefined ? {} : { motif }),
});
const codeErreur = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurControle ? e.code : 'autre';
  }
  return undefined;
};
const AV = { code: 'A_VERIFIER', deduit: 0 };

describe('CC-T07 repas, hébergement, transport', () => {
  it('CT-24', () => {
    const avec = entree('repas_affaires', 600, 'invités notés', param('10000'));
    expect(traiterRepas(avec)).toEqual({ code: 'DEDUCTIBLE', deduit: 600 });
    expect(regleCCT07.evaluer(avec)).toEqual({ resultat: 'OK' });
    const sans = entree('repas_affaires', 600, undefined, param('10000'));
    expect(traiterRepas(sans)).toEqual(AV);
    expect(regleCCT07.evaluer(sans)).toEqual({ resultat: 'ALERTE', valeur: 'A_VERIFIER' });
    expect(regleCCT07.id).toBe('CC-T07');
    expect(regleCCT07.version).toBe(1);
    expect(regleCCT07.gravite).toBe('M');
    expect(regleCCT07.bloque).toEqual([]);
    expect(regleCCT07.declencheurs).toEqual(['arrivee', 'continu', 'a_la_demande']);
    expect(regleCCT07.actif).toBe(true);
  });

  it('parametre-a-verifier-rien-deduit', () => {
    for (const statut of ['a_verifier', 'non_verifie', 'absent'] as const) {
      const p = param(statut === 'absent' ? null : '10000', statut);
      expect(traiterRepas(entree('repas_affaires', 600, 'motif', p))).toEqual(AV);
      expect(traiterRepas(entree('hebergement_dirigeant', 600, undefined, p))).toEqual(AV);
    }
    expect(traiterRepas(entree('transport_personnes', 600, undefined, param(null, 'valide')))).toEqual(AV);
    expect(regleCCT07.evaluer(entree('transport_personnes', 600, undefined, param('10000', 'a_verifier')))).toEqual({
      resultat: 'ALERTE',
      valeur: 'A_VERIFIER',
    });
  });

  it('part-nulle-non-deductible', () => {
    expect(traiterRepas(entree('repas_affaires', 600, 'motif', param('0')))).toEqual({ code: 'NON_DEDUCTIBLE_NATURE', deduit: 0 });
    expect(regleCCT07.evaluer(entree('repas_affaires', 600, 'motif', param('0')))).toEqual({ resultat: 'OK' });
  });

  it('part-partielle-arrondie', () => {
    const r = traiterRepas(entree('repas_affaires', 1001, 'motif', param('5000')));
    expect(r).toEqual({ code: 'DEDUCTIBLE', deduit: 500 });
    expect(traiterRepas(entree('repas_affaires', 1000, 'motif', param('5000'))).deduit).toBe(500);
    expect(traiterRepas(entree('repas_affaires', 0, 'motif', param('5000')))).toEqual({ code: 'DEDUCTIBLE', deduit: 0 });
    expect(traiterRepas(entree('repas_affaires', 3, 'motif', param('9999'))).deduit).toBe(2);
  });

  it('motif-blanc-a-verifier', () => {
    for (const motif of ['', ' ', '  \t\n']) {
      expect(traiterRepas(entree('repas_affaires', 600, motif, param('10000')))).toEqual(AV);
    }
    expect(traiterRepas(entree('repas_affaires', 600, ' x ', param('10000'))).code).toBe('DEDUCTIBLE');
  });

  it('part-hors-bornes-exception', () => {
    for (const v of ['-1', '10001', 'NaN', 'Infinity', '1.5', 'abc', '']) {
      const code = codeErreur(() => traiterRepas(entree('repas_affaires', 600, 'motif', param(v))));
      expect(code).toMatch(/parametre_invalide/);
    }
    expect(codeErreur(() => traiterRepas(entree('repas_affaires', 600, 'motif', param('10000'))))).toBeUndefined();
    expect(codeErreur(() => traiterRepas(entree('repas_affaires', 600, 'motif', param('0'))))).toBeUndefined();
    expect(codeErreur(() => traiterRepas(entree('hebergement_dirigeant', 600, undefined, param('10001'))))).toBe('parametre_invalide');
    expect(() => regleCCT07.evaluer(entree('repas_affaires', 600, 'motif', param('-1')))).toThrow(ErreurControle);
    for (const t of [Number.NaN, Number.POSITIVE_INFINITY, 1.5, -1]) {
      expect(codeErreur(() => traiterRepas(entree('repas_affaires', t, 'motif', param('10000'))))).toBe('entree_invalide');
    }
  });

  it('repas-personnel', () => {
    const r = { code: 'NON_DEDUCTIBLE_NATURE', deduit: 0 };
    expect(traiterRepas(entree('repas_personnel', 600, undefined, param('10000')))).toEqual(r);
    expect(traiterRepas(entree('repas_personnel', 600, 'motif', param('10000', 'a_verifier')))).toEqual(r);
    expect(regleCCT07.evaluer(entree('repas_personnel', 600, undefined, param('10000')))).toEqual({ resultat: 'OK' });
    expect(codeErreur(() => traiterRepas(entree('repas_personnel', Number.NaN, undefined, param('10000'))))).toBe('entree_invalide');
  });

  it('transport-et-hebergement', () => {
    for (const nature of ['hebergement_dirigeant', 'transport_personnes'] as const) {
      expect(traiterRepas(entree(nature, 600, undefined, param('10000')))).toEqual({ code: 'DEDUCTIBLE', deduit: 600 });
      expect(traiterRepas(entree(nature, 600, '', param('2500')))).toEqual({ code: 'DEDUCTIBLE', deduit: 150 });
      expect(traiterRepas(entree(nature, 600, undefined, param('0')))).toEqual({ code: 'NON_DEDUCTIBLE_NATURE', deduit: 0 });
    }
  });
});
