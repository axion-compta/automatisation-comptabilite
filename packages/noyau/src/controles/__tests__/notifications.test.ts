import { describe, expect, it } from 'vitest';
import type { Gravite } from '../moteur.js';
import { aOublierApresFermeture, decisionsNotification, type Ouvert } from '../notifications.js';

const o = (regleId: string, objetId: string, gravite: Gravite): Ouvert => ({ regleId, objetId, gravite, ouvertLe: '2026-10-05T08:00:00Z' });
const B1 = o('CC-T02', 'F1', 'B');

describe('notifications des contrôles', () => {
  it('CT-41', () => {
    const ouverts = [o('CC-T02', 'F1', 'B'), o('CC-K05', 'F2', 'M'), o('CC-K06', 'F3', 'M'), o('CC-K07', 'F4', 'm'), o('CC-K08', 'F5', 'm'), o('CC-K09', 'F6', 'm')];
    expect(decisionsNotification(ouverts, [])).toEqual({
      immediates: [{ regleId: 'CC-T02', objetId: 'F1' }],
      resume: { nombre: 2, regles: ['CC-K05', 'CC-K06'] },
    });
  });

  it('b-deja-notifie-silencieux', () => {
    const r = decisionsNotification([B1, o('CC-T05', 'F2', 'B')], [{ regleId: 'CC-T02', objetId: 'F1' }]);
    expect(r.immediates).toEqual([{ regleId: 'CC-T05', objetId: 'F2' }]);
    expect(decisionsNotification([B1], [{ regleId: 'CC-T02', objetId: 'F1' }]).immediates).toEqual([]);
    expect(decisionsNotification([B1], [{ regleId: 'CC-T02', objetId: 'F9' }]).immediates).toHaveLength(1);
    expect(decisionsNotification([B1, B1], []).immediates).toHaveLength(1);
  });

  it('b-rouvert-renotifie', () => {
    const notifies = [{ regleId: 'CC-T02', objetId: 'F1' }, { regleId: 'CC-T05', objetId: 'F2' }];
    const reste = aOublierApresFermeture(notifies, [o('CC-T05', 'F2', 'B')]);
    expect(reste).toEqual([{ regleId: 'CC-T05', objetId: 'F2' }]);
    expect(decisionsNotification([B1], reste).immediates).toEqual([{ regleId: 'CC-T02', objetId: 'F1' }]);
    expect(aOublierApresFermeture(notifies, [o('CC-T02', 'F1', 'M'), o('CC-T05', 'F2', 'B')])).toEqual(reste);
    expect(aOublierApresFermeture(notifies, notifies.map((n) => o(n.regleId, n.objetId, 'B')))).toEqual(notifies);
  });

  it('aucun-m-pas-de-resume', () => {
    expect(decisionsNotification([B1, o('CC-K07', 'F4', 'm'), o('CC-K10', 'F5', 'I')], []).resume).toBeNull();
    expect(decisionsNotification([o('CC-K05', 'F2', 'M')], []).resume).toEqual({ nombre: 1, regles: ['CC-K05'] });
    expect(decisionsNotification([o('CC-K05', 'F2', 'M'), o('CC-K05', 'F3', 'M')], []).resume).toEqual({ nombre: 2, regles: ['CC-K05'] });
  });

  it('mineurs-jamais', () => {
    const r = decisionsNotification([o('CC-K07', 'F4', 'm'), o('CC-K10', 'F5', 'I')], []);
    expect(r).toEqual({ immediates: [], resume: null });
    expect(aOublierApresFermeture([{ regleId: 'CC-K07', objetId: 'F4' }], [o('CC-K07', 'F4', 'm')])).toEqual([]);
  });

  it('ordre-sans-effet', () => {
    const ouverts = [o('CC-T05', 'F2', 'B'), B1, o('CC-K06', 'F3', 'M'), o('CC-K05', 'F2', 'M'), o('CC-T02', 'F0', 'B')];
    const a = decisionsNotification(ouverts, []);
    expect(decisionsNotification([...ouverts].reverse(), [])).toEqual(a);
    expect(a.immediates.map((i) => i.regleId + i.objetId)).toEqual(['CC-T02F0', 'CC-T02F1', 'CC-T05F2']);
    expect(a.resume?.regles).toEqual(['CC-K05', 'CC-K06']);
  });

  it('liste-vide', () => {
    expect(decisionsNotification([], [])).toEqual({ immediates: [], resume: null });
    expect(decisionsNotification([], [{ regleId: 'CC-T02', objetId: 'F1' }])).toEqual({ immediates: [], resume: null });
    expect(aOublierApresFermeture([], [B1])).toEqual([]);
    expect(aOublierApresFermeture([{ regleId: 'CC-T02', objetId: 'F1' }], [])).toEqual([]);
  });
});
