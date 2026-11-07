import { describe, expect, it } from 'vitest';
import { ecarter, NON_ECARTABLES, PERMISSION_LEVER_BLOQUANT, verifierAvantAction, type OptionsEcart, type RefusEcart, type ResultatEcart } from '../garde-fou.js';
import type { Gravite, RegleControle, Resultat, TraceControle } from '../moteur.js';
import { decisionParLotPeutLever, reponseEcart, reponseGardeFou } from '../reponses.js';

const trace = (regleId: string, objetId: string, resultat: Resultat): TraceControle => ({
  horodatage: '2026-04-01T08:00:00Z', declencheur: 'continu', regleId, versionRegle: 1, objetType: 'piece', objetId, resultat,
});
const regle = (id: string, gravite: Gravite): RegleControle<number> => ({
  id, version: 1, gravite, bloque: ['validation'], declencheurs: ['continu'], actif: true, evaluer: () => ({ resultat: 'OK' }),
});
const REGLES = [regle('CC-B01', 'B'), regle('CC-B02', 'B'), regle('TVA-C01', 'M')];
const OPTS: OptionsEcart = { motif: 'Motif fictif', permissions: [PERMISSION_LEVER_BLOQUANT], reauthentifie: true, par: 'Alice Exemple', horodatage: '2026-04-02T08:00:00Z' };

describe('reponses du garde-fou', () => {
  it('CT-44', () => {
    const refus = reponseEcart(ecarter(trace('CC-T01', 'p1', 'ALERTE'), OPTS));
    expect(refus).toEqual({ statut: 422, corps: { code: 'controle_non_ecartable' } });
    const ok = reponseEcart(ecarter(trace('TVA-C01', 'p1', 'ALERTE'), OPTS));
    expect(ok.statut).toBe(200);
    expect(ok).toMatchObject({ corps: { trace: { resultat: 'ECARTE', motif: 'Motif fictif', par: 'Alice Exemple' } } });
  });

  it('autorise-sans-corps', () => {
    expect(reponseGardeFou(verifierAvantAction([trace('CC-B01', 'p1', 'OK')], REGLES, 'validation'))).toBeNull();
    expect(reponseGardeFou(verifierAvantAction([], REGLES, 'validation'))).toBeNull();
    expect(reponseGardeFou(verifierAvantAction([trace('TVA-C01', 'p1', 'ALERTE')], REGLES, 'validation'))).toBeNull();
  });

  it('un-b-ouvert-409', () => {
    const r = reponseGardeFou(verifierAvantAction([trace('CC-B01', 'p1', 'ALERTE')], REGLES, 'validation'));
    expect(r).toEqual({
      statut: 409,
      corps: { code: 'controle_bloquant_ouvert', bloquants: [{ regleId: 'CC-B01', objetId: 'p1', messageCode: 'controle.CC-B01' }] },
    });
  });

  it('impossible-compte-ouvert', () => {
    const r = reponseGardeFou(verifierAvantAction([trace('CC-B02', 'p7', 'IMPOSSIBLE')], REGLES, 'validation'));
    expect(r?.statut).toBe(409);
    expect(r?.corps.bloquants).toEqual([{ regleId: 'CC-B02', objetId: 'p7', messageCode: 'controle.CC-B02' }]);
  });

  it('bloquants-tries-sans-doublon', () => {
    const v = { autorise: false, code: 'controle_bloquant_ouvert' as const, bloquants: [
      { regleId: 'CC-B02', objetId: 'p1' }, { regleId: 'CC-B01', objetId: 'p2' }, { regleId: 'CC-B01', objetId: 'p10' }, { regleId: 'CC-B02', objetId: 'p1' }, { regleId: 'CC-B01', objetId: 'p2' },
    ] };
    const attendu = [['CC-B01', 'p10'], ['CC-B01', 'p2'], ['CC-B02', 'p1']];
    const lire = (b: { regleId: string; objetId: string }[]): string[][] => b.map((x) => [x.regleId, x.objetId]);
    expect(lire(reponseGardeFou(v)?.corps.bloquants ?? [])).toEqual(attendu);
    expect(lire(reponseGardeFou({ ...v, bloquants: [...v.bloquants].reverse() })?.corps.bloquants ?? [])).toEqual(attendu);
    expect(reponseGardeFou({ autorise: false, bloquants: [] })?.corps.bloquants).toEqual([]);
  });

  it('chaque-refus-a-son-statut', () => {
    const table: [RefusEcart, number, string][] = [
      ['non_ecartable', 422, 'controle_non_ecartable'],
      ['permission_manquante', 403, 'permission_manquante'],
      ['reauthentification_requise', 401, 'reauthentification_requise'],
      ['motif_obligatoire', 422, 'motif_obligatoire'],
      ['auteur_obligatoire', 422, 'auteur_obligatoire'],
      ['horodatage_anterieur', 422, 'horodatage_anterieur'],
    ];
    for (const [code, statut, corps] of table) {
      const r: ResultatEcart = { ok: false, code };
      expect(reponseEcart(r)).toEqual({ statut, corps: { code: corps } });
    }
    expect(table).toHaveLength(6);
  });

  it('lot-ne-leve-jamais-un-b', () => {
    expect(decisionParLotPeutLever('B')).toBe(false);
    for (const g of ['M', 'm', 'I'] as const) expect(decisionParLotPeutLever(g)).toBe(true);
  });

  it('liste-non-ecartables-inchangee', () => {
    expect([...NON_ECARTABLES].sort()).toEqual(['CC-K01', 'CC-K02', 'CC-K03', 'CC-T01', 'CC-T02']);
    expect(NON_ECARTABLES).toHaveLength(5);
  });
});
