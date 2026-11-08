import { describe, expect, it } from 'vitest';
import { creerServiceAlertes, DELAI_ANNULATION_MS, ErreurService, type OptionsServiceAlertes } from '../domaines/alertes-service.js';

const cle = (n: number) => `cle-fictive-${n}`;
const trouver = (s: ReturnType<typeof creerServiceAlertes>, regle: string) => s.lister().body.find((a) => a.regle === regle)!;
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurService ? e.code : 'autre';
  }
  return undefined;
};
const neuf = (o: OptionsServiceAlertes = {}) => creerServiceAlertes(o);

describe('contrat alertes : reporter, ignorer, annuler', () => {
  it('reporter-trois-jours', () => {
    const s = neuf();
    const a = trouver(s, 'ALR-08');
    const r = s.reporter(cle(1), a.id, 3, a.version);
    expect(r.body).toMatchObject({ id: a.id, avant: 'ouverte', apres: 'reportee', etat: 'reportee', version: a.version + 1 });
    expect(s.journal()).toMatchObject([{ alerteId: a.id, deEtat: 'ouverte', aEtat: 'reportee', cause: 'report', acteurType: 'humain' }]);
    for (const jours of [1, 7]) {
      const b = neuf();
      const x = trouver(b, 'ALR-08');
      expect(b.reporter(cle(2), x.id, jours, x.version).body.etat).toBe('reportee');
    }
  });

  it('reporter-deux-jours-422', () => {
    const s = neuf();
    const a = trouver(s, 'ALR-08');
    for (const jours of [2, 0, -1, 1.5, Number.NaN, Infinity]) expect(code(() => s.reporter(cle(3), a.id, jours, a.version))).toBe('report_invalide');
    expect(trouver(s, 'ALR-08').version).toBe(a.version);
  });

  it('report-apres-echeance-422', () => {
    const s = neuf({ jour: () => '2026-10-15', echeances: { 'ALR-08': '2026-10-17' } });
    const a = trouver(s, 'ALR-08');
    expect(code(() => s.reporter(cle(4), a.id, 3, a.version))).toBe('report_apres_echeance');
    expect(s.reporter(cle(5), a.id, 1, a.version).body.etat).toBe('reportee');
  });

  it('report-urgent-403', () => {
    const s = neuf();
    for (const regle of ['ALR-04', 'ALR-01']) {
      const a = trouver(s, regle);
      expect(code(() => s.reporter(cle(6), a.id, 1, a.version))).toBe('report_interdit');
    }
    const lecture = neuf({ permissions: ['compta-lire'] });
    expect(code(() => lecture.reporter(cle(7), trouver(lecture, 'ALR-08').id, 1, 1))).toBe('role_lecture');
  });

  it('ignorer-motif-court-422', () => {
    const s = neuf();
    const a = trouver(s, 'ALR-08');
    for (const motif of ['', 'abc', '    a    ']) expect(code(() => s.ignorer(cle(8), a.id, motif, a.version))).toBe('motif_requis');
    const r = s.ignorer(cle(9), a.id, 'motif fictif', a.version);
    expect(r.body).toMatchObject({ avant: 'ouverte', apres: 'ignoree' });
  });

  it('bloquant-non-ignorable-403', () => {
    const s = neuf();
    const a = trouver(s, 'ALR-05');
    expect(code(() => s.ignorer(cle(10), a.id, 'motif fictif', a.version))).toBe('bloquant_non_ignorable');
    expect(trouver(s, 'ALR-05').etat).toBe('ouverte');
  });

  it('version-perimee-409', () => {
    const s = neuf();
    const a = trouver(s, 'ALR-08');
    s.reporter(cle(11), a.id, 1, a.version);
    for (const f of [() => s.reporter(cle(12), a.id, 1, a.version), () => s.ignorer(cle(13), a.id, 'motif fictif', a.version), () => s.annuler(cle(14), a.id, a.version)]) {
      try {
        f();
        expect.unreachable();
      } catch (e) {
        expect(e).toMatchObject({ code: 'version_perimee', versionActuelle: a.version + 1 });
      }
    }
    expect(code(() => s.reporter(cle(15), 'inconnue', 1, 1))).toBe('alerte_inconnue');
    const close = trouver(s, 'ALR-07');
    expect(code(() => s.reporter(cle(16), close.id, 1, close.version))).toBe('alerte_inactive');
  });

  it('idempotency-key-rejouee-une-seule-action', () => {
    const s = neuf();
    const a = trouver(s, 'ALR-08');
    const un = s.reporter(cle(17), a.id, 3, a.version);
    const deux = s.reporter(cle(17), a.id, 3, a.version);
    expect(deux).toEqual(un);
    expect(s.journal()).toHaveLength(1);
    expect(trouver(s, 'ALR-08').version).toBe(a.version + 1);
  });

  it('annuler-dans-le-delai-puis-hors-delai-409', () => {
    let t = 1_000_000;
    const s = neuf({ maintenant: () => t });
    const a = trouver(s, 'ALR-08');
    expect(code(() => s.annuler(cle(18), a.id, a.version))).toBe('delai_annulation_depasse');
    s.ignorer(cle(19), a.id, 'motif fictif', a.version);
    t += DELAI_ANNULATION_MS;
    const r = s.annuler(cle(20), a.id, a.version + 1);
    expect(r.body).toMatchObject({ avant: 'ignoree', apres: 'ouverte', version: a.version + 2 });
    s.reporter(cle(21), a.id, 1, a.version + 2);
    t += DELAI_ANNULATION_MS + 1;
    expect(code(() => s.annuler(cle(22), a.id, a.version + 3))).toBe('delai_annulation_depasse');
    expect(trouver(s, 'ALR-08').etat).toBe('reportee');
  });

  it('compteurs-a-jour-apres-report', () => {
    const s = neuf();
    const a = trouver(s, 'ALR-08');
    s.reporter(cle(23), a.id, 7, a.version);
    const { parEntree, alertesDuJour } = s.compteurs().body;
    expect(parEntree['activite']).toEqual({ ouvertes: 1, urgentes: 0, pointExclamation: false });
    expect(s.lister({ etat: 'reportee' }).body.map((x) => x.regle)).toEqual(['ALR-02', 'ALR-10', 'ALR-08']);
    const u = trouver(s, 'ALR-04');
    s.ignorer(cle(24), u.id, 'motif fictif', u.version);
    const apres = s.compteurs().body;
    expect(apres.parEntree['declarations']).toEqual({ ouvertes: 1, urgentes: 1, pointExclamation: true });
    expect(apres.alertesDuJour.urgentesTotal).toBe(alertesDuJour.urgentesTotal - 1);
  });
});
