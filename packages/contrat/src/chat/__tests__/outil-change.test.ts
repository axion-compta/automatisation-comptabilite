import { describe, expect, it } from 'vitest';
import { registre } from '../../actions/index.js';
import { ExplicationEcart } from '../../domaines/change.js';
import { ROUTES_A_GESTE, VERBES_SENSIBLES } from '../../gestes-routes.js';
import { genererOpenapi } from '../../openapi.js';
import { ROUTES_EXTERNES } from '../../routes-externes.js';
import { OUTILS, ROUTES_OUTILS, schemaSortie, validerEntree } from '../outils.js';

const NOM = 'change.expliquer_ecart';
type Ops = Record<string, { operationId?: string }>;
const chemins = () => (genererOpenapi() as { paths: Record<string, Ops> }).paths;
const trouver = (operationId: string) =>
  Object.entries(chemins()).flatMap(([chemin, ops]) =>
    Object.entries(ops).filter(([, op]) => op.operationId === operationId).map(([methode]) => ({ chemin, methode })),
  );
const taux = { tauxE8: 92000000, source: 'taux de test, source fictive', date: '2026-10-07' };
const valide = { sens: 'perte', montantCentimes: 1800, devise: 'XXA', taux: [taux, taux], phrase: 'Écart fictif.' };

describe('outil de chat : change.expliquer_ecart', () => {
  it('outil-declare-en-lecture', () => {
    const entrees = OUTILS.filter((o) => o.nom === NOM);
    expect(entrees).toHaveLength(1);
    const o = entrees[0];
    expect(o?.niveau).toBe('L');
    expect(o?.permission).toBe('compta-lire');
    expect(o?.exigences).toContain('V3-MOT-097');
    const action = registre.actions.find((a) => a.outil === o?.outil_registre);
    expect(action).toBeDefined();
    expect(registre.interrupteurs[action?.interrupteur ?? '']?.actif_par_defaut).toBe(false);
  });

  it('meme-route-que-l-ecran', () => {
    const operationId = ROUTES_OUTILS[NOM];
    expect(operationId).toBeTypeOf('string');
    const trouvees = trouver(operationId ?? '');
    expect(trouvees).toHaveLength(1);
    expect(trouvees[0]?.methode).toBe('get');
    expect(trouvees[0]?.chemin.endsWith('/explication')).toBe(true);
  });

  it('zero-ecriture', () => {
    expect(Object.keys(ROUTES_OUTILS).length).toBeGreaterThan(0);
    for (const [nom, operationId] of Object.entries(ROUTES_OUTILS)) {
      const t = trouver(operationId);
      expect(t.length).toBeGreaterThan(0);
      for (const { chemin } of t) {
        const methodes = Object.keys(chemins()[chemin] ?? {});
        for (const m of ['post', 'put', 'patch', 'delete']) expect(methodes).not.toContain(m);
      }
      expect(OUTILS.find((o) => o.nom === nom)?.niveau).toBe('L');
    }
  });

  it('zero-geste', () => {
    const operationId = ROUTES_OUTILS[NOM] ?? '';
    expect(operationId).not.toBe('');
    expect(Object.keys(ROUTES_A_GESTE)).not.toContain(operationId);
    expect(Object.keys(ROUTES_EXTERNES)).not.toContain(operationId);
    for (const v of VERBES_SENSIBLES) expect(operationId.toLowerCase().startsWith(v)).toBe(false);
  });

  it('outil-sortie-meme-schema-que-la-route', () => {
    const s = schemaSortie(NOM);
    expect(s).toBe(ExplicationEcart);
    expect(s?.safeParse(valide).success).toBe(true);
    for (const m of [1.5, Number.NaN, Number.POSITIVE_INFINITY, -1]) {
      expect(s?.safeParse({ ...valide, montantCentimes: m }).success).toBe(false);
    }
    expect(s?.safeParse({ ...valide, taux: [taux, taux, taux] }).success).toBe(false);
  });

  it('entree-ecart-id-stricte', () => {
    const refus = { ok: false, code: 'parametre_invalide' };
    for (const brut of [{}, { ecart_id: '' }, { ecart_id: 5 }, { ecart_id: null }, { ecart_id: 'ec_a1', societe_id: 'x' }]) {
      expect(validerEntree(NOM, brut)).toEqual(refus);
    }
    expect(validerEntree(NOM, { ecart_id: 'ec_a1' }).ok).toBe(true);
  });
});
