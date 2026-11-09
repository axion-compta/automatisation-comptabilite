import { describe, expect, it } from 'vitest';
import type { Cible } from './suite-contrat.js';

const AL = '/exercices/EX2026/alertes';
type Alerte = { id: string; regle: string; entreeMenu: string; etat: string; version: number };
const cle = (n: string) => ({ 'idempotency-key': 'cle-fictive-' + n });

/** Suite commune « alertes : reporter, ignorer, annuler » : jouée sur le vrai serveur et sur le faux (sans l'horloge). */
export function suiteAlertesActions(nom: string, cible: Cible): void {
  describe('suite alertes actions commune : ' + nom, () => {
    const avec = async (f: (c: Awaited<ReturnType<Cible>>, alerte: (regle: string) => Promise<Alerte>) => Promise<void>) => {
      const c = await cible();
      try {
        const alerte = async (regle: string) => ((await c.appeler('GET', AL)).json as { body: Alerte[] }).body.find((a) => a.regle === regle) as Alerte;
        await f(c, alerte);
      } finally {
        await c.fermer();
      }
    };
    const agir = (c: Awaited<ReturnType<Cible>>, id: string, action: string, corps: unknown, n = '1') => c.appeler('POST', `${AL}/${id}/${action}`, cle(n), corps);

    it('reporter-trois-jours', () =>
      avec(async (c, alerte) => {
        const a = await alerte('ALR-08');
        const r = await agir(c, a.id, 'reporter', { jours: 3, version: a.version });
        expect([r.status, (r.json as { body: unknown }).body]).toMatchObject([200, { avant: 'ouverte', apres: 'reportee', version: a.version + 1 }]);
      }));

    it('refus-declares-422-et-403', () =>
      avec(async (c, alerte) => {
        const info = await alerte('ALR-08');
        const bloquant = await alerte('ALR-05');
        const urgent = await alerte('ALR-04');
        const cas: Array<[string, string, unknown, number, string]> = [
          [info.id, 'reporter', { jours: 2, version: info.version }, 422, 'REPORT_INVALIDE'],
          [info.id, 'ignorer', { motif: 'abc', version: info.version }, 422, 'MOTIF_REQUIS'],
          [urgent.id, 'reporter', { jours: 1, version: urgent.version }, 403, 'REPORT_INTERDIT'],
          [bloquant.id, 'ignorer', { motif: 'motif fictif', version: bloquant.version }, 403, 'BLOQUANT_NON_IGNORABLE'],
        ];
        for (const [id, action, corps, statut, code] of cas) {
          const r = await agir(c, id, action, corps);
          expect([action, r.status, (r.json as { code: string }).code]).toEqual([action, statut, code]);
        }
      }));

    it('version-perimee-409', () =>
      avec(async (c, alerte) => {
        const a = await alerte('ALR-08');
        await agir(c, a.id, 'ignorer', { motif: 'motif fictif', version: a.version }, '1');
        const r = await agir(c, a.id, 'reporter', { jours: 1, version: a.version }, '2');
        expect([r.status, r.json]).toMatchObject([409, { code: 'CONFLIT_VERSION', data: { versionActuelle: a.version + 1 } }]);
      }));

    it('idempotency-key-rejouee-une-seule-action', () =>
      avec(async (c, alerte) => {
        const a = await alerte('ALR-08');
        const x = await agir(c, a.id, 'reporter', { jours: 3, version: a.version });
        const y = await agir(c, a.id, 'reporter', { jours: 3, version: a.version });
        expect(y.json).toEqual(x.json);
        expect((await alerte('ALR-08')).version).toBe(a.version + 1);
      }));

    it('annuler-dans-le-delai-puis-sans-action-409', () =>
      avec(async (c, alerte) => {
        const a = await alerte('ALR-08');
        await agir(c, a.id, 'reporter', { jours: 3, version: a.version }, '1');
        const r = await agir(c, a.id, 'annuler', { version: a.version + 1 }, '2');
        expect([r.status, (r.json as { body: unknown }).body]).toMatchObject([200, { avant: 'reportee', apres: 'ouverte' }]);
        const tard = await agir(c, a.id, 'annuler', { version: a.version + 2 }, '3');
        expect([tard.status, (tard.json as { code: string }).code]).toEqual([409, 'DELAI_ANNULATION_DEPASSE']);
      }));

    it('inconnues-404-et-corps-strict-400', () =>
      avec(async (c, alerte) => {
        const a = await alerte('ALR-08');
        expect((await agir(c, 'inconnue', 'reporter', { jours: 1, version: 1 })).json).toMatchObject({ code: 'ALERTE_INCONNUE', status: 404 });
        const autre = await c.appeler('POST', '/exercices/EX1999/alertes/x/reporter', cle('1'), { jours: 1, version: 1 });
        expect([autre.status, (autre.json as { code: string }).code]).toEqual([404, 'EXERCICE_INCONNU']);
        expect((await agir(c, a.id, 'reporter', { jours: 1, version: a.version, extra: 1 })).status).toBe(400);
        expect((await agir(c, a.id, 'ignorer', { motif: 'motif fictif' })).status).toBe(400);
        expect((await c.appeler('POST', `${AL}/${a.id}/reporter`, {}, { jours: 1, version: a.version })).status).toBe(400);
      }));

    it('compteurs-a-jour-apres-report', () =>
      avec(async (c, alerte) => {
        const a = await alerte('ALR-08');
        const u = await alerte('ALR-04');
        const lire = async () => (await c.appeler('GET', '/exercices/EX2026/compteurs')).json as { body: { parEntree: Record<string, unknown>; alertesDuJour: { urgentesTotal: number } } };
        const avant = (await lire()).body.alertesDuJour.urgentesTotal;
        await agir(c, a.id, 'reporter', { jours: 7, version: a.version }, '1');
        expect((await lire()).body.parEntree['activite']).toEqual({ ouvertes: 1, urgentes: 0, pointExclamation: false });
        expect(((await c.appeler('GET', AL + '?etat=reportee')).json as { body: Alerte[] }).body.map((x) => x.regle)).toContain('ALR-08');
        await agir(c, u.id, 'ignorer', { motif: 'motif fictif', version: u.version }, '2');
        expect((await lire()).body.alertesDuJour.urgentesTotal).toBe(avant - 1);
      }));
  });
}
